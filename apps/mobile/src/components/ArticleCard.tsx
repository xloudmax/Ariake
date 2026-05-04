import React, { memo } from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { BlogPostSummaryFragment } from "../generated/graphql";
import { Octicons } from "@expo/vector-icons";
import GradientContentCard from "./GradientContentCard";
import { useI18n } from "../i18n/I18nProvider";
import { formatDate } from "../i18n/index";

interface ArticleCardProps {
  post: BlogPostSummaryFragment;
  onPress?: () => void;
}

// ---------------------------------------------------------------------------
// Footer — author row + stats (views, comments)
// ---------------------------------------------------------------------------
function ArticleCardFooter({ post }: { post: BlogPostSummaryFragment }) {
  const { t } = useI18n();
  const views = post.stats?.viewCount || 0;
  const comments = post.stats?.commentCount || 0;

  return (
    <View className="flex-row items-center justify-between">
      <View className="min-w-0 flex-1 flex-row items-center pr-3">
        {post.author?.avatar ? (
          <Image
            cachePolicy="disk"
            contentFit="cover"
            source={{ uri: post.author.avatar }}
            style={{ backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 16, height: 32, width: 32 }}
            transition={160}
          />
        ) : (
          <View className="h-8 w-8 items-center justify-center rounded-full bg-white/22">
            <Octicons name="person" size={15} color="rgba(255,255,255,0.9)" />
          </View>
        )}
        <View className="ml-2 min-w-0 flex-1">
          <Text className="text-sm font-black text-white" numberOfLines={1}>
            {post.author?.username || t("post.anonymous")}
          </Text>
          <Text className="mt-0.5 text-[11px] font-semibold text-white/62" numberOfLines={1}>
            {t("post.tapToRead")}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="flex-row items-center rounded-full bg-black/16 px-2.5 py-1.5">
          <Octicons name="eye" size={12} color="rgba(255,255,255,0.84)" />
          <Text className="ml-1 text-xs font-black text-white/86">{views}</Text>
        </View>
        <View className="flex-row items-center rounded-full bg-black/16 px-2.5 py-1.5">
          <Octicons name="comment" size={12} color="rgba(255,255,255,0.84)" />
          <Text className="ml-1 text-xs font-black text-white/86">{comments}</Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ArticleCard — thin wrapper around GradientContentCard
// ---------------------------------------------------------------------------
const ArticleCard = memo(({ post, onPress }: ArticleCardProps) => {
  const { t } = useI18n();
  const dateStr = post.publishedAt ? formatDate(post.publishedAt) : t("post.recent");

  return (
    <GradientContentCard
      variant="feed"
      title={post.title}
      excerpt={post.excerpt}
      coverImageUrl={post.coverImageUrl}
      tags={post.tags}
      gradientSeed={post.slug || post.title}
      badgeLabel={dateStr}
      footer={<ArticleCardFooter post={post} />}
      onPress={onPress}
      accessibilityHint={t("home.articleHint")}
    />
  );
});

ArticleCard.displayName = "ArticleCard";

export default ArticleCard;
