import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  InteractionManager,
  Share,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  useColorScheme,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { FlashList, useLayoutState, type FlashListRef, type ListRenderItem } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth/AuthContext";
import { GlassGroup, GlassSurface, useReduceTransparency } from "../../src/components/GlassSurface";
import { RichContentRenderer } from "../../src/components/richContent/RichContentRenderer";
import type { RichContentTheme } from "../../src/components/richContent/richContent";
import { useInsightStatus } from "../../src/insights/useInsightStatus";
import { useI18n } from "../../src/i18n/I18nProvider";
import { useToast } from "../../src/components/Toast/ToastProvider";
import { formatDate } from "../../src/i18n";
import { insightStorage } from "../../src/insights/mobileInsightStorage";
import { getGradientByString } from "../../src/utils/gradients";
import { isOnline } from "../../src/utils/network";
import { enqueueOfflineMutation } from "../../src/utils/mobileOfflineQueue";
import { client } from "../../src/apollo/client";
import {
  usePostQuery,
  useLikePostMutation,
  useUnlikePostMutation,
  useCommentsQuery,
  useCreateCommentMutation,
  CommentsDocument,
  type UserRole,
} from "../../src/generated/graphql";

const getReaderThemeOptions = (t: (key: string) => string): Array<{ value: RichContentTheme; label: string; icon: keyof typeof Octicons.glyphMap }> => [
  { value: "light", label: t("post.themeDay"), icon: "sun" },
  { value: "system", label: t("post.themeAuto"), icon: "device-mobile" },
  { value: "dark", label: t("post.themeNight"), icon: "moon" },
];

const getReaderPalette = (theme: Exclude<RichContentTheme, "system">) => {
  if (theme === "dark") {
    return {
      actionBarBg: "rgba(15, 23, 42, 0.45)",
      actionBarBorder: "rgba(148, 163, 184, 0.18)",
      background: "#0b1120",
      chipBg: "rgba(59, 130, 246, 0.16)",
      chipText: "#bfdbfe",
      divider: "rgba(148, 163, 184, 0.18)",
      glassColorScheme: "dark" as const,
      glassTint: "systemChromeMaterialDark" as const,
      icon: "#cbd5e1",
      meta: "#94a3b8",
      muted: "#97a6ba",
      panel: "#111827",
      panelMuted: "#1f2937",
      primary: "#93c5fd",
      text: "#d7deea",
      title: "#f8fafc",
    };
  }

  return {
    actionBarBg: "rgba(255, 250, 242, 0.5)",
    actionBarBorder: "rgba(120, 91, 53, 0.14)",
    background: "#fffaf2",
    chipBg: "#fff1d6",
    chipText: "#9a4d11",
    divider: "rgba(120, 91, 53, 0.14)",
    glassColorScheme: "light" as const,
    glassTint: "systemChromeMaterialLight" as const,
    icon: "#4b5563",
    meta: "#697586",
    muted: "#697586",
    panel: "#ffffff",
    panelMuted: "#fff4dc",
    primary: "#1d4ed8",
    text: "#1f2933",
    title: "#111827",
  };
};

