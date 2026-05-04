import { useCallback, useEffect, useState } from "react";

import { insightStorage } from "./mobileInsightStorage";
import type { SavedInsightInput } from "./insightStorage";
import { client } from "../apollo/client";
import { reportError } from "../utils/mobileErrorReporter";
import { PostDocument } from "../generated/graphql";

type ToggleInsightOptions = {
  mode?: "toggle" | "update-progress";
  readingProgress?: number;
};

// Defensive prefetch: when a user saves an article, make sure the full
// BlogPostDetail is locked into Apollo's persisted cache. cache-first means
// no-op when already cached (the common case — they're saving from the post
// page) and falls back to a network fetch otherwise. Errors are swallowed
// because the local save still succeeded.
function prefetchPostDetail(slug: string) {
  client.query({
    query: PostDocument,
    variables: { slug },
    fetchPolicy: "cache-first",
  }).catch((error) => {
    reportError(error, { tag: "insight.prefetch", severity: "warn", extra: { slug } });
  });
}

export function useInsightStatus(input: SavedInsightInput | null) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!input?.slug) {
      setIsSaved(false);
      return;
    }

    insightStorage.getInsight(input.slug).then((insight) => {
      if (mounted) {
        setIsSaved(Boolean(insight));
      }
    }).catch((error) => {
      reportError(error, { tag: "insight.loadState", severity: "warn", extra: { slug: input?.slug } });
    });

    return () => {
      mounted = false;
    };
  }, [input?.slug]);

  const toggleInsight = useCallback(async ({
    mode = "toggle",
    readingProgress,
  }: ToggleInsightOptions = {}) => {
    if (!input) return;

    setLoading(true);
    try {
      if (mode === "update-progress") {
        await insightStorage.updateReadingProgress(input.slug, readingProgress ?? input.readingProgress ?? 0);
        return;
      }

      if (isSaved) {
        await insightStorage.removeInsight(input.slug);
        setIsSaved(false);
        return;
      }

      await insightStorage.saveInsight({
        ...input,
        readingProgress: readingProgress ?? input.readingProgress,
      });
      prefetchPostDetail(input.slug);
      setIsSaved(true);
    } finally {
      setLoading(false);
    }
  }, [input, isSaved]);

  return { isSaved, loading, toggleInsight };
}
