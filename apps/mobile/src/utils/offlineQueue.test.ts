import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import { createOfflineQueue, type OfflineQueueAdapter } from "./offlineQueue.ts";

function createMemoryAdapter(): OfflineQueueAdapter & { dump: () => Map<string, string> } {
  const memory = new Map<string, string>();
  return {
    getItem: async (key) => memory.get(key) ?? null,
    setItem: async (key, value) => { memory.set(key, value); },
    removeItem: async (key) => { memory.delete(key); },
    dump: () => memory,
  };
}

let nowCounter = 0;
const fixedNow = () => `2026-01-01T00:00:${String(nowCounter++).padStart(2, "0")}.000Z`;

let randCounter = 0;
const fixedRandom = () => `id-${randCounter++}`;

beforeEach(() => {
  nowCounter = 0;
  randCounter = 0;
});

describe("createOfflineQueue — basics", () => {
  it("starts with depth 0 when adapter is empty", async () => {
    const adapter = createMemoryAdapter();
    const queue = createOfflineQueue(adapter, { now: fixedNow, randomId: fixedRandom });
    assert.equal(await queue.getDepth(), 0);
  });

  it("enqueues and persists entries via the adapter", async () => {
    const adapter = createMemoryAdapter();
    const queue = createOfflineQueue(adapter, { now: fixedNow, randomId: fixedRandom });
    await queue.enqueue("comment.create", { msg: "hi" });
    assert.equal(await queue.getDepth(), 1);
    const stored = JSON.parse(adapter.dump().get("c404.mobile.offlineQueue.v1") ?? "[]");
    assert.equal(stored.length, 1);
    assert.equal(stored[0].kind, "comment.create");
    assert.deepEqual(stored[0].variables, { msg: "hi" });
    assert.equal(stored[0].attempts, 0);
  });

  it("respects a custom storageKey", async () => {
    const adapter = createMemoryAdapter();
    const queue = createOfflineQueue(adapter, { storageKey: "custom.queue", now: fixedNow });
    await queue.enqueue("k", {});
    assert.ok(adapter.dump().has("custom.queue"));
    assert.equal(adapter.dump().has("c404.mobile.offlineQueue.v1"), false);
  });

  it("removes the storage key entirely when the queue empties", async () => {
    const adapter = createMemoryAdapter();
    const queue = createOfflineQueue(adapter, { now: fixedNow });
    queue.registerHandler("k", async () => {});
    await queue.enqueue("k", {});
    await queue.drain();
    assert.equal(adapter.dump().has("c404.mobile.offlineQueue.v1"), false);
  });
});

describe("createOfflineQueue — drain", () => {
  it("calls the registered handler with the original variables", async () => {
    const adapter = createMemoryAdapter();
    const queue = createOfflineQueue(adapter);
    let received: unknown;
    queue.registerHandler("ping", async (vars) => { received = vars; });
    await queue.enqueue("ping", { hello: "world" });
    const result = await queue.drain();
    assert.deepEqual(received, { hello: "world" });
    assert.deepEqual(result, { succeeded: 1, failed: 0, dropped: 0, remaining: 0 });
  });

  it("retries failed entries up to maxAttempts then drops with dropped++", async () => {
    const adapter = createMemoryAdapter();
    const queue = createOfflineQueue(adapter, { maxAttempts: 3 });
    let attempts = 0;
    queue.registerHandler("flaky", async () => {
      attempts += 1;
      throw new Error("nope");
    });
    await queue.enqueue("flaky", {});

    // First two drains: failed but kept.
    const r1 = await queue.drain();
    assert.deepEqual(r1, { succeeded: 0, failed: 1, dropped: 0, remaining: 1 });
    const r2 = await queue.drain();
    assert.deepEqual(r2, { succeeded: 0, failed: 1, dropped: 0, remaining: 1 });
    // Third attempt hits the cap → dropped, queue empty.
    const r3 = await queue.drain();
    assert.deepEqual(r3, { succeeded: 0, failed: 0, dropped: 1, remaining: 0 });
    assert.equal(attempts, 3);
    assert.equal(await queue.getDepth(), 0);
  });

  it("keeps unknown-kind entries for replay after the handler is registered later", async () => {
    const adapter = createMemoryAdapter();
    const queue = createOfflineQueue(adapter);
    await queue.enqueue("delayed.handler", { v: 1 });
    const before = await queue.drain();
    assert.equal(before.succeeded, 0);
    assert.equal(before.remaining, 1);

    let called = 0;
    queue.registerHandler("delayed.handler", async () => { called += 1; });
    const after = await queue.drain();
    assert.equal(called, 1);
    assert.equal(after.succeeded, 1);
    assert.equal(await queue.getDepth(), 0);
  });

  it("processes entries in FIFO order within a single drain", async () => {
    const adapter = createMemoryAdapter();
    const queue = createOfflineQueue(adapter);
    const seen: number[] = [];
    queue.registerHandler("seq", async (vars) => {
      seen.push((vars as { i: number }).i);
    });
    await queue.enqueue("seq", { i: 1 });
    await queue.enqueue("seq", { i: 2 });
    await queue.enqueue("seq", { i: 3 });
    await queue.drain();
    assert.deepEqual(seen, [1, 2, 3]);
  });

  it("notifies subscribers with a single result per drain", async () => {
    const adapter = createMemoryAdapter();
    const queue = createOfflineQueue(adapter);
    const events: number[] = [];
    queue.subscribeDrain((r) => events.push(r.succeeded));

    queue.registerHandler("ok", async () => {});
    await queue.enqueue("ok", {});
    await queue.enqueue("ok", {});
    await queue.drain();
    assert.deepEqual(events, [2]);
  });

  it("dedupes concurrent drain() calls into one in-flight pass", async () => {
    const adapter = createMemoryAdapter();
    const queue = createOfflineQueue(adapter);
    let invocations = 0;
    let resolveHandler: (() => void) | null = null;
    let signalInvoked: (() => void) | null = null;
    const handlerInvoked = new Promise<void>((resolve) => {
      signalInvoked = resolve;
    });
    queue.registerHandler("slow", () => new Promise<void>((resolve) => {
      invocations += 1;
      resolveHandler = resolve;
      signalInvoked?.();
    }));
    await queue.enqueue("slow", {});

    const a = queue.drain();
    const b = queue.drain();
    // Both drain calls share the same in-flight pass — handler runs exactly once.
    await handlerInvoked;
    resolveHandler!();
    const [resultA, resultB] = await Promise.all([a, b]);
    assert.equal(invocations, 1);
    assert.equal(resultA.succeeded, 1);
    assert.equal(resultB.succeeded, 1);
  });
});
