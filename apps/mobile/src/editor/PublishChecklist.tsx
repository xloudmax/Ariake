import { Octicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { getPublishChecklist, type EditorState } from "./editorState";
import { useI18n } from "../i18n/I18nProvider";

type PublishChecklistProps = {
  state: EditorState;
};

export function PublishChecklist({ state }: PublishChecklistProps) {
  const { t } = useI18n();
  const checklist = getPublishChecklist(state);

  return (
    <View className="mt-4 gap-2">
      <Text className="text-xs font-black uppercase tracking-[1.2px] text-blue-600 dark:text-blue-300">
        {t("create.publishChecklist")}
      </Text>
      {checklist.map((item) => (
        <View key={item.key} className="flex-row items-center justify-between rounded-2xl bg-white px-3 py-2 dark:bg-slate-900">
          <View className="flex-row items-center">
            <Octicons name={item.complete ? "check-circle-fill" : "circle"} size={15} color={item.complete ? "#10b981" : "#94a3b8"} />
            <Text className="ml-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              {t(`create.checklist${item.key}`)}
            </Text>
          </View>
          <Text className={`text-[11px] font-black ${item.required ? "text-blue-600 dark:text-blue-300" : "text-slate-400"}`}>
            {item.required ? t("create.required") : t("create.recommended")}
          </Text>
        </View>
      ))}
    </View>
  );
}
