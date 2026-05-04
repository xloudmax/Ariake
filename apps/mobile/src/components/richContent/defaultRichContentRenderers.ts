import { NativeRichContentRenderer } from "./NativeRichContentRenderer";
import { WebViewRichContentRenderer } from "./WebViewRichContentRenderer";
import type { RichContentRendererRegistry } from "./richContentRendererTypes";

export const defaultRichContentRenderers: RichContentRendererRegistry = {
  native: NativeRichContentRenderer,
  webview: WebViewRichContentRenderer,
};
