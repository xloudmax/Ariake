import type { NetInfoState } from "@react-native-community/netinfo";

// Single source of truth for online state.
// Updated by a NetInfo subscription on app start; read synchronously by:
//   - Apollo errorLink — to suppress noisy "Network Error" alerts when we're
//     offline AND the cache had something to show.
//   - The OfflineBanner / hooks — for UI.
//
// IMPORTANT: only the `type` import above is allowed at module scope. The
// runtime side of `@react-native-community/netinfo` accesses NativeModules at
// import time and throws synchronously when its native side isn't compiled
// into the dev client. We therefore defer the actual require() to runtime
// inside startNetworkMonitor(), wrapped in try/catch — so an old dev client
// degrades gracefully (assumed-online) instead of crashing the JS bundle.
let online = true;
let initialized = false;

const listeners = new Set<(online: boolean) => void>();

function update(state: NetInfoState) {
  // Treat unknown / null as online to avoid false positives during launch.
  const next = state.isConnected !== false && state.isInternetReachable !== false;
  if (next === online) return;
  online = next;
  listeners.forEach((cb) => cb(next));
}

export function startNetworkMonitor() {
  if (initialized) return;
  initialized = true;

  try {
    // Deferred runtime require — see comment at top.
    const NetInfo = require("@react-native-community/netinfo").default as
      typeof import("@react-native-community/netinfo").default;
    NetInfo.fetch().then(update).catch(() => {});
    NetInfo.addEventListener(update);
  } catch (error) {
    console.warn(
      "NetInfo native module unavailable — assuming online. Rebuild the dev client to enable offline detection.",
      error,
    );
  }
}

export function isOnline(): boolean {
  return online;
}

export function subscribeOnline(cb: (online: boolean) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
