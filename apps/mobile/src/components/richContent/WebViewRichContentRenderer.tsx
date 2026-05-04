import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";

import {
  buildRichContentHtml,
  getInlineRichAssets,
  loadInlineRichAssets,
  parseRichContentMessage,
} from "./richContent";
import type { RichContentRendererComponentProps } from "./richContentRendererTypes";
import { useI18n } from "../../i18n/I18nProvider";

type PreviewImage = {
  src: string;
  alt?: string;
};

const MIN_WEBVIEW_HEIGHT = 120;
const MAX_WEBVIEW_HEIGHT = 20000;

export function WebViewRichContentRenderer({
  content,
  features,
  onHeightChange,
  theme,
}: RichContentRendererComponentProps) {
  const { t } = useI18n();
  const [height, setHeight] = useState(MIN_WEBVIEW_HEIGHT);
  const [inlineAssets, setInlineAssets] = useState(() => getInlineRichAssets());
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);

  useEffect(() => {
    if (inlineAssets) return;
    let mounted = true;
    loadInlineRichAssets().then((assets) => {
      if (mounted) setInlineAssets(assets);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, [inlineAssets]);

  const html = useMemo(
    () => buildRichContentHtml({ content, theme, features, inlineAssets }),
    [content, theme, features, inlineAssets],
  );

  const openUrl = useCallback((url: string) => {
    Linking.openURL(url).catch((error) => {
      console.warn("Failed to open rich content URL:", error);
    });
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try { const data = JSON.parse(event.nativeEvent.data); if (data.type === "error") { console.error("WEBVIEW ERROR:", data.msg, data.line); return; } } catch (e) {}
      const message = parseRichContentMessage(event.nativeEvent.data);
      if (!message) return;

      if (message.type === "height") {
        const nextHeight = Math.min(Math.max(message.height, MIN_WEBVIEW_HEIGHT), MAX_WEBVIEW_HEIGHT);
        setHeight(nextHeight);
        onHeightChange?.(nextHeight);
        return;
      }

      if (message.type === "link") {
        openUrl(message.href);
        return;
      }

      setPreviewImage({ src: message.src, alt: message.alt });
    },
    [onHeightChange, openUrl],
  );

  return (
    <View style={styles.container}>
      <WebView
        automaticallyAdjustContentInsets={false}
        domStorageEnabled={false}
        javaScriptEnabled
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url;
          if (!url || url === "about:blank" || url.startsWith("data:text/html")) {
            return true;
          }

          if (request.navigationType === "click") {
            openUrl(url);
            return false;
          }

          return true;
        }}
        containerStyle={[styles.webViewContainer, { height }]}
        originWhitelist={["*"]}
        nestedScrollEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        source={{ html }}
        style={[styles.webView, { height }]}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
        presentationStyle="overFullScreen"
        transparent
        visible={previewImage !== null}
      >
        <View style={styles.previewBackdrop}>
          <Pressable
            accessibilityLabel={t("common.close")}
            accessibilityRole="button"
            onPress={() => setPreviewImage(null)}
            style={styles.previewCloseButton}
          >
            <Text style={styles.previewCloseText}>{t("common.close")}</Text>
          </Pressable>

          <ScrollView
            centerContent
            contentContainerStyle={styles.previewContent}
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {previewImage ? (
              <Image
                contentFit="contain"
                source={{ uri: previewImage.src }}
                style={styles.previewImage}
                transition={160}
              />
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  webViewContainer: {
    flex: 0,
    width: "100%",
  },
  previewBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.96)",
    flex: 1,
  },
  previewCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    position: "absolute",
    right: 18,
    top: 56,
    zIndex: 2,
  },
  previewCloseText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  previewContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    padding: 12,
  },
  previewImage: {
    height: "100%",
    width: "100%",
  },
  webView: {
    backgroundColor: "transparent",
    flex: 0,
    opacity: 0.99,
    width: "100%",
  },
});
