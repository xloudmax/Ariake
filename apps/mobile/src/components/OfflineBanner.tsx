import React from "react";
import { View, Text } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOnlineStatus } from "../utils/useOnlineStatus";
import { useI18n } from "../i18n/I18nProvider";

// Sits above the rest of the UI while offline. Reanimated entry/exit keep it
// from popping. Tap-through ignored — passive feedback only.
export function OfflineBanner() {
  const online = useOnlineStatus();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  if (online) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      pointerEvents="none"
      style={{
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
        zIndex: 50,
      }}
    >
      <View
        style={{
          backgroundColor: "rgba(15, 23, 42, 0.94)",
          paddingBottom: 8,
          paddingHorizontal: 16,
          paddingTop: insets.top + 6,
        }}
      >
        <Text
          accessibilityLiveRegion="polite"
          style={{
            color: "#f8fafc",
            fontSize: 13,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {t("common.offline")}
        </Text>
      </View>
    </Animated.View>
  );
}
