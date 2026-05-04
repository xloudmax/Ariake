import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, RefreshControl, Alert, InteractionManager, Platform } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import ArticleCard from "../../src/components/ArticleCard";
import GradientContentCard from "../../src/components/GradientContentCard";
import { contentPaddingForTabBar } from "../../src/components/layoutConstants";
import { EmptyState, RetryButton, ScreenHeader } from "../../src/components/ScreenPrimitives";
import { SkeletonFeed } from "../../src/components/Skeleton";
import { useI18n } from "../../src/i18n/I18nProvider";
import { usePopularPostsQuery, BlogPostSummaryFragment } from "../../src/generated/graphql";
import { insightStorage } from "../../src/insights/mobileInsightStorage";
import type { SavedInsight } from "../../src/insights/insightStorage";

const keyExtractor = (item: BlogPostSummaryFragment) => item.id;
const savedInsightKeyExtractor = (item: SavedInsight) => item.slug;
const ALL_FILTER = "__all__";

type SavedInsightCardProps = {
  insight: SavedInsight;
  onDelete: () => void;
  onPress: () => void;
  removeLabel: string;
  savedLabel: string;
  openHint: string;
  progressLabel: string;
  readyLabel: string;
};

function InsightCardFooter({ progress, progressLabel, readyLabel, onDelete, removeLabel }: { progress: number; progressLabel: string; readyLabel: string; onDelete: () => void; removeLabel: string }) {
  return (
    <>
      <View className="h-1.5 overflow-hidden rounded-full bg-white/20">
        <View className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="flex-1 mr-2 text-xs font-black text-white/88" numberOfLines={1}>
          {progress > 0 ? progressLabel : readyLabel}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          hitSlop={8}
          onPress={onDelete}
          className="flex-row items-center rounded-full bg-black/16 px-2.5 py-1.5"
        >
          <Octicons name="trash" size={12} color="rgba(255,255,255,0.88)" />
          <Text className="ml-1.5 text-xs font-black text-white/88" numberOfLines={1}>{removeLabel}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function SavedInsightCard({ insight, onDelete, onPress, removeLabel, savedLabel, openHint, progressLabel, readyLabel }: SavedInsightCardProps) {
  const progress = Math.round((insight.readingProgress || 0) * 100);

  return (
    <GradientContentCard
      variant="compact"
      title={insight.title}
      excerpt={insight.excerpt}
      coverImageUrl={insight.coverImageUrl}
      tags={insight.tags}
      gradientSeed={insight.slug || insight.title}
      badgeLabel={savedLabel}
      footer={<InsightCardFooter progress={progress} progressLabel={progressLabel} readyLabel={readyLabel} onDelete={onDelete} removeLabel={removeLabel} />}
      onPress={onPress}
      accessibilityHint={openHint}
    />
  );
}

export default function InsightScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);

  const { data, loading, error, refetch } = usePopularPostsQuery({
    variables: { limit: 15 },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const loadSavedInsights = useCallback(async () => {
    const insights = await insightStorage.listInsights();
    setSavedInsights(insights);
  }, []);

  useEffect(() => {
    loadSavedInsights().catch((loadError) => {
      console.warn("Failed to load saved insights:", loadError);
    });
  }, [loadSavedInsights]);

  useFocusEffect(
    useCallback(() => {
      const handle = InteractionManager.runAfterInteractions(() => {
        loadSavedInsights().catch((loadError) => {
          console.warn("Failed to refresh saved insights:", loadError);
        });
      });
      return () => handle.cancel();
    }, [loadSavedInsights]),
  );

  const popularPosts = data?.getPopularPosts || [];
  const availableFilters = useMemo(() => {
    const tags = new Set<string>();
    savedInsights.forEach((insight) => {
      insight.tags.forEach((tag) => tags.add(tag));
    });
    return [ALL_FILTER, ...Array.from(tags).sort((a, b) => a.localeCompare(b))];
  }, [savedInsights]);

  const filteredSavedInsights = useMemo(() => {
    if (activeFilter === ALL_FILTER) return savedInsights;
    return savedInsights.filter((insight) => insight.tags.includes(activeFilter));
  }, [activeFilter, savedInsights]);

  const openPost = useCallback((slug: string) => {
    router.push({ pathname: "/post/[slug]", params: { slug } });
  }, [router]);

  const handleDeleteInsight = useCallback((insight: SavedInsight) => {
    const remove = async () => {
      await insightStorage.removeInsight(insight.slug);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      await loadSavedInsights();
    };

    if (Platform.OS === "web") {
      remove().catch((deleteError) => console.warn("Failed to delete insight:", deleteError));
      return;
    }

    Alert.alert(
      t("insight.removeTitle"),
      `${insight.title}\n${t("insight.removeDescription")}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: () => {
            remove().catch((deleteError) => console.warn("Failed to delete insight:", deleteError));
          },
        },
      ],
    );
  }, [loadSavedInsights, t]);

  const renderSavedInsight = useCallback<ListRenderItem<SavedInsight>>(({ item }) => {
    const progress = Math.round((item.readingProgress || 0) * 100);
    return (
      <SavedInsightCard
        insight={item}
        onDelete={() => handleDeleteInsight(item)}
        onPress={() => openPost(item.slug)}
        removeLabel={t("common.remove")}
        savedLabel={t("common.saved")}
        openHint={t("insight.openHint")}
        progressLabel={t("home.percentRead", { progress })}
        readyLabel={t("insight.readyToRead")}
      />
    );
  }, [handleDeleteInsight, openPost, t]);

  const filterKeyExtractor = useCallback((item: string) => item, []);
  const renderFilterChip = useCallback<ListRenderItem<string>>(({ item }) => {
    const selected = item === activeFilter;
    return (
      <TouchableOpacity
        onPress={() => setActiveFilter(item)}
        className={`mr-2 rounded-full border px-4 py-2 ${selected ? "border-blue-500 bg-blue-500" : "border-blue-100 bg-white dark:border-slate-800 dark:bg-slate-900"}`}
      >
        <Text className={`text-xs font-black ${selected ? "text-white" : "text-slate-500 dark:text-slate-300"}`}>
          {item === ALL_FILTER ? t("insight.all") : item}
        </Text>
      </TouchableOpacity>
    );
  }, [activeFilter, t]);

  const SavedInsightsRow = useMemo(() => (
    <View className="mb-8">
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Octicons name="bookmark" size={22} color="#2563eb" />
          <Text className="ml-2 text-2xl font-black text-gray-900 dark:text-gray-50">{t("insight.savedInsights")}</Text>
        </View>
        <Text className="text-xs font-black uppercase tracking-[1.4px] text-blue-600 dark:text-blue-300">
          {t("insight.itemsCount", { count: savedInsights.length })}
        </Text>
      </View>
      {availableFilters.length > 1 ? (
        <View className="mb-4">
          <FlashList
            data={availableFilters}
            horizontal
            keyExtractor={filterKeyExtractor}
            renderItem={renderFilterChip}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      ) : null}
      {filteredSavedInsights.length > 0 ? (
        <FlashList
          data={filteredSavedInsights}
          horizontal
          keyExtractor={savedInsightKeyExtractor}
          renderItem={renderSavedInsight}
          showsHorizontalScrollIndicator={false}
        />
      ) : savedInsights.length > 0 ? (
        <View className="rounded-[26px] border border-dashed border-blue-200 bg-blue-50/80 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
          <Text className="text-base font-black text-blue-950 dark:text-blue-100">{t("insight.noInTagTitle")}</Text>
          <Text className="mt-2 text-sm leading-5 text-blue-700 dark:text-blue-200/75">
            {t("insight.noInTagDescription")}
          </Text>
        </View>
      ) : (
        <View className="rounded-[26px] border border-dashed border-blue-200 bg-blue-50/80 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
          <Text className="text-base font-black text-blue-950 dark:text-blue-100">{t("insight.emptyTitle")}</Text>
          <Text className="mt-2 text-sm leading-5 text-blue-700 dark:text-blue-200/75">
            {t("insight.emptyDescription")}
          </Text>
        </View>
      )}
    </View>
  ), [availableFilters, filteredSavedInsights, filterKeyExtractor, renderFilterChip, renderSavedInsight, savedInsights, t]);

  const renderTopPost = useCallback<ListRenderItem<BlogPostSummaryFragment>>(({ item: post, index }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).duration(260)}>
      <ArticleCard post={post} onPress={() => openPost(post.slug)} />
    </Animated.View>
  ), [openPost]);

  const contentContainerStyle = useMemo(() => ({
    padding: 20,
    paddingBottom: contentPaddingForTabBar(insets.bottom)
  }), [insets.bottom]);

  const ListHeaderComponent = useMemo(() => (
    <>
      {SavedInsightsRow}
      <View className="mb-4 flex-row items-center">
        <Octicons name="pulse" size={24} color="#3b82f6" />
        <Text className="ml-2 text-2xl font-bold text-gray-800 dark:text-gray-100">{t("insight.mustRead")}</Text>
      </View>
    </>
  ), [SavedInsightsRow, t]);

  return (
    <View
      className="flex-1 bg-gray-50 dark:bg-slate-950"
      style={{ paddingTop: insets.top }}
    >
      <ScreenHeader
        eyebrow={t("insight.subtitle")}
        title={t("insight.title")}
        subtitle={t("insight.subtitle")}
      />

      {error && popularPosts.length === 0 ? (
        <EmptyState
          title={t("insight.unableToLoad")}
          description={error.message}
          action={<RetryButton onPress={() => refetch()} />}
        />
      ) : loading && popularPosts.length === 0 && savedInsights.length === 0 ? (
        <SkeletonFeed count={3} />
      ) : (
        <View className="w-full flex-1">
          <FlashList
            data={popularPosts as BlogPostSummaryFragment[]}
            keyExtractor={keyExtractor}
            contentContainerStyle={contentContainerStyle}
            refreshControl={
              <RefreshControl
                refreshing={loading && popularPosts.length === 0}
                onRefresh={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  loadSavedInsights().catch((loadError) => console.warn("Failed to refresh saved insights:", loadError));
                  refetch();
                }}
                tintColor="#3b82f6"
              />
            }
            ListHeaderComponent={ListHeaderComponent}
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  icon={<Octicons name="pulse" size={28} color="#3b82f6" />}
                  title={t("insight.noPopularTitle")}
                  description={t("insight.noPopularDescription")}
                />
              ) : null
            }
            renderItem={renderTopPost}
          />
        </View>
      )}
    </View>
  );
}
