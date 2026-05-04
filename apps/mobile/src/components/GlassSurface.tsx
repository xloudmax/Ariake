import React, { type ReactNode, useEffect, useState } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { BlurView, type BlurTint } from "expo-blur";
import {
  GlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
  type GlassColorScheme as NativeGlassColorScheme,
} from "expo-glass-effect";

import { cssInterop } from "nativewind";

// ---------------------------------------------------------------------------
// Register Liquid Glass primitives with NativeWind so className works correctly.
// ---------------------------------------------------------------------------
cssInterop(GlassContainer, { className: "style" });
cssInterop(GlassView, { className: "style" });

// ---------------------------------------------------------------------------
// Runtime detection — cached once per session. `isGlassEffectAPIAvailable()`
// returns `true` only on iOS 26+ builds compiled with the Liquid Glass module.
// ---------------------------------------------------------------------------
let _liquidGlassSupported: boolean | null = null;
function canUseLiquidGlass(): boolean {
  if (_liquidGlassSupported === null) {
    try {
      _liquidGlassSupported = Platform.OS === "ios" && isGlassEffectAPIAvailable();
    } catch {
      _liquidGlassSupported = false;
    }
  }
  return _liquidGlassSupported;
}

type GlassColorScheme = "auto" | "dark" | "light";
type GlassStyle = "clear" | "regular";

type GlassSurfaceProps = {
  children?: ReactNode;
  className?: string;
  colorScheme?: GlassColorScheme;
  fallbackColor?: string;
  fallbackTint?: BlurTint;
  glassStyle?: GlassStyle;
  intensity?: number;
  interactive?: boolean;
  reduceTransparency?: boolean;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
};

// ---------------------------------------------------------------------------
// Component — 3-tier cascade:
//   1. iOS 26+ dev build  → GlassView (native Liquid Glass)
//   2. iOS < 26           → BlurView  (expo-blur)
//   3. Android / fallback → View      (semi-transparent bg)
// ---------------------------------------------------------------------------
export function GlassSurface({
  children,
  className,
  colorScheme = "auto",
  fallbackColor = "rgba(255,255,255,0.72)",
  fallbackTint = "systemChromeMaterial",
  glassStyle = "regular",
  intensity = 78,
  interactive = false,
  reduceTransparency = false,
  style,
  tintColor,
}: GlassSurfaceProps) {
  if (!reduceTransparency && canUseLiquidGlass()) {
    return (
      <GlassView
        className={className}
        colorScheme={colorScheme as NativeGlassColorScheme}
        glassEffectStyle={glassStyle}
        isInteractive={interactive}
        style={[styles.liquidGlass, style]}
        {...(tintColor ? { tintColor } : {})}
      >
        {children}
      </GlassView>
    );
  }

  if (!reduceTransparency && Platform.OS === "ios") {
    return (
      <BlurView
        className={className}
        intensity={intensity}
        style={[styles.blurFallback, { backgroundColor: fallbackColor }, style]}
        tint={fallbackTint}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      className={className}
      style={[styles.androidSurface, { backgroundColor: fallbackColor }, style]}
    >
      {children}
    </View>
  );
}

type GlassGroupProps = {
  children?: ReactNode;
  className?: string;
  reduceTransparency?: boolean;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
} & Pick<ViewProps, "pointerEvents">;

export function GlassGroup({
  children,
  className,
  pointerEvents,
  reduceTransparency = false,
  spacing = 28,
  style,
}: GlassGroupProps) {
  if (!reduceTransparency && canUseLiquidGlass()) {
    return (
      <GlassContainer
        className={className}
        pointerEvents={pointerEvents}
        spacing={spacing}
        style={style}
      >
        {children}
      </GlassContainer>
    );
  }

  return (
    <View className={className} pointerEvents={pointerEvents} style={style}>
      {children}
    </View>
  );
}

export function useReduceTransparency() {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
      if (mounted) setReduceTransparency(enabled);
    }).catch(() => {});

    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduceTransparency,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceTransparency;
}

const styles = StyleSheet.create({
  androidSurface: {
    shadowColor: "#000",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
  },
  blurFallback: {
    overflow: "hidden",
  },
  liquidGlass: {
    overflow: "hidden",
  },
});
