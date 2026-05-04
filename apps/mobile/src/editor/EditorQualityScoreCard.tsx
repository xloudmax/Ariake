import { Octicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { getEditorQualityScore, type EditorState } from "./editorState";
import { useI18n } from "../i18n/I18nProvider";

type EditorQualityScoreCardProps = {
  state: EditorState;
};

export function EditorQualityScoreCard({ state }: EditorQualityScoreCardProps) {
  const { t } = useI18n();
  const quality = getEditorQualityScore(state);
  const scoreColor = quality.score >= 80 ? "#10b981" : quality.score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <View className="mt-4 rounded-[22px] bg-white p-4 dark:bg-slate-900">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-black uppercase tracking-[1.2px] text-slate-400">
            {t("create.qualityScore")}
          </Text>
          <Text className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
            {t("create.qualityScoreDescription")}
          </Text>
        </View>
        <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${scoreColor}22` }}>
          <Text className="text-lg font-black" style={{ color: scoreColor }}>{quality.score}</Text>
        </View>
      </View>

      <View className="mt-3 gap-2">
        {quality.issues.length === 0 ? (
          <View className="flex-row items-center rounded-2xl bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
            <Octicons name="check-circle-fill" size={15} color="#10b981" />
            <Text className="ml-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {t("create.qualityAllGood")}
            </Text>
          </View>
        ) : quality.issues.map((issue) => (
          <View key={issue.key} className="flex-row items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/60">
            <View className="flex-1 flex-row items-center pr-3">
              <Octicons name={issue.severity === "required" ? "alert" : "info"} size={15} color={issue.severity === "required" ? "#ef4444" : "#f59e0b"} />
              <Text className="ml-2 flex-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                {t(`create.quality${issue.key}`)}
              </Text>
            </View>
            <Text className={`text-[11px] font-black ${issue.severity === "required" ? "text-red-500" : "text-amber-500"}`}>
              {issue.severity === "required" ? t("create.required") : t("create.recommended")}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
