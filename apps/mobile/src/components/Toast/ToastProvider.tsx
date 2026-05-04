import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { SlideInDown, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export type ToastVariant = "success" | "error" | "info";

type ToastAction = {
  label: string;
  onPress: () => void;
};

export type ToastConfig = {
  variant: ToastVariant;
  message: string;
  action?: ToastAction;
  /** Override the auto-dismiss delay. Default 3500ms; 5500ms when an action is present. */
  duration?: number;
};

type ToastContextValue = {
  showToast: (config: ToastConfig) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 3500;
const ACTION_DURATION = 5500;

const VARIANT_TOKENS: Record<ToastVariant, {
  bg: string;
  border: string;
  iconColor: string;
  iconName: keyof typeof Octicons.glyphMap;
  haptic: Haptics.NotificationFeedbackType;
}> = {
  success: {
    bg: "rgba(15, 78, 47, 0.96)",
    border: "rgba(74, 222, 128, 0.32)",
    iconColor: "#86efac",
    iconName: "check-circle-fill",
    haptic: Haptics.NotificationFeedbackType.Success,
  },
  error: {
    bg: "rgba(127, 29, 29, 0.96)",
    border: "rgba(248, 113, 113, 0.36)",
    iconColor: "#fca5a5",
    iconName: "alert-fill",
    haptic: Haptics.NotificationFeedbackType.Error,
  },
  info: {
    bg: "rgba(15, 23, 42, 0.96)",
    border: "rgba(148, 163, 184, 0.30)",
    iconColor: "#cbd5e1",
    iconName: "info",
    haptic: Haptics.NotificationFeedbackType.Warning,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastConfig & { id: number }) | null>(null);
  const idRef = useRef(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearDismissTimer();
    setToast(null);
  }, [clearDismissTimer]);

  const showToast = useCallback((config: ToastConfig) => {
    clearDismissTimer();
    const id = ++idRef.current;
    setToast({ ...config, id });
    Haptics.notificationAsync(VARIANT_TOKENS[config.variant].haptic).catch(() => {});

    const ttl = config.duration ?? (config.action ? ACTION_DURATION : DEFAULT_DURATION);
    dismissTimerRef.current = setTimeout(() => {
      // Only dismiss if this toast is still the current one (avoid clobbering
      // a newer toast that replaced it).
      setToast((current) => (current?.id === id ? null : current));
    }, ttl);
  }, [clearDismissTimer]);

  useEffect(() => () => clearDismissTimer(), [clearDismissTimer]);

  // Wire the module-level dispatcher so non-React code (Apollo errorLink,
  // network monitor) can show toasts without a hook.
  useEffect(() => {
    registerExternalToastDispatcher(showToast);
    return () => registerExternalToastDispatcher(null);
  }, [showToast]);

  const value = useMemo<ToastContextValue>(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport
        toast={toast}
        onAction={(action) => {
          action.onPress();
          hideToast();
        }}
        onDismiss={hideToast}
      />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toast,
  onAction,
  onDismiss,
}: {
  toast: (ToastConfig & { id: number }) | null;
  onAction: (action: ToastAction) => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();

  if (!toast) return null;

  const tokens = VARIANT_TOKENS[toast.variant];

  return (
    <Animated.View
      key={toast.id}
      entering={SlideInDown.springify().damping(18).stiffness(220)}
      exiting={SlideOutUp.duration(180)}
      pointerEvents="box-none"
      style={{
        left: 0,
        position: "absolute",
        right: 0,
        top: insets.top + 8,
        zIndex: 100,
      }}
    >
      <View style={{ paddingHorizontal: 16 }}>
        <Pressable
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          onPress={onDismiss}
          style={{
            backgroundColor: tokens.bg,
            borderColor: tokens.border,
            borderRadius: 18,
            borderWidth: 1,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingVertical: 12,
            shadowColor: "#000",
            shadowOffset: { height: 8, width: 0 },
            shadowOpacity: 0.22,
            shadowRadius: 16,
          }}
        >
          <Octicons name={tokens.iconName} size={18} color={tokens.iconColor} />
          <Text
            numberOfLines={3}
            style={{
              color: "#f8fafc",
              flex: 1,
              fontSize: 14,
              fontWeight: "600",
              lineHeight: 19,
              marginLeft: 10,
            }}
          >
            {toast.message}
          </Text>
          {toast.action ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onAction(toast.action!)}
              style={{
                backgroundColor: "rgba(255,255,255,0.16)",
                borderRadius: 999,
                marginLeft: 10,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text numberOfLines={1} style={{ color: "#f8fafc", fontSize: 13, fontWeight: "800" }}>
                {toast.action.label}
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </View>
    </Animated.View>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// Module-level escape hatch so non-React code (Apollo errorLink, network
// monitor, etc.) can post toasts without a hook. The provider registers itself
// on mount.
let externalDispatcher: ((config: ToastConfig) => void) | null = null;

export function registerExternalToastDispatcher(dispatch: ((config: ToastConfig) => void) | null) {
  externalDispatcher = dispatch;
}

export function showToastExternal(config: ToastConfig) {
  externalDispatcher?.(config);
}
