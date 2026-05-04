// ---------------------------------------------------------------------------
// Centralized error reporting
//
// Single funnel for everything that goes wrong in the app — replaces ad-hoc
// `console.warn(err)` calls scattered across the codebase. A reporter is
// purely a side-effect sink: take a captured error, decide what to do with
// it (log, toast, send remote). The factory shape (mirrors offlineQueue and
// insightStorage) lets tests inject a deterministic sink.
//
// In dev/test: routes to console.error, breadcrumbs kept in memory for
// inspection. In production: same, plus the configured remote sink (Sentry,
// Datadog, etc) once wired. Adding Sentry later is a 1-file change in
// mobileErrorReporter.ts — just register a sink that calls Sentry.captureException.
// ---------------------------------------------------------------------------

export type ErrorSeverity = "info" | "warn" | "error" | "fatal";

export type ErrorContext = {
  /** Stable identifier for the failure site (e.g. "post.comment.submit"). */
  tag?: string;
  /** Free-form attributes — user id, slug, mutation name, etc. */
  extra?: Record<string, unknown>;
  /** Severity level. Defaults to "error". */
  severity?: ErrorSeverity;
};

export type Breadcrumb = {
  at: string;
  level: ErrorSeverity;
  message: string;
  tag?: string;
  extra?: Record<string, unknown>;
};

export type ErrorSink = (event: {
  error: Error;
  context: ErrorContext;
  breadcrumbs: Breadcrumb[];
}) => void;

export type ErrorReporterOptions = {
  /** Maximum breadcrumbs retained for context. Defaults to 30. */
  breadcrumbLimit?: number;
  /** Override wall-clock used for breadcrumb timestamps (testability). */
  now?: () => string;
};

const DEFAULT_BREADCRUMB_LIMIT = 30;

export function createErrorReporter(options: ErrorReporterOptions = {}) {
  const breadcrumbLimit = options.breadcrumbLimit ?? DEFAULT_BREADCRUMB_LIMIT;
  const now = options.now ?? (() => new Date().toISOString());

  const sinks: ErrorSink[] = [];
  const breadcrumbs: Breadcrumb[] = [];

  function pushBreadcrumb(crumb: Omit<Breadcrumb, "at">) {
    breadcrumbs.push({ at: now(), ...crumb });
    if (breadcrumbs.length > breadcrumbLimit) {
      breadcrumbs.splice(0, breadcrumbs.length - breadcrumbLimit);
    }
  }

  return {
    /** Subscribe a sink — Sentry, Datadog, dev-toast, log file, etc. */
    addSink(sink: ErrorSink) {
      sinks.push(sink);
      return () => {
        const idx = sinks.indexOf(sink);
        if (idx >= 0) sinks.splice(idx, 1);
      };
    },

    /** Drop a contextual note onto the breadcrumb trail. Cheap, call freely. */
    breadcrumb(message: string, opts: Omit<ErrorContext, "extra"> & { extra?: Record<string, unknown> } = {}) {
      pushBreadcrumb({
        level: opts.severity ?? "info",
        message,
        tag: opts.tag,
        extra: opts.extra,
      });
    },

    /** Read the current breadcrumb trail (mostly for tests / inspection). */
    getBreadcrumbs(): readonly Breadcrumb[] {
      return breadcrumbs.slice();
    },

    /** Capture an error and fan out to all registered sinks. */
    report(error: unknown, context: ErrorContext = {}) {
      const err = error instanceof Error
        ? error
        : new Error(typeof error === "string" ? error : JSON.stringify(error));
      const severity = context.severity ?? "error";

      pushBreadcrumb({
        level: severity,
        message: err.message,
        tag: context.tag,
        extra: context.extra,
      });

      const snapshot = breadcrumbs.slice();
      sinks.forEach((sink) => {
        try { sink({ error: err, context: { ...context, severity }, breadcrumbs: snapshot }); }
        catch { /* a sink crashing must not take down the app */ }
      });
    },

    /** Reset all state (breadcrumbs + sinks). Useful for tests. */
    reset() {
      breadcrumbs.length = 0;
      sinks.length = 0;
    },
  };
}

export type ErrorReporter = ReturnType<typeof createErrorReporter>;
