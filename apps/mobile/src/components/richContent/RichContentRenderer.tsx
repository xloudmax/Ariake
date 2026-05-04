import React, { useMemo } from "react";
import { useColorScheme } from "react-native";

import { defaultRichContentRenderers } from "./defaultRichContentRenderers";
import {
  detectMobileRichContent,
  selectRichContentRenderer,
  type RichContentTheme,
} from "./richContent";
import type { RichContentRendererRegistry } from "./richContentRendererTypes";

type RichContentRendererProps = {
  content: string;
  onHeightChange?: (height: number) => void;
  renderers?: Partial<RichContentRendererRegistry>;
  theme?: RichContentTheme;
};

export function RichContentRenderer({
  content,
  onHeightChange,
  renderers,
  theme = "system",
}: RichContentRendererProps) {
  const colorScheme = useColorScheme();
  const resolvedTheme: Exclude<RichContentTheme, "system"> =
    theme === "system" ? (colorScheme === "dark" ? "dark" : "light") : theme;

  const features = useMemo(() => detectMobileRichContent(content), [content]);
  const rendererKind = selectRichContentRenderer(features);
  const rendererRegistry = renderers
    ? { ...defaultRichContentRenderers, ...renderers }
    : defaultRichContentRenderers;
  const SelectedRenderer = rendererRegistry[rendererKind];

  return (
    <SelectedRenderer
      content={content}
      features={features}
      onHeightChange={onHeightChange}
      theme={resolvedTheme}
    />
  );
}