// Comment Section Component
const CommentSection = ({
  palette,
  postId,
}: {
  palette: ReturnType<typeof getReaderPalette>;
  postId: string;
}) => {
  const { t, locale } = useI18n();
  const { showToast } = useToast();
  const { isAuthenticated, user } = useAuth();

  const [content, setContent] = useState("");
  const [createComment, { loading: creating }] = useCreateCommentMutation();
  const { data, loading, error } = useCommentsQuery({
    variables: { blogPostId: postId, limit: 10, offset: 0 },
    fetchPolicy: "cache-and-network"
  });

  const handlePostComment = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || !user) return;
    Keyboard.dismiss();
    setContent("");

    // Optimistic comment payload — Apollo writes this to cache instantly so
    // the new comment appears at the top of the list before the server roundtrip
    // finishes. The temporary id is replaced when the real mutation result lands.
    const now = new Date().toISOString();
    const optimisticComment = {
      __typename: "BlogPostComment" as const,
      id: `optimistic-${now}-${Math.random().toString(36).slice(2, 8)}`,
      content: trimmed,
      isApproved: true,
      likeCount: 0,
      reportCount: 0,
      createdAt: now,
      updatedAt: now,
      user: {
        __typename: "User" as const,
        id: user.id,
        username: user.username,
        avatar: user.avatar ?? null,
      },
    };

    // When offline, skip the doomed mutation and queue it. We still write the
    // optimistic comment into cache directly so the user sees their post
    // immediately; the queue replays on reconnect and the real comment
    // replaces the optimistic entry via the same updateQuery shape used below.
    if (!isOnline()) {
      const apolloCache = client.cache;
      apolloCache.updateQuery(
        {
          query: CommentsDocument,
          variables: { blogPostId: postId, limit: 10, offset: 0 },
        },
        (existing) => {
          if (!existing?.comments) return existing;
          return {
            ...existing,
            comments: {
              ...existing.comments,
              comments: [optimisticComment, ...existing.comments.comments],
              total: (existing.comments.total ?? 0) + 1,
            },
          };
        },
      );
      enqueueOfflineMutation("comment.create", {
        input: { blogPostId: postId, content: trimmed },
      }).catch(() => {});
      showToast({ variant: "info", message: t("common.queuedOffline") });
      return;
    }

    try {
      await createComment({
        variables: { input: { blogPostId: postId, content: trimmed } },
        optimisticResponse: { createComment: optimisticComment },
        update: (cache, { data: mutationData }) => {
          const fresh = mutationData?.createComment;
          if (!fresh) return;
          cache.updateQuery(
            {
              query: CommentsDocument,
              variables: { blogPostId: postId, limit: 10, offset: 0 },
            },
            (existing) => {
              if (!existing?.comments) return existing;
              const filtered = existing.comments.comments.filter(
                (c: { id: string }) => c.id !== fresh.id && !c.id.startsWith("optimistic-"),
              );
              return {
                ...existing,
                comments: {
                  ...existing.comments,
                  comments: [fresh, ...filtered],
                  total: (existing.comments.total ?? 0) + 1,
                },
              };
            },
          );
        },
      });
    } catch (err) {
      console.error("Failed to post comment:", err);
      setContent(trimmed); // restore so user can retry
      showToast({
        variant: "error",
        message: err instanceof Error && err.message ? err.message : t("post.failedToLoadComments"),
      });
    }
  }, [content, postId, createComment, showToast, t, user]);

  const comments = data?.comments?.comments || [];
  const total = data?.comments?.total || 0;

  if (loading) return <ActivityIndicator size="small" color={palette.primary} className="my-10" />;
  if (error) return <Text className="my-5" style={{ color: "#ef4444" }}>{t("post.failedToLoadComments")}</Text>;

  return (
    <View
      className="mt-8 mb-10 pb-20 pt-6"
      style={{ borderTopColor: palette.divider, borderTopWidth: 1 }}
    >
      <Text className="mb-6 text-xl font-bold" style={{ color: palette.title }}>{t("post.comments", { count: total })}</Text>

      {/* Comment Input */}
      {isAuthenticated ? (
        <View className="mb-8">
          <View
            className="overflow-hidden rounded-2xl border"
            style={{ backgroundColor: palette.panel, borderColor: palette.divider }}
          >
            <TextInput
              multiline
              value={content}
              onChangeText={setContent}
              placeholder={t("post.writeComment")}
              placeholderTextColor={palette.muted}
              className="min-h-[80px] p-4 text-base"
              style={{ color: palette.text }}
              textAlignVertical="top"
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <View
              className="flex-row justify-end border-t p-2"
              style={{ backgroundColor: palette.panelMuted, borderTopColor: palette.divider }}
            >
              <TouchableOpacity
                disabled={creating || !content.trim()}
                onPress={handlePostComment}
                className={`flex-row items-center rounded-full px-4 py-2 ${(!content.trim() || creating) ? 'opacity-50' : ''}`}
                style={{ backgroundColor: palette.primary }}
              >
                {creating ? <ActivityIndicator size="small" color="#fff" className="mr-2" /> : null}
                <Text className="text-sm font-bold text-white">{t("post.postComment")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View
          className="mb-8 items-center justify-center rounded-xl border p-4"
          style={{ backgroundColor: palette.panelMuted, borderColor: palette.divider }}
        >
          <Text className="mb-2" style={{ color: palette.muted }}>{t("post.signInToComment")}</Text>
        </View>
      )}

      {comments.length === 0 ? (
        <Text className="py-5 text-center italic" style={{ color: palette.muted }}>{t("post.noComments")}</Text>
      ) : (
        comments.map((comment) => (
            <View key={comment.id} className="mb-6">
            <View className="mb-2 flex-row items-center">
              {comment.user?.avatar ? (
                <Image
                  cachePolicy="disk"
                  contentFit="cover"
                  source={{ uri: comment.user.avatar }}
                  style={styles.commentAvatar}
                  transition={160}
                />
              ) : (
                <View
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: palette.panelMuted }}
                >
                  <Octicons name="person" size={16} color={palette.muted} />
                </View>
              )}
              <View className="ml-3">
                <Text className="text-sm font-bold" style={{ color: palette.title }}>{comment.user?.username || t("post.anonymous")}</Text>
                <Text className="text-xs" style={{ color: palette.muted }}>
                  {formatDate(comment.createdAt, locale)}
                </Text>
              </View>
            </View>
            <View className="pl-11">
              <Text className="text-base leading-relaxed" style={{ color: palette.text }}>{comment.content}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

// Floating Header Component
const Header = ({
  onBack,
  paddingTop,
  palette,
  reduceTransparency,
}: {
  onBack: () => void;
  paddingTop: number;
  palette: ReturnType<typeof getReaderPalette>;
  reduceTransparency: boolean;
}) => {
  const { t } = useI18n();
  return (
  <View
    className="absolute left-0 right-0 top-0 z-10 px-4"
    style={{ paddingTop }}
  >
      <GlassSurface
        className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border shadow-sm"
        colorScheme={palette.glassColorScheme}
        fallbackColor={palette.actionBarBg}
        fallbackTint={palette.glassTint}
        reduceTransparency={reduceTransparency}
        style={{ borderColor: palette.actionBarBorder }}
      >
        <TouchableOpacity
          accessibilityLabel={t("post.goBack")}
          accessibilityRole="button"
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <Octicons name="arrow-left" size={20} color={palette.icon} />
        </TouchableOpacity>
      </GlassSurface>
  </View>
  );
};

const PostContentSection = ({
  content,
  theme,
}: {
  content: string;
  theme: RichContentTheme;
}) => {
  const [, setRichContentHeight] = useLayoutState(0);
  const handleHeightChange = useCallback((height: number) => {
    setRichContentHeight(height);
  }, [setRichContentHeight]);

  return (
    <View className="px-5">
      <RichContentRenderer
        content={content}
        onHeightChange={handleHeightChange}
        theme={theme}
      />
    </View>
  );
};

export default function PostDetailScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale } = useI18n();
  const { showToast } = useToast();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const slugValue = Array.isArray(slug) ? slug[0] : slug;
  const [readerTheme, setReaderTheme] = useState<RichContentTheme>("system");
  const resolvedReaderTheme: Exclude<RichContentTheme, "system"> = readerTheme === "system"
    ? colorScheme === "dark" ? "dark" : "light"
    : readerTheme;
  const readerThemeOptions = useMemo(() => getReaderThemeOptions(t), [t]);
  const palette = useMemo(() => getReaderPalette(resolvedReaderTheme), [resolvedReaderTheme]);
  const reduceTransparency = useReduceTransparency();

  const { data, loading, error, refetch } = usePostQuery({
    variables: { slug: slugValue ?? "" },
    skip: !slugValue,
    // cache-first: opening a previously-read article skips the network entirely.
    // Pull-to-refresh / refetch() still hits the wire to sync stats and edits.
    fetchPolicy: "cache-first"
  });

  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();

  const post = data?.post;
  const fallbackGradient = getGradientByString(slugValue || data?.post?.title || "post");
  const { isSaved, loading: insightLoading, toggleInsight } = useInsightStatus(post ? {
    coverImageUrl: post.coverImageUrl,
    excerpt: post.excerpt,
    id: post.id,
    readingProgress: 0,
    slug: post.slug,
    tags: post.tags,
    title: post.title,
  } : null);

  const [optimisticLike, setOptimisticLike] = useState<boolean | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const readingProgressRef = useRef(0);
  const progressFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashListRef = useRef<FlashListRef<PostSection>>(null);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const restoredScrollRef = useRef<string | null>(null);
  const restoreScrollTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const handleDismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleShare = useCallback(async () => {
    try {
      if (post) {
        await Share.share({
          message: String(t("post.shareMessage", { title: post.title })),
          title: post.title
        });
      }
    } catch (e) {
      console.warn(e);
    }
  }, [post, t]);

  const handleLikeToggle = useCallback(async () => {
    if (!post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const isCurrentlyLiked = optimisticLike !== null ? optimisticLike : post.isLiked;

    // Optimistic UI update
    setOptimisticLike(!isCurrentlyLiked);

    // When offline, queue the toggle and let the optimistic state stand. The
    // queued mutation replays on reconnect; idempotent because the server
    // tolerates double-like / double-unlike intent.
    if (!isOnline()) {
      const kind = isCurrentlyLiked ? "post.unlike" : "post.like";
      enqueueOfflineMutation(kind, { id: post.id }).catch(() => {});
      return;
    }

    try {
      if (isCurrentlyLiked) {
        await unlikePost({ variables: { id: post.id } });
      } else {
        await likePost({ variables: { id: post.id } });
      }
      refetch(); // resync with server to get actual true state of `post.isLiked`
    } catch (err) {
      // Rollback
      setOptimisticLike(isCurrentlyLiked);
      console.error(err);
    }
  }, [post, optimisticLike, likePost, unlikePost, refetch]);

  // Flush reading progress from ref to state at most once per 200ms to avoid
  // re-rendering the entire screen on every scroll event.
  const flushProgressToState = useCallback(() => {
    if (progressFlushTimerRef.current) return;
    progressFlushTimerRef.current = setTimeout(() => {
      progressFlushTimerRef.current = null;
      setReadingProgress(readingProgressRef.current);
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (progressFlushTimerRef.current) clearTimeout(progressFlushTimerRef.current);
      restoreScrollTimersRef.current.forEach(clearTimeout);
      restoreScrollTimersRef.current = [];
    };
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    contentHeightRef.current = contentSize.height;
    viewportHeightRef.current = layoutMeasurement.height;
    const scrollableHeight = contentSize.height - layoutMeasurement.height;
    if (scrollableHeight <= 0) {
      readingProgressRef.current = 1;
      flushProgressToState();
      return;
    }

    const nextProgress = Math.min(Math.max(contentOffset.y / scrollableHeight, 0), 1);
    readingProgressRef.current = nextProgress;
    flushProgressToState();
  }, [flushProgressToState]);

  useEffect(() => {
    if (!post) return;
    if (readingProgress < 0.02) return;

    const timeout = setTimeout(() => {
      insightStorage.upsertReadingHistory({
        coverImageUrl: post.coverImageUrl,
        excerpt: post.excerpt,
        id: post.id,
        readingProgress,
        slug: post.slug,
        tags: post.tags,
        title: post.title,
      }).catch((err) => {
        console.warn("Failed to update reading history:", err);
      });
    }, 700);

    return () => clearTimeout(timeout);
  }, [post, readingProgress]);

  useEffect(() => {
    if (!post || restoredScrollRef.current === post.slug) return;

    let cancelled = false;

    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      insightStorage.getReadingHistory(post.slug).then((history) => {
        if (cancelled || !history || history.readingProgress < 0.05 || history.readingProgress > 0.95) return;

        restoredScrollRef.current = post.slug;
        readingProgressRef.current = history.readingProgress;
        setReadingProgress(history.readingProgress);

        const restorePosition = () => {
          if (cancelled) return;
          const scrollableHeight = Math.max(contentHeightRef.current - viewportHeightRef.current, 0);
          if (scrollableHeight <= 0) return;
          flashListRef.current?.scrollToOffset({
            animated: false,
            offset: scrollableHeight * history.readingProgress,
          });
        };

        restoreScrollTimersRef.current.forEach(clearTimeout);
        restoreScrollTimersRef.current = [250, 900].map((delay) => setTimeout(restorePosition, delay));
      }).catch((err) => {
        console.warn("Failed to restore reading position:", err);
      });
    });

    return () => {
      cancelled = true;
      interactionHandle.cancel();
      restoreScrollTimersRef.current.forEach(clearTimeout);
      restoreScrollTimersRef.current = [];
    };
  }, [post]);

  useEffect(() => {
    if (!post || !isSaved) return;
    if (readingProgress < 0.05) return;

    const timeout = setTimeout(() => {
      toggleInsight({ readingProgress, mode: "update-progress" }).catch((err) => {
        console.warn("Failed to update reading progress:", err);
      });
    }, 700);

    return () => clearTimeout(timeout);
  }, [isSaved, post, readingProgress, toggleInsight]);

  const handleInsightToggle = useCallback(() => {
    Haptics.notificationAsync(isSaved
      ? Haptics.NotificationFeedbackType.Warning
      : Haptics.NotificationFeedbackType.Success).catch(() => {});
    toggleInsight({ readingProgress }).catch((err) => {
      console.warn("Failed to toggle saved insight:", err);
      showToast({
        variant: "error",
        message: err instanceof Error && err.message ? err.message : t("common.error"),
      });
    });
  }, [isSaved, readingProgress, showToast, t, toggleInsight]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  }, [router]);

  const handleEditPost = useCallback(() => {
    if (!post) return;
    router.push({ pathname: "/editor/[slug]", params: { slug: post.slug } });
  }, [post, router]);

  const contentContainerStyle = useMemo(() => ({
    paddingBottom: insets.bottom + 100
  }), [insets.bottom]);

  // ── Section data model for FlashList ─────────────────────────────────
  type PostSection =
    | { sectionType: "hero" }
    | { sectionType: "meta" }
    | { sectionType: "content" }
    | { sectionType: "comments" };

  const sections = useMemo<PostSection[]>(() => {
    if (!post) return [];
    return [
      { sectionType: "hero" },
      { sectionType: "meta" },
      { sectionType: "content" },
      { sectionType: "comments" },
    ];
  }, [post]);

  const sectionKeyExtractor = useCallback(
    (item: PostSection) => item.sectionType,
    [],
  );

  const getItemType = useCallback(
    (item: PostSection) => item.sectionType,
    [],
  );

  if (loading && !post) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: palette.background }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (error || !post || !slugValue) {
    return (
      <View className="flex-1 items-center justify-center p-5" style={{ backgroundColor: palette.background }}>
        <Text className="mb-4 text-center" style={{ color: "#ef4444" }}>
          {error?.message || t("post.notFound")}
        </Text>
        <TouchableOpacity onPress={handleBack} className="rounded-lg px-4 py-2" style={{ backgroundColor: palette.panelMuted }}>
          <Text style={{ color: palette.text }}>{t("post.goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { title, content, coverImageUrl, author, publishedAt, stats, tags, id, isLiked } = post;
  const canEditPost = !!user && (user.id === author?.id || (user.role as UserRole) === "ADMIN");
  const dateStr = publishedAt ? formatDate(publishedAt, locale) : t("post.recent");
  const actuallyLiked = optimisticLike !== null ? optimisticLike : isLiked;

  // ── Section renderers ─────────────────────────────────────────────────
  const renderHero = () => {
    if (coverImageUrl) {
      return (
        <Image
          cachePolicy="disk"
          contentFit="cover"
          source={{ uri: coverImageUrl }}
          style={styles.heroImage}
          transition={180}
        />
      );
    }
    return (
      <LinearGradient
        colors={fallbackGradient}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.heroImage}
      >
        <View className="absolute inset-0 opacity-20" style={styles.noiseOverlay} />
        <LinearGradient
          colors={["rgba(15,23,42,0.02)", "rgba(15,23,42,0.70)"]}
          style={styles.heroGradientOverlay}
        />
        <View className="flex-1 justify-end px-6 pb-8 pt-16">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl border border-white/20 bg-white/15">
            <Octicons name="file-media" size={32} color="rgba(255,255,255,0.94)" />
          </View>
          <Text className="text-[11px] font-black uppercase tracking-[2px] text-white/75">
            {tags?.[0] ? `#${tags[0]}` : t("post.post")}
          </Text>
          <Text className="mt-2 text-3xl font-black leading-9 text-white" numberOfLines={3}>
            {title}
          </Text>
        </View>
      </LinearGradient>
    );
  };

  const renderMeta = () => (
    <View className="px-5 pt-6">
      <GlassSurface
        className="mb-5 flex-row items-center justify-between overflow-hidden rounded-full border p-1"
        colorScheme={palette.glassColorScheme}
        fallbackColor={palette.actionBarBg}
        fallbackTint={palette.glassTint}
        reduceTransparency={reduceTransparency}
        style={{ borderColor: palette.divider }}
      >
        {readerThemeOptions.map((option) => {
          const selected = readerTheme === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setReaderTheme(option.value)}
              className="flex-1 flex-row items-center justify-center rounded-full px-3 py-2"
              style={{ backgroundColor: selected ? palette.chipBg : "transparent" }}
            >
              <Octicons
                name={option.icon}
                size={14}
                color={selected ? palette.primary : palette.muted}
              />
              <Text
                className="ml-1.5 text-xs font-bold"
                style={{ color: selected ? palette.primary : palette.muted }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </GlassSurface>

      {tags && tags.length > 0 && (
        <View className="mb-4 flex-row flex-wrap gap-2">
          {tags.map((tag) => (
            <View key={tag} className="rounded-full px-2.5 py-1" style={{ backgroundColor: palette.chipBg }}>
              <Text className="text-xs font-semibold" style={{ color: palette.chipText }}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <Text className="mb-4 text-3xl font-bold leading-normal" style={{ color: palette.title }}>
        {title}
      </Text>

      <View
        className="mb-8 flex-row items-center justify-between border-b pb-6"
        style={{ borderBottomColor: palette.divider }}
      >
        <View className="flex-row items-center">
          {author?.avatar ? (
            <Image
              cachePolicy="disk"
              contentFit="cover"
              source={{ uri: author.avatar }}
              style={styles.authorAvatar}
              transition={160}
            />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: palette.panelMuted }}>
              <Octicons name="person" size={20} color={palette.muted} />
            </View>
          )}
          <View className="ml-3">
            <Text className="text-base font-semibold" style={{ color: palette.title }}>
              {author?.username || t("post.anonymous")}
            </Text>
            <View className="mt-0.5 flex-row items-center">
              <Text className="text-xs" style={{ color: palette.meta }}>{dateStr}</Text>
              <Text className="mx-1.5 text-xs" style={{ color: palette.divider }}>•</Text>
              <Octicons name="eye" size={12} color={palette.meta} />
              <Text className="ml-1 text-xs" style={{ color: palette.meta }}>{stats?.viewCount || 0}</Text>
            </View>
          </View>
        </View>
        {canEditPost ? (
          <TouchableOpacity
            accessibilityLabel={t("post.editPost")}
            accessibilityRole="button"
            className="ml-3 flex-row items-center rounded-full px-3 py-2"
            onPress={handleEditPost}
            style={{ backgroundColor: palette.chipBg }}
          >
            <Octicons name="pencil" size={14} color={palette.primary} />
            <Text className="ml-1.5 text-xs font-black" style={{ color: palette.primary }}>
              {t("post.editPost")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const renderContent = () => (
    <PostContentSection content={content || `*${t("post.noContent")}*`} theme={readerTheme} />
  );

  const renderComments = () => (
    <View className="px-5">
      <CommentSection palette={palette} postId={id} />
    </View>
  );

  const renderItem: ListRenderItem<PostSection> = ({ item }) => {
    switch (item.sectionType) {
      case "hero": return renderHero();
      case "meta": return renderMeta();
      case "content": return renderContent();
      case "comments": return renderComments();
      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      style={{ backgroundColor: palette.background }}
    >
      <View className="flex-1">
          <Header onBack={handleBack} paddingTop={insets.top + 10} palette={palette} reduceTransparency={reduceTransparency} />
          <FlashList
            ref={flashListRef}
            data={sections}
            getItemType={getItemType}
            keyExtractor={sectionKeyExtractor}
            contentContainerStyle={contentContainerStyle}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={handleDismissKeyboard}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            showsHorizontalScrollIndicator={false}
            renderItem={renderItem}
          />

          {/* Floating Action Bar (Like, Comment, Share) */}
          <GlassGroup
            className="absolute bottom-6 left-6 right-6"
            reduceTransparency={reduceTransparency}
            spacing={32}
            style={{ paddingBottom: Math.max(insets.bottom - 20, 0) }}
            pointerEvents="box-none"
          >
            <GlassSurface
              className="overflow-hidden rounded-full border px-5 py-4 shadow-lg shadow-black/10"
              colorScheme={palette.glassColorScheme}
              fallbackColor={palette.actionBarBg}
              fallbackTint={palette.glassTint}
              reduceTransparency={reduceTransparency}
              style={{ borderColor: palette.actionBarBorder }}
            >
              <View className="absolute left-5 right-5 top-0 h-0.5 rounded-full" style={{ backgroundColor: palette.actionBarBorder }}>
                <View
                  className="h-0.5 rounded-full"
                  style={{ backgroundColor: palette.primary, width: `${Math.round(readingProgress * 100)}%` }}
                />
              </View>
              <View className="flex-row items-center justify-between">
                <TouchableOpacity onPress={handleLikeToggle} className="flex-row items-center">
                  <Octicons
                    name={actuallyLiked ? "heart-fill" : "heart"}
                    size={22}
                    color={actuallyLiked ? "#ef4444" : palette.icon}
                  />
                  <Text className="ml-2 font-semibold" style={{ color: actuallyLiked ? "#ef4444" : palette.icon }}>
                    {stats?.likeCount || 0}
                  </Text>
                </TouchableOpacity>

                <View className="flex-row items-center">
                  <Octicons name="comment" size={22} color={palette.icon} />
                  <Text className="ml-2 font-semibold" style={{ color: palette.icon }}>{stats?.commentCount || 0}</Text>
                </View>

                <TouchableOpacity
                  disabled={insightLoading}
                  onPress={handleInsightToggle}
                  className="flex-row items-center"
                >
                  {insightLoading ? (
                    <ActivityIndicator size="small" color={palette.primary} />
                  ) : (
                    <Octicons name={isSaved ? "bookmark-filled" : "bookmark"} size={22} color={isSaved ? palette.primary : palette.icon} />
                  )}
                  <Text className="ml-2 text-xs font-black" style={{ color: isSaved ? palette.primary : palette.icon }}>
                    {isSaved ? t("common.saved") : t("common.save")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityLabel={t("post.shareAction")}
                  accessibilityRole="button"
                  onPress={handleShare}
                >
                  <Octicons name="share" size={22} color={palette.icon} />
                </TouchableOpacity>
              </View>
            </GlassSurface>
          </GlassGroup>
        </View>
    </KeyboardAvoidingView>
  );
}

const styles = {
  authorAvatar: {
    backgroundColor: "#e5e7eb",
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  commentAvatar: {
    backgroundColor: "#e5e7eb",
    borderRadius: 16,
    height: 32,
    width: 32,
  },
  heroGradientOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute" as const,
    right: 0,
    top: 0,
  },
  heroImage: {
    backgroundColor: "#e5e7eb",
    height: 288,
    width: "100%" as const,
  },
  noiseOverlay: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
};
