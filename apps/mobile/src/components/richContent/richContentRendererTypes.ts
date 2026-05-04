import type { ComponentType } from "react";

import type { RichContentFeatures, RichContentTheme } from "./richContent";

export type ResolvedRichContentTheme = Exclude<RichContentTheme, "system">;

export type RichContentRendererKind = "native" | "webview";

export type RichContentRendererComponentProps = {
  content: string;
  features: RichContentFeatures;
  onHeightChange?: (height: number) => void;
  theme: ResolvedRichContentTheme;
};

export type RichContentRendererRegistry = Record<
  RichContentRendererKind,
  ComponentType<RichContentRendererComponentProps>
>;
