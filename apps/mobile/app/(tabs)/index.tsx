import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, ActivityIndicator, InteractionManager, RefreshControl, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Octicons } from "@expo/vector-icons";
import { usePostsQuery, BlogPostSummaryFragment } from "../../src/generated/graphql";
import ArticleCard from "../../src/components/ArticleCard";
import GradientContentCard from "../../src/components/GradientContentCard";
import { contentPaddingForTabBar } from "../../src/components/layoutConstants";
import { EmptyState, RetryButton, ScreenHeader } from "../../src/components/ScreenPrimitives";
import { useI18n } from "../../src/i18n/I18nProvider";
import { insightStorage } from "../../src/insights/mobileInsightStorage";
import type { ReadingHistoryItem } from "../../src/insights/insightStorage";
import { isOnline } from "../../src/utils/network";
import { SkeletonFeed } from "../../src/components/Skeleton";

function ContinueReadingFooter({ progress, resumeLabel, progressLabel }: { progress: number; resumeLabel: string; progressLabel: string }) {
  return (
    <>
      <View className="h-1.5 overflow-hidden rounded-full bg-white/20">
        <View className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
      </View>
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-xs font-black text-white/88" numberOfLines={1}>{progressLabel}</Text>
        <View className="ml-2 flex-row items-center">
          <Text className="mr-1 text-xs font-bold text-white/74" numberOfLines={1}>{resumeLabel}</Text>
          <Octicons name="arrow-right" size={12} color="rgba(255,255,255,0.86)" />
        </View>
      </View>
    </>
  );
}

function ContinueReadingCard({ item, onPress, resumeLabel, progressLabel, resumeHint }: { item: ReadingHistoryItem; onPress: () => void; resumeLabel: string; progressLabel: string; resumeHint: string }) {
  const progress = Math.round(item.readingProgress * 100);

  return (
    <GradientContentCard
      variant="compact"
      title={item.title}
      excerpt={item.excerpt}
      coverImageUrl={item.coverImageUrl}
      tags={item.tags}
      gradientSeed={item.slug || item.title}
      badgeLabel={resumeLabel}
      footer={<ContinueReadingFooter progress={progress} resumeLabel={resumeLabel} progressLabel={progressLabel} />}
      onPress={onPress}
      accessibilityHint={resumeHint}
    />
  );
}

const keyExtractor = (item: BlogPostSummaryFragment) => item.id;
const PAGE_SIZE = 20;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [hasMore, setHasMore] = useState(true);
  const [continueReading, setContinueReading] = useState<ReadingHistoryItem[]>([]);
  const fetchingMoreRef = useRef(false);

  // Default to published articles
  const { data, loading, error, refetch, fetchMore } = usePostsQuery({
    variables: {
      limit: PAGE_SIZE,
      offset: 0,
    },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const posts = data?.posts || [];

  const loadContinueReading = useCallback(async () => {
    const items = await insightStorage.listContinueReading(5);
    setContinueReading(items);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const handle = InteractionManager.runAfterInteractions(() => {
        loadContinueReading().catch((loadError) => {
          console.warn("Failed to load continue reading:", loadError);
        });
      });
      return () => handle.cancel();
    }, [loadContinueReading]),
  );

  const openPost = useCallback((slug: string) => {
    router.push({ pathname: "/post/[slug]", params: { slug } });
  }, [router]);
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setHasMore(true);
    fetchingMoreRef.current = false;
    await refetch({ offset: 0, limit: PAGE_SIZE });
    await loadContinueReading();
  }, [refetch, loadContinueReading]);

  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore || fetchingMoreRef.current || posts.length === 0) return;
    if (!isOnline()) return;

    fetchingMoreRef.current = true;
    fetchMore({
      variables: {
        offset: posts.length,
        limit: PAGE_SIZE,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        if (fetchMoreResult.posts.length < PAGE_SIZE) {
          setHasMore(false);
        }
        if (fetchMoreResult.posts.length === 0) return prev;
        return {
          ...prev,
          posts: [...prev.posts, ...fetchMoreResult.posts],
        };
      },
    }).finally(() => {
      fetchingMoreRef.current = false;
    });
  }, [loading, hasMore, posts.length, fetchMore]);

  const renderItem = useCallback<ListRenderItem<BlogPostSummaryFragment>>(({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).duration(260)}>
      <ArticleCard post={item} onPress={() => openPost(item.slug)} />
    </Animated.View>
  ), [openPost]);

  const renderContinueReadingItem = useCallback<ListRenderItem<ReadingHistoryItem>>(({ item }) => {
    const progress = Math.round(item.readingProgress * 100);
    return (
      <ContinueReadingCard
        item={item}
        onPress={() => openPost(item.slug)}
        resumeLabel={t("common.resume")}
        progressLabel={t("home.percentRead", { progress })}
        resumeHint={t("home.resumeHint", { progress })}
      />
    );
  }, [openPost, t]);

  const continueReadingKeyExtractor = useCallback((item: ReadingHistoryItem) => item.slug, []);

  const ListHeaderComponent = useMemo(() => continueReading.length > 0 ? (
    <View className="mb-7">
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Octicons name="bookmark" size={21} color="#2563eb" />
          <Text className="ml-2 text-2xl font-black text-gray-900 dark:text-gray-50">{t("home.continueReading")}</Text>
        </View>
        <Text className="text-xs font-black uppercase tracking-[1.4px] text-blue-600 dark:text-blue-300">
          {continueReading.length} {t("home.active")}
        </Text>
      </View>
      <FlashList
        data={continueReading}
        horizontal
        keyExtractor={continueReadingKeyExtractor}
        renderItem={renderContinueReadingItem}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  ) : null, [continueReading, continueReadingKeyExtractor, renderContinueReadingItem, t]);

  const contentContainerStyle = useMemo(() => ({
    padding: 20,
    paddingBottom: contentPaddingForTabBar(insets.bottom)
  }), [insets.bottom]);

  return (
    <View
      className="flex-1 bg-gray-50 dark:bg-slate-950"
      style={{ paddingTop: insets.top }}
    >
      <ScreenHeader
        title={t("home.title")}
        subtitle={t("home.subtitle")}
      />

      {error && posts.length === 0 ? (
        <EmptyState
          title={t("home.unableToLoadFeed")}
          description={error.message}
          action={<RetryButton label={t("common.tryAgain")} onPress={() => refetch()} />}
        />
      ) : loading && posts.length === 0 ? (
        <SkeletonFeed count={4} />
      ) : (
        <View className="flex-1 w-full">
          <FlashList
            data={posts as BlogPostSummaryFragment[]}
            keyExtractor={keyExtractor}
            contentContainerStyle={contentContainerStyle}
            refreshControl={
              <RefreshControl refreshing={loading && posts.length === 0} onRefresh={handleRefresh} tintColor="#3b82f6" />
            }
            renderItem={renderItem}
            ListHeaderComponent={ListHeaderComponent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  title={t("home.emptyTitle")}
                  description={t("home.emptyDescription")}
                />
              ) : null
            }
            ListFooterComponent={
              loading && posts.length > 0 && hasMore ? (
                <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 20 }} />
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
}
