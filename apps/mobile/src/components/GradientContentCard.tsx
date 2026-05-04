import React, { type ReactNode, memo } from "react";
import { View, Text, Pressable, useWindowDimensions, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { getGradientByString } from "../utils/gradients";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_IN_SPRING = { damping: 15, stiffness: 320 };
const PRESS_OUT_SPRING = { damping: 12, stiffness: 220 };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type GradientContentCardVariant = "feed" | "compact";

export type GradientContentCardProps = {
  /** Visual variant — `feed` (full-width tall) or `compact` (horizontal scroll item). */
  variant: GradientContentCardVariant;
  // Content
  title: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  tags?: string[];
  /** String hashed to select a gradient from the palette. */
  gradientSeed: string;
  /** Label shown on the top-right badge (e.g. date or "Saved"). */
  badgeLabel?: string;
  // Slots
  /** Rendered at the bottom of the card inside a frosted row. */
  footer?: ReactNode;
  // Interaction
  onPress?: () => void;
  /** VoiceOver-friendly description; defaults to the card title. */
  accessibilityLabel?: string;
  /** Describes what activating the card does (e.g. "Opens the article"). */
  accessibilityHint?: string;
};

// ---------------------------------------------------------------------------
// Per-variant tokens
//   - feed:     vertical list item, autosize via minHeight, generous line caps
//   - compact:  horizontal carousel item, FIXED height so all cards in a row
//               align cleanly and the row doesn't get a ragged bottom edge.
//               Line caps tightened so 240px is always enough.
// ---------------------------------------------------------------------------
const VARIANT_CONFIG = {
  feed: {
    borderRadius: 32,
    cardHeight: undefined as number | undefined,
    cardMinHeight: 230,
    coverHeight: 112,
    coverRadius: 24,
    coverWidth: 104,
    excerptLinesWithCover: 2,
    excerptLinesNoCover: 3,
    excerptFontSize: 14,
    footerRadius: 24,
    innerPadding: 20,
    tagFontSize: 11,
    tagTracking: 1.4,
    titleFontSize: 27,
    titleLeading: 32,
    titleMaxLines: 3,
    width: undefined as number | undefined,
  },
  compact: {
    borderRadius: 28,
    cardHeight: 240 as number | undefined,
    cardMinHeight: 240,
    coverHeight: 88,
    coverRadius: 22,
    coverWidth: 80,
    excerptLinesWithCover: 1,
    excerptLinesNoCover: 2,
    excerptFontSize: 13,
    footerRadius: 22,
    innerPadding: 16,
    tagFontSize: 10,
    tagTracking: 1.2,
    titleFontSize: 21,
    titleLeading: 26,
    titleMaxLines: 2,
    width: 288 as number | undefined,
  },
} as const;

// Responsive sizing for the compact carousel item: aim for ~78% of viewport
// width so the next card peeks ~22%, capped to keep iPad layouts sane. Falls
// back to the static `width` token when not in compact mode.
const COMPACT_WIDTH_RATIO = 0.78;
const COMPACT_WIDTH_MAX = 360;
const COMPACT_WIDTH_MIN = 260;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const GradientContentCard = memo(({
  variant,
  title,
  excerpt,
  coverImageUrl,
  tags,
  gradientSeed,
  badgeLabel,
  footer,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: GradientContentCardProps) => {
  const cfg = VARIANT_CONFIG[variant];
  const backgroundGradient = getGradientByString(gradientSeed);
  const primaryTag = tags?.[0] || "C404";
  const hasCover = Boolean(coverImageUrl);
  const { width: screenWidth } = useWindowDimensions();

  const compactWidth = Math.min(
    Math.max(screenWidth * COMPACT_WIDTH_RATIO, COMPACT_WIDTH_MIN),
    COMPACT_WIDTH_MAX,
  );

  const outerStyle: ViewStyle = {
    ...(variant === "compact" ? { marginRight: 12, width: compactWidth } : { marginBottom: 20 }),
  };

  // Press scale runs entirely on the UI thread (no JS bridge per frame).
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = () => { scale.value = withSpring(0.97, PRESS_IN_SPRING); };
  const handlePressOut = () => { scale.value = withSpring(1, PRESS_OUT_SPRING); };

  return (
    <AnimatedPressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className="overflow-hidden shadow-xl shadow-slate-900/12 dark:shadow-black/40"
      style={[outerStyle, { borderRadius: cfg.borderRadius }, pressStyle]}
    >
      <LinearGradient
        colors={backgroundGradient}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{
          height: cfg.cardHeight,
          minHeight: cfg.cardMinHeight,
          overflow: "hidden" as const,
        }}
      >
        {/* Decorative bubbles */}
        <View
          className="absolute bg-white/20"
          style={{
            borderRadius: 9999,
            height: variant === "feed" ? 128 : 112,
            right: -40,
            top: -48,
            width: variant === "feed" ? 128 : 112,
          }}
        />
        <View
          className="absolute bg-black/10"
          style={{
            borderRadius: 9999,
            bottom: -64,
            height: variant === "feed" ? 160 : 144,
            left: -48,
            width: variant === "feed" ? 160 : 144,
          }}
        />

        {/* Readability overlay */}
        <LinearGradient
          colors={["rgba(15,23,42,0.12)", "rgba(15,23,42,0.76)"]}
          style={{ bottom: 0, left: 0, position: "absolute" as const, right: 0, top: 0 }}
        />

        {/* Cover image */}
        {hasCover ? (
          <View
            className="absolute overflow-hidden"
            style={{
              borderRadius: cfg.coverRadius,
              height: cfg.coverHeight,
              right: cfg.innerPadding,
              shadowColor: "#000",
              shadowOffset: { height: 10, width: 0 },
              shadowOpacity: 0.22,
              shadowRadius: 18,
              top: cfg.innerPadding,
              width: cfg.coverWidth,
            }}
          >
            <Image
              cachePolicy="disk"
              contentFit="cover"
              source={{ uri: coverImageUrl! }}
              style={{ height: cfg.coverHeight, width: cfg.coverWidth }}
              transition={180}
            />
            <LinearGradient
              colors={["rgba(15,23,42,0)", "rgba(15,23,42,0.28)"]}
              style={{ bottom: 0, left: 0, position: "absolute" as const, right: 0, top: 0 }}
            />
          </View>
        ) : null}

        {/* Content body */}
        <View className="relative justify-between" style={{ height: cfg.cardHeight, minHeight: cfg.cardMinHeight, padding: cfg.innerPadding }}>
          <View>
            {/* Tag + badge row */}
            <View className="mb-4 flex-row items-center justify-between" style={{ marginBottom: cfg.innerPadding }}>
              <View
                className="flex-row items-center rounded-full bg-white/20 px-3 py-1.5"
                style={{ maxWidth: hasCover ? "58%" : "70%" }}
              >
                <View className="mr-2 h-1.5 w-1.5 rounded-full bg-white" />
                <Text
                  className="font-black uppercase text-white"
                  numberOfLines={1}
                  style={{ fontSize: cfg.tagFontSize, letterSpacing: cfg.tagTracking }}
                >
                  {primaryTag}
                </Text>
              </View>
              {badgeLabel ? (
                <View className="rounded-full bg-black/14 px-3 py-1.5">
                  <Text
                    className="font-bold text-white/82"
                    numberOfLines={1}
                    style={{ fontSize: cfg.tagFontSize }}
                  >
                    {badgeLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Title + excerpt */}
            <View style={hasCover ? { maxWidth: variant === "feed" ? "64%" : "62%", paddingRight: 4 } : { maxWidth: "100%", paddingRight: 4 }}>
              <Text
                className="font-black text-white"
                numberOfLines={cfg.titleMaxLines}
                style={{ fontSize: cfg.titleFontSize, lineHeight: cfg.titleLeading }}
              >
                {title}
              </Text>
              {excerpt ? (
                <Text
                  className="mt-2 font-medium text-white/78"
                  numberOfLines={hasCover ? cfg.excerptLinesWithCover : cfg.excerptLinesNoCover}
                  style={{ fontSize: cfg.excerptFontSize, lineHeight: 20 }}
                >
                  {excerpt}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Footer slot */}
          {footer ? (
            <View
              className="mt-6 overflow-hidden bg-white/18 px-3.5 py-3"
              style={{ borderRadius: cfg.footerRadius }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
});

GradientContentCard.displayName = "GradientContentCard";

export default GradientContentCard;
