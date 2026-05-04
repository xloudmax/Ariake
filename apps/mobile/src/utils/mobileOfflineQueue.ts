import AsyncStorage from "@react-native-async-storage/async-storage";

import { createOfflineQueue } from "./offlineQueue";
import { isOnline, subscribeOnline } from "./network";

export const offlineQueue = createOfflineQueue(AsyncStorage);

// Re-exported convenience wrappers so call sites don't have to import the
// bound instance every time. Keep these signatures tight — adding new ones
// here is the only sanctioned way to grow the surface area without breaking
// the factory pattern.
export const enqueueOfflineMutation = (kind: string, variables: unknown) =>
  offlineQueue.enqueue(kind, variables);

export const registerOfflineQueueHandler = offlineQueue.registerHandler;

export const subscribeOfflineQueueDrain = offlineQueue.subscribeDrain;

export const drainOfflineQueue = () => offlineQueue.drain();

export const getOfflineQueueDepth = () => offlineQueue.getDepth();

let autoDrainBound = false;
export function startOfflineQueueAutoDrain() {
  if (autoDrainBound) return;
  autoDrainBound = true;
  offlineQueue.bindAutoDrain({ isOnline, subscribeOnline });
}
