import React, { useEffect } from "react";
import { View, useColorScheme, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";

const COMPACT_WIDTH_RATIO = 0.78;
const COMPACT_WIDTH_MAX = 360;
const COMPACT_WIDTH_MIN = 260;

type SkeletonCardVariant = "feed" | "compact";

const VARIANT_DIMS = {
  feed: { height: 230, radius: 32, marginBottom: 20, width: undefined as number | undefined },
  compact: { height: 240, radius: 28, marginRight: 12, width: 0 as number },
} as const;

// Reanimated shimmer overlay shared across all skeleton blocks rendered in the
// same render pass. Two-phase opacity loop avoids the "translate stripe" trick
// that doesn't compose with Tailwind sizing.
function useShimmerStyle() {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [phase]);
  return useAnimatedStyle(() => ({ opacity: 0.55 + phase.value * 0.35 }));
}

function Block({ height, width, radius = 8, mt = 0, mb = 0, alpha }: { height: number; width: number | string; radius?: number; mt?: number; mb?: number; alpha: ReturnType<typeof useShimmerStyle> }) {
  return (
    <Animated.View
      style={[
        {
          backgroundColor: "rgba(255,255,255,0.22)",
          borderRadius: radius,
          height,
          marginBottom: mb,
          marginTop: mt,
          width: width as number,
        },
        alpha,
      ]}
    />
  );
}

export function SkeletonCard({ variant }: { variant: SkeletonCardVariant }) {
  const cfg = VARIANT_DIMS[variant];
  const { width: screenWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const shimmer = useShimmerStyle();

  const compactWidth = Math.min(
    Math.max(screenWidth * COMPACT_WIDTH_RATIO, COMPACT_WIDTH_MIN),
    COMPACT_WIDTH_MAX,
  );
  const baseBg = colorScheme === "dark" ? "#1f2937" : "#cbd5e1";

  const containerStyle = variant === "compact"
    ? { borderRadius: cfg.radius, height: cfg.height, marginRight: 12, overflow: "hidden" as const, width: compactWidth }
    : { borderRadius: cfg.radius, height: cfg.height, marginBottom: 20, overflow: "hidden" as const, width: "100%" as const };

  return (
    <View style={containerStyle}>
      <Animated.View style={[{ backgroundColor: baseBg, flex: 1, padding: variant === "compact" ? 16 : 20 }, shimmer]}>
        <Block height={20} width="40%" alpha={shimmer} />
        <Block height={variant === "compact" ? 22 : 28} width="86%" mt={16} alpha={shimmer} />
        <Block height={variant === "compact" ? 22 : 28} width="62%" mt={6} alpha={shimmer} />
        {variant === "feed" ? (
          <>
            <Block height={14} width="92%" mt={14} alpha={shimmer} />
            <Block height={14} width="78%" mt={6} alpha={shimmer} />
          </>
        ) : (
          <Block height={12} width="70%" mt={10} alpha={shimmer} />
        )}
        <View style={{ flex: 1 }} />
        <Block height={variant === "compact" ? 36 : 48} width="100%" radius={variant === "compact" ? 22 : 24} alpha={shimmer} />
      </Animated.View>
    </View>
  );
}

export function SkeletonFeed({ count = 4 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant="feed" />
      ))}
    </View>
  );
}

export function SkeletonCompactRow({ count = 3 }: { count?: number }) {
  return (
    <View style={{ flexDirection: "row", paddingHorizontal: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant="compact" />
      ))}
    </View>
  );
}
