import { Octicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { formatDate } from "../i18n";
import { useI18n } from "../i18n/I18nProvider";
import type { BlogPostVersionFragment } from "../generated/graphql";

type VersionHistoryPanelProps = {
  loading: boolean;
  onSelectVersion: (version: BlogPostVersionFragment) => void;
  versions: BlogPostVersionFragment[];
};

export function VersionHistoryPanel({ loading, onSelectVersion, versions }: VersionHistoryPanelProps) {
  const { locale, t } = useI18n();

  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-black text-slate-700 dark:text-slate-200">{t("create.versionHistory")}</Text>
        {loading ? <ActivityIndicator size="small" color="#2563eb" /> : null}
      </View>
      <View className="gap-2">
        {versions.slice(0, 4).map((version) => (
          <TouchableOpacity
            key={version.id}
            accessibilityRole="button"
            className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60"
            onPress={() => onSelectVersion(version)}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Octicons name="history" size={13} color="#2563eb" style={{ marginRight: 6 }} />
                <Text className="text-xs font-black text-slate-700 dark:text-slate-200">
                  {t("create.versionNumber", { version: version.versionNum })}
                </Text>
              </View>
              <Text className="text-[11px] font-bold text-slate-400">
                {formatDate(version.createdAt, locale)}
              </Text>
            </View>
            <Text className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400" numberOfLines={1}>
              {version.title}
            </Text>
            <Text className="mt-1 text-[11px] text-slate-400" numberOfLines={1}>
              {version.changeLog || t("create.noChangeLog")}
            </Text>
          </TouchableOpacity>
        ))}
        {!loading && versions.length === 0 ? (
          <Text className="text-xs text-slate-400">{t("create.noVersions")}</Text>
        ) : null}
      </View>
    </View>
  );
}
