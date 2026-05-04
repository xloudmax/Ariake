import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  createInsightStorage,
  type InsightStorageAdapter,
  type SavedInsightInput,
} from "./insightStorage.ts";

function createMemoryAdapter(): InsightStorageAdapter {
  const values = new Map<string, string>();

  return {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async removeItem(key) {
      values.delete(key);
    },
    async setItem(key, value) {
      values.set(key, value);
    },
  };
}

const baseInsight: SavedInsightInput = {
  excerpt: "A short summary about React Native performance.",
  coverImageUrl: "https://example.com/cover.jpg",
  id: "post-1",
  slug: "rn-performance",
  tags: ["React Native", "Performance"],
  title: "React Native Performance",
};

describe("insightStorage", () => {
  let storage = createInsightStorage(createMemoryAdapter());

  beforeEach(() => {
    storage = createInsightStorage(createMemoryAdapter(), {
      now: () => "2026-04-30T08:00:00.000Z",
    });
  });

  it("saves an insight and lists the newest item first", async () => {
    const saved = await storage.saveInsight(baseInsight);

    assert.equal(saved.slug, "rn-performance");
    assert.equal(saved.savedAt, "2026-04-30T08:00:00.000Z");
    assert.equal(saved.readingProgress, 0);

    const insights = await storage.listInsights();
    assert.equal(insights.length, 1);
    assert.equal(insights[0].slug, "rn-performance");
  });

  it("deduplicates by slug and updates existing insight content", async () => {
    await storage.saveInsight(baseInsight);
    await storage.saveInsight({
      ...baseInsight,
      excerpt: "Updated excerpt",
      tags: ["Updated"],
      title: "Updated title",
    });

    const insights = await storage.listInsights();
    assert.equal(insights.length, 1);
    assert.equal(insights[0].title, "Updated title");
    assert.deepEqual(insights[0].tags, ["Updated"]);
  });

  it("updates reading progress and clamps values", async () => {
    await storage.saveInsight(baseInsight);

    const updated = await storage.updateReadingProgress("rn-performance", 1.8);
    assert.equal(updated?.readingProgress, 1);

    const insights = await storage.listInsights();
    assert.equal(insights[0].readingProgress, 1);
  });

  it("removes an insight by slug", async () => {
    await storage.saveInsight(baseInsight);
    await storage.removeInsight("rn-performance");

    assert.deepEqual(await storage.listInsights(), []);
  });

  it("returns null when reading progress is updated for a missing insight", async () => {
    assert.equal(await storage.updateReadingProgress("missing", 0.4), null);
  });

  it("tracks reading history without requiring an insight to be saved", async () => {
    await storage.upsertReadingHistory({
      ...baseInsight,
      readingProgress: 0.42,
    });

    const history = await storage.listReadingHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].slug, "rn-performance");
    assert.equal(history[0].readingProgress, 0.42);
    assert.equal(history[0].lastReadAt, "2026-04-30T08:00:00.000Z");
  });

  it("lists unfinished continue-reading items in newest order", async () => {
    let tick = 0;
    storage = createInsightStorage(createMemoryAdapter(), {
      now: () => `2026-04-30T08:00:0${tick++}.000Z`,
    });

    await storage.upsertReadingHistory({ ...baseInsight, slug: "done", id: "post-done", readingProgress: 1 });
    await storage.upsertReadingHistory({ ...baseInsight, slug: "old", id: "post-old", readingProgress: 0.2 });
    await storage.upsertReadingHistory({ ...baseInsight, slug: "new", id: "post-new", readingProgress: 0.6 });

    const continueReading = await storage.listContinueReading(5);
    assert.deepEqual(continueReading.map((item) => item.slug), ["new", "old"]);
  });

  it("preserves reading history when removing a saved insight", async () => {
    await storage.saveInsight({ ...baseInsight, readingProgress: 0.3 });
    await storage.removeInsight("rn-performance");

    assert.deepEqual(await storage.listInsights(), []);
    const history = await storage.getReadingHistory("rn-performance");
    assert.equal(history?.readingProgress, 0.3);
  });
});
