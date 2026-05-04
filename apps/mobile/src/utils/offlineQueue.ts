// ---------------------------------------------------------------------------
// Offline mutation queue
//
// User-triggered mutations (post a comment, toggle like, etc) that fail
// because the device is offline are persisted via the supplied adapter and
// replayed the next time the device comes back online. The wire shape is:
//
//   { id, kind, variables, createdAt, attempts }
//
// `kind` keys into a registry of handlers — each handler maps the variables
// back to a real GraphQL mutation. Keep handlers small and idempotent: a
// handler may be re-invoked on retry, so the server-side mutation should
// either be naturally idempotent (toggle) or tolerate duplicate intent
// (server returns the existing comment). Otherwise duplicates can leak in.
//
// At most MAX_ATTEMPTS retries per entry; after that we drop it with a warn
// to avoid infinite retry of permanently broken intents (e.g. a comment
// whose post was deleted server-side).
//
// The factory shape mirrors src/insights/insightStorage.ts so the same
// in-memory adapter pattern can drive node:test coverage without pulling in
// AsyncStorage (which is unusable outside React Native).
// ---------------------------------------------------------------------------

export type OfflineQueueAdapter = {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type OfflineQueueEntry = {
  id: string;
  kind: string;
  variables: unknown;
  createdAt: string;
  attempts: number;
};

export type OfflineQueueHandler = (variables: unknown) => Promise<void>;

export type DrainResult = {
  succeeded: number;
  failed: number;
  dropped: number;
  remaining: number;
};

export type OfflineQueueOptions = {
  /** Override storage key. Defaults to `c404.mobile.offlineQueue.v1`. */
  storageKey?: string;
  /** Override the wall-clock used for `createdAt` and entry ids (testability). */
  now?: () => string;
  /** Override the max-attempts cap. Defaults to 5. */
  maxAttempts?: number;
  /** Override the random-id source (testability). */
  randomId?: () => string;
};

export type OnlineSource = {
  isOnline: () => boolean;
  subscribeOnline: (cb: (online: boolean) => void) => () => void;
};

const DEFAULT_STORAGE_KEY = "c404.mobile.offlineQueue.v1";
const DEFAULT_MAX_ATTEMPTS = 5;

export function createOfflineQueue(
  adapter: OfflineQueueAdapter,
  options: OfflineQueueOptions = {},
) {
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const now = options.now ?? (() => new Date().toISOString());
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const randomId = options.randomId
    ?? (() => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const handlers = new Map<string, OfflineQueueHandler>();
  const drainListeners = new Set<(result: DrainResult) => void>();
  let drainInFlight: Promise<DrainResult> | null = null;

  async function readQueue(): Promise<OfflineQueueEntry[]> {
    try {
      const raw = await adapter.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Failed to read offline queue:", error);
      return [];
    }
  }

  async function writeQueue(queue: OfflineQueueEntry[]) {
    try {
      if (queue.length === 0) {
        await adapter.removeItem(storageKey);
        return;
      }
      await adapter.setItem(storageKey, JSON.stringify(queue));
    } catch (error) {
      console.warn("Failed to write offline queue:", error);
    }
  }

  return {
    registerHandler(kind: string, handler: OfflineQueueHandler) {
      handlers.set(kind, handler);
    },

    subscribeDrain(cb: (result: DrainResult) => void): () => void {
      drainListeners.add(cb);
      return () => {
        drainListeners.delete(cb);
      };
    },

    async getDepth(): Promise<number> {
      const queue = await readQueue();
      return queue.length;
    },

    async enqueue(kind: string, variables: unknown): Promise<void> {
      const queue = await readQueue();
      queue.push({
        id: randomId(),
        kind,
        variables,
        createdAt: now(),
        attempts: 0,
      });
      await writeQueue(queue);
    },

    async drain(): Promise<DrainResult> {
      if (drainInFlight) return drainInFlight;

      drainInFlight = (async () => {
        const result: DrainResult = { succeeded: 0, failed: 0, dropped: 0, remaining: 0 };
        const queue = await readQueue();
        if (queue.length === 0) return result;

        const next: OfflineQueueEntry[] = [];
        for (const entry of queue) {
          const handler = handlers.get(entry.kind);
          if (!handler) {
            // Unknown kind — keep so a later code path that registers the
            // handler can still replay.
            next.push(entry);
            continue;
          }
          try {
            await handler(entry.variables);
            result.succeeded += 1;
          } catch (error) {
            const attempts = entry.attempts + 1;
            if (attempts >= maxAttempts) {
              result.dropped += 1;
              console.warn(
                `Offline mutation "${entry.kind}" dropped after ${maxAttempts} attempts:`,
                error,
              );
            } else {
              next.push({ ...entry, attempts });
              result.failed += 1;
            }
          }
        }
        await writeQueue(next);
        result.remaining = next.length;
        drainListeners.forEach((cb) => {
          try { cb(result); } catch { /* best-effort */ }
        });
        return result;
      })();

      try {
        return await drainInFlight;
      } finally {
        drainInFlight = null;
      }
    },

    /** Bind to a network-online source so the queue auto-drains on reconnect. */
    bindAutoDrain(source: OnlineSource) {
      const queue = this;
      const unsubscribe = source.subscribeOnline((online) => {
        if (online) {
          queue.drain().catch((error) => {
            console.warn("Offline queue drain failed:", error);
          });
        }
      });
      // Also drain on bind if we happen to be online with a pending queue.
      if (source.isOnline()) {
        queue.drain().catch(() => {});
      }
      return unsubscribe;
    },
  };
}

export type OfflineQueue = ReturnType<typeof createOfflineQueue>;
