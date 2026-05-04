import React from "react";
import { StyleSheet, View } from "react-native";

import { NativeMarkdownRenderer } from "./NativeMarkdownRenderer";
import type { RichContentRendererComponentProps } from "./richContentRendererTypes";

export function NativeRichContentRenderer({
  content,
  theme,
}: RichContentRendererComponentProps) {
  return (
    <View style={styles.container}>
      <NativeMarkdownRenderer content={content} theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
