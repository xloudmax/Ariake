import { Octicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { useI18n } from "../i18n/I18nProvider";

type DraftStatusPillProps = {
  dirty: boolean;
  status: "idle" | "saved" | "saving";
};

export function DraftStatusPill({ dirty, status }: DraftStatusPillProps) {
  const { t } = useI18n();
  const isSaving = status === "saving";
  const isSaved = status === "saved" || !dirty;
  const label = isSaving
    ? t("create.savingDraft")
    : status === "saved"
      ? t("create.draftSaved")
      : dirty
        ? t("create.unsaved")
        : t("create.saved");

  return (
    <View className="flex-row items-center rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-900">
      <View className={`mr-2 h-2 w-2 rounded-full ${isSaving ? "bg-blue-500" : isSaved ? "bg-emerald-500" : "bg-amber-500"}`} />
      <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}

type EditorActionBarProps = {
  canEditPostActions: boolean;
  disabled: boolean;
  onArchive: () => void;
  onDelete: () => void;
  onSaveDraft: () => void;
};

export function EditorActionBar({ canEditPostActions, disabled, onArchive, onDelete, onSaveDraft }: EditorActionBarProps) {
  const { t } = useI18n();

  return (
    <View className="flex-row items-center gap-2">
      {canEditPostActions ? (
        <TouchableOpacity
          className="flex-row items-center rounded-full border border-slate-200 px-3 py-1 dark:border-slate-700"
          disabled={disabled}
          onPress={onArchive}
        >
          <Octicons name="archive" size={12} color={disabled ? "#94a3b8" : "#64748b"} style={{ marginRight: 5 }} />
          <Text className={`text-xs font-black ${disabled ? "text-slate-400" : "text-slate-600 dark:text-slate-300"}`}>
            {t("create.archivePost")}
          </Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        className="flex-row items-center rounded-full border border-blue-200 px-3 py-1 dark:border-blue-900"
        disabled={disabled}
        onPress={onSaveDraft}
      >
        <Octicons name="download" size={12} color={disabled ? "#94a3b8" : "#2563eb"} style={{ marginRight: 5 }} />
        <Text className={`text-xs font-black ${disabled ? "text-slate-400" : "text-blue-600 dark:text-blue-300"}`}>
          {t("create.saveDraft")}
        </Text>
      </TouchableOpacity>
      {canEditPostActions ? (
        <TouchableOpacity
          className="flex-row items-center rounded-full border border-red-200 px-3 py-1 dark:border-red-900"
          disabled={disabled}
          onPress={onDelete}
        >
          <Octicons name="trash" size={12} color={disabled ? "#94a3b8" : "#dc2626"} style={{ marginRight: 5 }} />
          <Text className={`text-xs font-black ${disabled ? "text-slate-400" : "text-red-600 dark:text-red-300"}`}>
            {t("common.delete")}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
