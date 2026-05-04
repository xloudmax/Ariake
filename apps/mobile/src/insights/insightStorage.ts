export type InsightStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type SavedInsight = {
  coverImageUrl?: string | null;
  excerpt?: string | null;
  id: string;
  note?: string;
  readingProgress: number;
  savedAt: string;
  slug: string;
  summary?: string;
  tags: string[];
  title: string;
  updatedAt: string;
};

export type ReadingHistoryItem = {
  coverImageUrl?: string | null;
  excerpt?: string | null;
  firstReadAt: string;
  id: string;
  lastReadAt: string;
  readingProgress: number;
  slug: string;
  tags: string[];
  title: string;
};

export type SavedInsightInput = {
  coverImageUrl?: string | null;
  excerpt?: string | null;
  id: string;
  note?: string;
  readingProgress?: number;
  slug: string;
  summary?: string;
  tags?: string[] | null;
  title: string;
};

type InsightStorageOptions = {
  now?: () => string;
  storageKey?: string;
};

const DEFAULT_SAVED_INSIGHTS_KEY = "c404.mobile.savedInsights.v1";
const DEFAULT_READING_HISTORY_KEY = "c404.mobile.readingHistory.v1";
const clampProgress = (value: number): number => Math.min(Math.max(value, 0), 1);

function normalizeInsight(input: SavedInsightInput, existing: SavedInsight | undefined, now: string): SavedInsight {
  return {
    coverImageUrl: input.coverImageUrl ?? existing?.coverImageUrl ?? null,
    excerpt: input.excerpt ?? existing?.excerpt ?? null,
    id: input.id,
    note: input.note ?? existing?.note,
    readingProgress: clampProgress(input.readingProgress ?? existing?.readingProgress ?? 0),
    savedAt: existing?.savedAt ?? now,
    slug: input.slug,
    summary: input.summary ?? existing?.summary,
    tags: input.tags ?? existing?.tags ?? [],
    title: input.title,
    updatedAt: now,
  };
}

function normalizeReadingHistory(
  input: SavedInsightInput,
  existing: ReadingHistoryItem | undefined,
  now: string,
): ReadingHistoryItem {
  return {
    coverImageUrl: input.coverImageUrl ?? existing?.coverImageUrl ?? null,
    excerpt: input.excerpt ?? existing?.excerpt ?? null,
    firstReadAt: existing?.firstReadAt ?? now,
    id: input.id,
    lastReadAt: now,
    readingProgress: clampProgress(input.readingProgress ?? existing?.readingProgress ?? 0),
    slug: input.slug,
    tags: input.tags ?? existing?.tags ?? [],
    title: input.title,
  };
}

export function createInsightStorage(
  adapter: InsightStorageAdapter,
  options: InsightStorageOptions = {},
) {
  const savedInsightsKey = options.storageKey ?? DEFAULT_SAVED_INSIGHTS_KEY;
  const readingHistoryKey = options.storageKey
    ? `${options.storageKey}.readingHistory`
    : DEFAULT_READING_HISTORY_KEY;
  const getNow = options.now ?? (() => new Date().toISOString());

  const readSavedInsights = async (): Promise<SavedInsight[]> => {
    const raw = await adapter.getItem(savedInsightsKey);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as SavedInsight[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeSavedInsights = async (insights: SavedInsight[]): Promise<void> => {
    if (insights.length === 0) {
      await adapter.removeItem(savedInsightsKey);
      return;
    }

    await adapter.setItem(savedInsightsKey, JSON.stringify(insights));
  };

  const readReadingHistory = async (): Promise<ReadingHistoryItem[]> => {
    const raw = await adapter.getItem(readingHistoryKey);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as ReadingHistoryItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeReadingHistory = async (items: ReadingHistoryItem[]): Promise<void> => {
    if (items.length === 0) {
      await adapter.removeItem(readingHistoryKey);
      return;
    }

    await adapter.setItem(readingHistoryKey, JSON.stringify(items));
  };

  return {
    async getInsight(slug: string): Promise<SavedInsight | null> {
      const insights = await readSavedInsights();
      return insights.find((insight) => insight.slug === slug) ?? null;
    },

    async listInsights(): Promise<SavedInsight[]> {
      const insights = await readSavedInsights();
      return insights.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async removeInsight(slug: string): Promise<void> {
      const insights = await readSavedInsights();
      await writeSavedInsights(insights.filter((insight) => insight.slug !== slug));
    },

    async saveInsight(input: SavedInsightInput): Promise<SavedInsight> {
      const insights = await readSavedInsights();
      const now = getNow();
      const existing = insights.find((insight) => insight.slug === input.slug);
      const saved = normalizeInsight(input, existing, now);
      const nextInsights = [saved, ...insights.filter((insight) => insight.slug !== input.slug)];

      await writeSavedInsights(nextInsights);
      await this.upsertReadingHistory({
        ...input,
        readingProgress: saved.readingProgress,
      });
      return saved;
    },

    async updateReadingProgress(slug: string, readingProgress: number): Promise<SavedInsight | null> {
      const insights = await readSavedInsights();
      const target = insights.find((insight) => insight.slug === slug);
      if (!target) return null;

      const updated = {
        ...target,
        readingProgress: clampProgress(readingProgress),
        updatedAt: getNow(),
      };

      await writeSavedInsights(insights.map((insight) => insight.slug === slug ? updated : insight));
      await this.upsertReadingHistory({
        coverImageUrl: updated.coverImageUrl,
        excerpt: updated.excerpt,
        id: updated.id,
        readingProgress: updated.readingProgress,
        slug: updated.slug,
        tags: updated.tags,
        title: updated.title,
      });
      return updated;
    },

    async getReadingHistory(slug: string): Promise<ReadingHistoryItem | null> {
      const history = await readReadingHistory();
      return history.find((item) => item.slug === slug) ?? null;
    },

    async listContinueReading(limit = 5): Promise<ReadingHistoryItem[]> {
      const history = await readReadingHistory();
      return history
        .filter((item) => item.readingProgress > 0.02 && item.readingProgress < 0.98)
        .sort((a, b) => b.lastReadAt.localeCompare(a.lastReadAt))
        .slice(0, limit);
    },

    async listReadingHistory(): Promise<ReadingHistoryItem[]> {
      const history = await readReadingHistory();
      return history.sort((a, b) => b.lastReadAt.localeCompare(a.lastReadAt));
    },

    async upsertReadingHistory(input: SavedInsightInput): Promise<ReadingHistoryItem> {
      const history = await readReadingHistory();
      const now = getNow();
      const existing = history.find((item) => item.slug === input.slug);
      const updated = normalizeReadingHistory(input, existing, now);
      await writeReadingHistory([updated, ...history.filter((item) => item.slug !== input.slug)]);
      return updated;
    },
  };
}
