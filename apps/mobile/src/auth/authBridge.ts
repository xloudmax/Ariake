// Bridges the non-React Apollo layer and the React AuthProvider.
// The Apollo errorLink cannot use React context, so it calls
// `notifyAuthInvalidated()` and the Provider registers a handler via
// `registerAuthInvalidated()` during mount.

type Handler = () => void | Promise<void>;

let activeHandler: Handler | null = null;

export function registerAuthInvalidated(handler: Handler): () => void {
  activeHandler = handler;
  return () => {
    if (activeHandler === handler) activeHandler = null;
  };
}

export function notifyAuthInvalidated(): void {
  if (!activeHandler) return;
  try {
    const result = activeHandler();
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch((err) => {
        console.warn('Auth invalidation handler rejected', err);
      });
    }
  } catch (err) {
    console.warn('Auth invalidation handler threw', err);
  }
}
