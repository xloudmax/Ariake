import { Image, Text, View } from "react-native";

import { RichContentRenderer } from "../components/richContent/RichContentRenderer";
import { useI18n } from "../i18n/I18nProvider";
import type { EditorState } from "./editorState";

type EditorPreviewProps = {
  coverImageUrl?: null | string;
  state: EditorState;
  theme: "dark" | "light";
};

export function EditorPreview({ coverImageUrl, state, theme }: EditorPreviewProps) {
  const { t } = useI18n();

  return (
    <View className="rounded-[24px] bg-white px-4 py-5 dark:bg-slate-900/70">
      <Text className="mb-3 text-xs font-black uppercase tracking-[1.4px] text-blue-600 dark:text-blue-300">
        {t("create.previewMode")}
      </Text>
      <Text className="mb-4 text-3xl font-black leading-10 text-slate-950 dark:text-slate-50">
        {state.title.trim() || t("create.postTitlePlaceholder")}
      </Text>
      {state.excerpt ? (
        <Text className="mb-5 text-base leading-6 text-slate-500 dark:text-slate-400">
          {state.excerpt}
        </Text>
      ) : null}
      {coverImageUrl ? (
        <Image
          source={{ uri: coverImageUrl }}
          className="mb-5 h-44 w-full rounded-[24px] bg-slate-100 dark:bg-slate-800"
          resizeMode="cover"
        />
      ) : null}
      {state.tags.length > 0 ? (
        <View className="mb-5 flex-row flex-wrap gap-2">
          {state.tags.map((tag) => (
            <View key={tag} className="rounded-full bg-blue-50 px-3 py-1.5 dark:bg-blue-950/40">
              <Text className="text-xs font-black text-blue-600 dark:text-blue-300">#{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <RichContentRenderer content={state.content || `*${t("post.noContent")}*`} theme={theme} />
    </View>
  );
}
