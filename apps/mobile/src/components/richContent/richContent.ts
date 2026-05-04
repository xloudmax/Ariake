import {
  type RichContentFeatures,
  type RichContentTheme,
  type RichContentRendererKind,
  type RichContentMessage,
  type InlineRichAssets,
  detectMobileRichContent,
  selectRichContentRenderer,
  parseRichContentMessage,
  buildRichContentHtml,
} from "@c404/shared";

export {
  type RichContentFeatures,
  type RichContentTheme,
  type RichContentRendererKind,
  type RichContentMessage,
  detectMobileRichContent,
  selectRichContentRenderer,
  parseRichContentMessage,
  buildRichContentHtml,
};

const KATEX_FONT_FILES = [
  "KaTeX_AMS-Regular.woff2",
  "KaTeX_Caligraphic-Bold.woff2",
  "KaTeX_Caligraphic-Regular.woff2",
  "KaTeX_Fraktur-Bold.woff2",
  "KaTeX_Fraktur-Regular.woff2",
  "KaTeX_Main-Bold.woff2",
  "KaTeX_Main-BoldItalic.woff2",
  "KaTeX_Main-Italic.woff2",
  "KaTeX_Main-Regular.woff2",
  "KaTeX_Math-BoldItalic.woff2",
  "KaTeX_Math-Italic.woff2",
  "KaTeX_SansSerif-Bold.woff2",
  "KaTeX_SansSerif-Italic.woff2",
  "KaTeX_SansSerif-Regular.woff2",
  "KaTeX_Script-Regular.woff2",
  "KaTeX_Size1-Regular.woff2",
  "KaTeX_Size2-Regular.woff2",
  "KaTeX_Size3-Regular.woff2",
  "KaTeX_Size4-Regular.woff2",
  "KaTeX_Typewriter-Regular.woff2",
];

let inlineAssetsCache: InlineRichAssets | null = null;
let inlineAssetsPromise: Promise<InlineRichAssets | null> | null = null;

export function getInlineRichAssets(): InlineRichAssets | null {
  return inlineAssetsCache;
}

export async function loadInlineRichAssets(): Promise<InlineRichAssets | null> {
  if (inlineAssetsCache) return inlineAssetsCache;
  if (inlineAssetsPromise) return inlineAssetsPromise;

  inlineAssetsPromise = (async () => {
    try {
      const { Asset } = await import("expo-asset");
      const { File } = await import("expo-file-system");

      const readUtf8 = async (mod: number) => {
        const asset = Asset.fromModule(mod);
        if (!asset.downloaded) await asset.downloadAsync();
        if (!asset.localUri) throw new Error("Asset has no localUri after download");
        return new File(asset.localUri).text();
      };

      const readBase64 = async (mod: number) => {
        const asset = Asset.fromModule(mod);
        if (!asset.downloaded) await asset.downloadAsync();
        if (!asset.localUri) throw new Error("Asset has no localUri after download");
        return new File(asset.localUri).base64();
      };

      const fontModules: Record<string, number> = {
        "KaTeX_AMS-Regular.woff2": require("../../../assets/vendor/fonts/KaTeX_AMS-Regular.woff2.txt"),
        "KaTeX_Caligraphic-Bold.woff2": require("../../../assets/vendor/fonts/KaTeX_Caligraphic-Bold.woff2.txt"),
        "KaTeX_Caligraphic-Regular.woff2": require("../../../assets/vendor/fonts/KaTeX_Caligraphic-Regular.woff2.txt"),
        "KaTeX_Fraktur-Bold.woff2": require("../../../assets/vendor/fonts/KaTeX_Fraktur-Bold.woff2.txt"),
        "KaTeX_Fraktur-Regular.woff2": require("../../../assets/vendor/fonts/KaTeX_Fraktur-Regular.woff2.txt"),
        "KaTeX_Main-Bold.woff2": require("../../../assets/vendor/fonts/KaTeX_Main-Bold.woff2.txt"),
        "KaTeX_Main-BoldItalic.woff2": require("../../../assets/vendor/fonts/KaTeX_Main-BoldItalic.woff2.txt"),
        "KaTeX_Main-Italic.woff2": require("../../../assets/vendor/fonts/KaTeX_Main-Italic.woff2.txt"),
        "KaTeX_Main-Regular.woff2": require("../../../assets/vendor/fonts/KaTeX_Main-Regular.woff2.txt"),
        "KaTeX_Math-BoldItalic.woff2": require("../../../assets/vendor/fonts/KaTeX_Math-BoldItalic.woff2.txt"),
        "KaTeX_Math-Italic.woff2": require("../../../assets/vendor/fonts/KaTeX_Math-Italic.woff2.txt"),
        "KaTeX_SansSerif-Bold.woff2": require("../../../assets/vendor/fonts/KaTeX_SansSerif-Bold.woff2.txt"),
        "KaTeX_SansSerif-Italic.woff2": require("../../../assets/vendor/fonts/KaTeX_SansSerif-Italic.woff2.txt"),
        "KaTeX_SansSerif-Regular.woff2": require("../../../assets/vendor/fonts/KaTeX_SansSerif-Regular.woff2.txt"),
        "KaTeX_Script-Regular.woff2": require("../../../assets/vendor/fonts/KaTeX_Script-Regular.woff2.txt"),
        "KaTeX_Size1-Regular.woff2": require("../../../assets/vendor/fonts/KaTeX_Size1-Regular.woff2.txt"),
        "KaTeX_Size2-Regular.woff2": require("../../../assets/vendor/fonts/KaTeX_Size2-Regular.woff2.txt"),
        "KaTeX_Size3-Regular.woff2": require("../../../assets/vendor/fonts/KaTeX_Size3-Regular.woff2.txt"),
        "KaTeX_Size4-Regular.woff2": require("../../../assets/vendor/fonts/KaTeX_Size4-Regular.woff2.txt"),
        "KaTeX_Typewriter-Regular.woff2": require("../../../assets/vendor/fonts/KaTeX_Typewriter-Regular.woff2.txt"),
      };

      const [katexCssRaw, katexJs, katexAutoRenderJs, markdownItJs, ...fontBase64s] = await Promise.all([
        readUtf8(require("../../../assets/vendor/katex.min.css.txt")),
        readUtf8(require("../../../assets/vendor/katex.min.txt")),
        readUtf8(require("../../../assets/vendor/katex-auto-render.min.txt")),
        readUtf8(require("../../../assets/vendor/markdown-it.min.txt")),
        ...KATEX_FONT_FILES.map((name) => readBase64(fontModules[name])),
      ]);

      let katexCss = katexCssRaw;
      KATEX_FONT_FILES.forEach((name, index) => {
        const dataUri = `data:font/woff2;base64,${fontBase64s[index]}`;
        katexCss = katexCss.split(`fonts/${name}`).join(dataUri);
      });

      inlineAssetsCache = {
        katexCss,
        katexJs,
        katexAutoRenderJs,
        markdownItJs,
      };
      return inlineAssetsCache;
    } catch (error) {
      console.warn("Failed to load inline rich content assets:", error);
      return null;
    } finally {
      inlineAssetsPromise = null;
    }
  })();

  return inlineAssetsPromise;
}
