import { Octicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { useI18n } from "../i18n/I18nProvider";

type EditorModeSwitchProps = {
  value: "edit" | "preview";
  onChange: (value: "edit" | "preview") => void;
};

export function EditorModeSwitch({ value, onChange }: EditorModeSwitchProps) {
  const { t } = useI18n();

  return (
    <View className="mb-3 flex-row rounded-full bg-slate-100 p-1 dark:bg-slate-900">
      {(["edit", "preview"] as const).map((view) => {
        const selected = value === view;
        return (
          <TouchableOpacity
            key={view}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`flex-1 flex-row items-center justify-center rounded-full px-4 py-2 ${selected ? "bg-white shadow-sm dark:bg-slate-800" : ""}`}
            onPress={() => onChange(view)}
          >
            <Octicons
              name={view === "edit" ? "pencil" : "eye"}
              size={13}
              color={selected ? "#2563eb" : "#64748b"}
              style={{ marginRight: 6 }}
            />
            <Text className={`text-center text-xs font-black ${selected ? "text-blue-600 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}`}>
              {view === "edit" ? t("create.editMode") : t("create.previewMode")}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
