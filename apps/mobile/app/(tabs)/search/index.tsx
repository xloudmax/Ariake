import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, ActivityIndicator, TouchableOpacity, Platform, ScrollView, Keyboard, TouchableWithoutFeedback } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Octicons } from "@expo/vector-icons";
import {
  usePostsQuery,
  useSearchPostsLazyQuery,
  useTrendingTagsQuery,
  type BlogPostSummaryFragment,
} from "../../../src/generated/graphql";
import ArticleCard from "../../../src/components/ArticleCard";
import { contentPaddingForTabBar } from "../../../src/components/layoutConstants";
import { EmptyState, ScreenHeader } from "../../../src/components/ScreenPrimitives";
import { SkeletonFeed } from "../../../src/components/Skeleton";
import { useI18n } from "../../../src/i18n/I18nProvider";
import { isOnline } from "../../../src/utils/network";

const PAGE_SIZE = 20;
const keyExtractor = (item: BlogPostSummaryFragment) => item.id;

type DiscoverMode = "default" | "tag" | "search";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagHasMore, setTagHasMore] = useState(true);
  const tagFetchingMoreRef = useRef(false);

  const [searchPosts, { data: searchData, loading: searchLoading, error: searchError, fetchMore: fetchMoreSearch }] = useSearchPostsLazyQuery({
    notifyOnNetworkStatusChange: true,
  });

  const { data: tagsData, loading: tagsLoading } = useTrendingTagsQuery({
    variables: { limit: 15 },
    fetchPolicy: "cache-and-network",
  });

  const {
    data: tagData,
    loading: tagLoading,
    error: tagError,
    fetchMore: fetchMoreTag,
  } = usePostsQuery({
    variables: {
      limit: PAGE_SIZE,
      offset: 0,
      filter: selectedTag ? { tags: [selectedTag] } : undefined,
    },
    skip: !selectedTag,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const trendingTags = useMemo(
    () => tagsData?.getTrendingTags ?? [],
    [tagsData?.getTrendingTags],
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.trim().length > 0) {
      setSelectedTag(null);
      // cache-and-network: identical repeat queries (e.g. user types "hello",
      // backspaces, retypes "hello") return from cache instantly while a
      // background refresh keeps it fresh. Apollo's lazy query already drops
      // late-arriving stale results from prior keystrokes.
      searchPosts({
        variables: { query: debouncedQuery.trim(), limit: PAGE_SIZE, offset: 0 },
        fetchPolicy: "cache-and-network",
      });
    }
  }, [debouncedQuery, searchPosts]);

  useEffect(() => {
    setTagHasMore(true);
    tagFetchingMoreRef.current = false;
  }, [selectedTag]);

  const mode: DiscoverMode = debouncedQuery.trim().length > 0
    ? "search"
    : selectedTag
      ? "tag"
      : "default";

  const searchPostsResult = searchData?.searchPosts?.posts || [];
  const searchTotal = searchData?.searchPosts?.total || 0;
  const tagPosts = tagData?.posts || [];
  const visiblePosts = mode === "tag" ? tagPosts : searchPostsResult;
  const loading = mode === "tag" ? tagLoading : searchLoading;
  const error = mode === "tag" ? tagError : searchError;

  const openPost = useCallback((slug: string) => {
    router.push({ pathname: "/post/[slug]", params: { slug } });
  }, [router]);

  const handleDismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (text.trim().length > 0) {
      setSelectedTag(null);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    Keyboard.dismiss();
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);

  const handleSelectTag = useCallback((tag: string) => {
    Keyboard.dismiss();
    setSearchQuery("");
    setDebouncedQuery("");
    setSelectedTag(tag);
  }, []);

  const handleClearTag = useCallback(() => {
    Keyboard.dismiss();
    setSelectedTag(null);
    setTagHasMore(true);
    tagFetchingMoreRef.current = false;
  }, []);

  const handleLoadMoreSearch = useCallback(() => {
    if (searchLoading || searchPostsResult.length === 0 || searchPostsResult.length >= searchTotal) return;
    if (!isOnline()) return;

    fetchMoreSearch({
      variables: {
        limit: PAGE_SIZE,
        offset: searchPostsResult.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          ...prev,
          searchPosts: {
            ...prev.searchPosts,
            posts: [...prev.searchPosts.posts, ...fetchMoreResult.searchPosts.posts],
          },
        };
      },
    });
  }, [fetchMoreSearch, searchLoading, searchPostsResult.length, searchTotal]);

  const handleLoadMoreTag = useCallback(() => {
    if (!selectedTag || tagLoading || !tagHasMore || tagFetchingMoreRef.current || tagPosts.length === 0) return;
    if (!isOnline()) return;

    tagFetchingMoreRef.current = true;
    fetchMoreTag({
      variables: {
        offset: tagPosts.length,
        limit: PAGE_SIZE,
        filter: { tags: [selectedTag] },
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        if (fetchMoreResult.posts.length < PAGE_SIZE) {
          setTagHasMore(false);
        }
        if (fetchMoreResult.posts.length === 0) return prev;
        return {
          ...prev,
          posts: [...prev.posts, ...fetchMoreResult.posts],
        };
      },
    }).finally(() => {
      tagFetchingMoreRef.current = false;
    });
  }, [fetchMoreTag, selectedTag, tagHasMore, tagLoading, tagPosts.length]);

  const handleLoadMore = mode === "tag" ? handleLoadMoreTag : handleLoadMoreSearch;

  const renderItem = useCallback<ListRenderItem<BlogPostSummaryFragment>>(({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).duration(260)}>
      <ArticleCard post={item} onPress={() => openPost(item.slug)} />
    </Animated.View>
  ), [openPost]);

  const contentContainerStyle = useMemo(() => ({
    padding: 20,
    paddingBottom: contentPaddingForTabBar(insets.bottom),
  }), [insets.bottom]);

  const ListHeaderComponent = useMemo(() => {
    if (mode === "tag") {
      return (
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-black uppercase tracking-[1.4px] text-blue-600 dark:text-blue-300">{t("search.tagResults", { tag: selectedTag })}</Text>
            <Text className="mt-1 text-2xl font-black text-gray-900 dark:text-gray-50">#{selectedTag}</Text>
          </View>
          <TouchableOpacity onPress={handleClearTag} className="rounded-full bg-blue-50 px-4 py-2 dark:bg-blue-950/40">
            <Text className="text-xs font-black text-blue-600 dark:text-blue-300">{t("common.clear")}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <Text className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500">
        {t("search.searchResults")}: {searchTotal}
      </Text>
    );
  }, [handleClearTag, mode, searchTotal, selectedTag, t]);

  const ListEmptyComponent = useMemo(() => (
    <View className="mt-10 items-center">
      <EmptyState
        icon={<Octicons name="search" size={28} color="#3b82f6" />}
        title={t("search.emptyTitle")}
        description={t("search.emptyDescription")}
      />
    </View>
  ), [t]);

  const showLoadingOnly = loading && visiblePosts.length === 0 && mode !== "default";

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: Platform.OS === "ios",
          title: t("common.search"),
          headerSearchBarOptions:
            Platform.OS === "ios"
              ? {
                  placement: "automatic",
                  placeholder: t("search.placeholder"),
                  autoCapitalize: "none",
                  hideWhenScrolling: false,
                  onChangeText: (event) => handleSearchTextChange(event.nativeEvent.text),
                  onCancelButtonPress: handleClearSearch,
                }
              : undefined,
        }}
      />

      <TouchableWithoutFeedback accessible={false} onPress={handleDismissKeyboard}>
        <View
          className="flex-1 bg-gray-50 dark:bg-slate-950"
          style={{ paddingTop: Platform.OS === "ios" ? 0 : insets.top }}
        >
        {Platform.OS !== "ios" ? (
          <View>
            <ScreenHeader
              eyebrow={t("common.search")}
              title={t("search.title")}
              subtitle={t("search.placeholder")}
            />
            <View className="border-b border-gray-100 bg-white px-5 pb-4 dark:border-slate-800 dark:bg-slate-950">
              <View className="flex-row items-center rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <Octicons name="search" size={18} color="#6b7280" />
                <TextInput
                  className="ml-3 flex-1 text-base text-gray-800 dark:text-gray-200"
                  placeholder={t("search.placeholder")}
                  placeholderTextColor="#9ca3af"
                  value={searchQuery}
                  onChangeText={handleSearchTextChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    accessibilityLabel={t("search.clearAction")}
                    accessibilityRole="button"
                    onPress={handleClearSearch}
                  >
                    <Octicons name="x-circle-fill" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ) : null}

        {showLoadingOnly ? (
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={contentContainerStyle}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            <SkeletonFeed count={3} />
          </ScrollView>
        ) : error ? (
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={contentContainerStyle}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            <EmptyState
              title={mode === "tag" ? t("search.unableToLoadTag") : t("search.searchFailed")}
              description={error.message}
            />
          </ScrollView>
        ) : mode !== "default" ? (
          <View className="w-full flex-1">
            <FlashList
              contentInsetAdjustmentBehavior="automatic"
              data={visiblePosts as BlogPostSummaryFragment[]}
              keyExtractor={keyExtractor}
              contentContainerStyle={contentContainerStyle}
              ListHeaderComponent={ListHeaderComponent}
              renderItem={renderItem}
              ListEmptyComponent={ListEmptyComponent}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loading && visiblePosts.length > 0 ? (
                  <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 20 }} />
                ) : null
              }
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
            />
          </View>
        ) : (
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={contentContainerStyle}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            {tagsLoading && trendingTags.length === 0 ? (
              <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 20 }} />
            ) : trendingTags.length > 0 ? (
              <View>
                <View className="mb-4 flex-row items-center">
                  <Octicons name="flame" size={20} color="#f97316" />
                  <Text className="ml-2 text-lg font-bold text-gray-800 dark:text-gray-100">{t("search.trendingTags")}</Text>
                </View>
                <View className="flex-row flex-wrap gap-3">
                  {trendingTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => handleSelectTag(tag)}
                      className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 dark:border-blue-800/50 dark:bg-blue-900/30"
                    >
                      <Text className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                        #{tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <EmptyState
                icon={<Octicons name="search" size={28} color="#3b82f6" />}
                title={t("search.title")}
                description={t("search.placeholder")}
              />
            )}
          </ScrollView>
        )}
        </View>
      </TouchableWithoutFeedback>
    </>
  );
}
