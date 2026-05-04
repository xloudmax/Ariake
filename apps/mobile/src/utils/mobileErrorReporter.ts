import { createErrorReporter, type ErrorReporter, type ErrorSink } from "./errorReporter";

// Singleton reporter for the running app. Sinks installed below run for the
// lifetime of the process.
//
// Default sinks (in order of installation):
//   1. consoleSink — keeps the noisy dev experience identical to before
//      this file existed: severity → console method routing.
//   2. (future) sentrySink — install in mobileErrorReporter once Sentry is
//      configured; a one-file swap.
export const errorReporter: ErrorReporter = createErrorReporter();

export const consoleSink: ErrorSink = ({ error, context }) => {
  const tag = context.tag ? `[${context.tag}]` : "";
  const severity = context.severity ?? "error";
  const args: unknown[] = tag
    ? [tag, error.message, ...(context.extra ? [context.extra] : []), error]
    : [error.message, ...(context.extra ? [context.extra] : []), error];

  if (severity === "warn" || severity === "info") {
    console.warn(...args);
  } else {
    console.error(...args);
  }
};

errorReporter.addSink(consoleSink);

// Convenience wrappers — these are the names call sites should reach for.
export const reportError = errorReporter.report;
export const breadcrumb = errorReporter.breadcrumb;
