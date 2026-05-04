import React, { type ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";

import { useI18n } from "../i18n/I18nProvider";

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  right,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
}) {
  return (
    <View className="px-5 pt-4 pb-5 bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          {eyebrow ? (
            <Text className="text-xs font-black uppercase tracking-[2px] text-blue-600 dark:text-blue-300 mb-2">
              {eyebrow}
            </Text>
          ) : null}
          <Text className="text-4xl font-black text-gray-950 dark:text-gray-50 tracking-tight leading-tight">
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-gray-500 dark:text-gray-400 font-medium mt-2 leading-5">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View className="pt-1">{right}</View> : null}
      </View>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View className="mx-5 mt-12 items-center rounded-[28px] border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-8 shadow-sm shadow-black/5">
      {icon ? (
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
          {icon}
        </View>
      ) : null}
      <Text className="text-lg font-extrabold text-gray-900 dark:text-gray-100 text-center">
        {title}
      </Text>
      {description ? (
        <Text className="mt-2 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}

export function RetryButton({ label, onPress }: { label?: string; onPress: () => void }) {
  const { t } = useI18n();
  const defaultLabel = t("common.tryAgain");

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="overflow-hidden rounded-full bg-blue-500 px-5 py-3 shadow-sm shadow-blue-500/20"
    >
      <Text className="text-center text-sm font-extrabold text-white">
        {label || defaultLabel}
      </Text>
    </TouchableOpacity>
  );
}
