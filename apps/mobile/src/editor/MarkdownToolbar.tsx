import { Octicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { useI18n } from "../i18n/I18nProvider";
import type { MarkdownAction } from "./editorState";

type MarkdownToolbarAction = {
  icon: keyof typeof Octicons.glyphMap;
  kind: MarkdownAction;
  label: string;
};

type MarkdownToolbarProps = {
  actions: MarkdownToolbarAction[];
  onAction: (kind: MarkdownAction) => void;
};

export function MarkdownToolbar({ actions, onAction }: MarkdownToolbarProps) {
  const { t } = useI18n();

  return (
    <View className="mb-3 rounded-[24px] bg-slate-100 p-2 dark:bg-slate-900">
      <View className="mb-2 flex-row items-center justify-between px-1">
        <Text className="text-xs font-black uppercase tracking-[1.2px] text-slate-400">
          {t("create.markdownToolbar")}
        </Text>
      </View>
      <View className="flex-row items-center">
        {actions.map((action) => (
          <TouchableOpacity
            key={action.kind}
            accessibilityLabel={action.label}
            accessibilityRole="button"
            className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800"
            onPress={() => onAction(action.kind)}
          >
            <Octicons name={action.icon} size={15} color="#2563eb" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
