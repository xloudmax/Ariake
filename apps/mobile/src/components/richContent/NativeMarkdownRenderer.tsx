import React, { useCallback, useMemo } from "react";
import { Linking, ScrollView, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { parseMarkdownBlocks, parseInline, type MdBlock, type InlineNode } from "@c404/shared";

// Re-export parser types/functions so existing imports keep working
export { parseMarkdownBlocks, parseInline, type MdBlock, type InlineNode };

type NativeMarkdownTheme = {
  background: string;
  blockquoteBg: string;
  blockquoteBorder: string;
  codeBg: string;
  codeColor: string;
  heading: string;
  hrColor: string;
  link: string;
  linkBg: string;
  muted: string;
  tableHeadBg: string;
  text: string;
};

const LIGHT_THEME: NativeMarkdownTheme = {
  background: "#fffaf2",
  blockquoteBg: "#fff4dc",
  blockquoteBorder: "#d99a3d",
  codeBg: "#fff1d6",
  codeColor: "#a83f14",
  heading: "#111827",
  hrColor: "rgba(120, 91, 53, 0.16)",
  link: "#1d4ed8",
  linkBg: "rgba(37, 99, 235, 0.08)",
  muted: "#697586",
  tableHeadBg: "#fff2d4",
  text: "#1f2933",
};

const DARK_THEME: NativeMarkdownTheme = {
  background: "#0b1120",
  blockquoteBg: "#111827",
  blockquoteBorder: "#60a5fa",
  codeBg: "#1f2937",
  codeColor: "#fbbf24",
  heading: "#f8fafc",
  hrColor: "rgba(148, 163, 184, 0.16)",
  link: "#93c5fd",
  linkBg: "rgba(147, 197, 253, 0.12)",
  muted: "#97a6ba",
  tableHeadBg: "#121a2b",
  text: "#d7deea",
};

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
type NativeMarkdownRendererProps = {
  content: string;
  theme?: "light" | "dark";
};

export function NativeMarkdownRenderer({
  content,
  theme = "light",
}: NativeMarkdownRendererProps) {
  const palette = theme === "dark" ? DARK_THEME : LIGHT_THEME;
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  const openUrl = useCallback((url: string) => {
    Linking.openURL(url).catch((err) => {
      console.warn("NativeMarkdownRenderer: failed to open URL:", err);
    });
  }, []);

  const renderInline = useCallback(
    (text: string, baseStyle: TextStyle, key: string) => {
      const nodes = parseInline(text);
      if (nodes.length === 1 && nodes[0].type === "text") {
        return (
          <Text key={key} style={baseStyle}>
            {nodes[0].text}
          </Text>
        );
      }

      return (
        <Text key={key} style={baseStyle}>
          {nodes.map((node, idx) => {
            const nodeKey = `${key}-${idx}`;
            switch (node.type) {
              case "bold":
                return (
                  <Text key={nodeKey} style={{ ...baseStyle, color: palette.heading, fontWeight: "800" }}>
                    {node.text}
                  </Text>
                );
              case "italic":
                return (
                  <Text key={nodeKey} style={{ ...baseStyle, fontStyle: "italic" }}>
                    {node.text}
                  </Text>
                );
              case "code":
                return (
                  <Text
                    key={nodeKey}
                    style={{
                      backgroundColor: palette.codeBg,
                      borderRadius: 6,
                      color: palette.codeColor,
                      fontFamily: "Menlo",
                      fontSize: 14,
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                    }}
                  >
                    {node.text}
                  </Text>
                );
              case "kbd":
                return (
                  <Text
                    key={nodeKey}
                    style={{
                      backgroundColor: palette.codeBg,
                      borderColor: palette.hrColor,
                      borderWidth: 1,
                      borderRadius: 4,
                      color: palette.text,
                      fontFamily: "Menlo",
                      fontSize: 13,
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                    }}
                  >
                    {node.text}
                  </Text>
                );
              case "link":
                return (
                  <Text
                    key={nodeKey}
                    style={{
                      backgroundColor: palette.linkBg,
                      borderRadius: 5,
                      color: palette.link,
                      fontWeight: "600",
                      paddingHorizontal: 3,
                    }}
                    onPress={() => openUrl(node.href)}
                  >
                    {node.text}
                  </Text>
                );
              default:
                return <Text key={nodeKey}>{node.text}</Text>;
            }
          })}
        </Text>
      );
    },
    [palette, openUrl],
  );

  const headingStyle = useCallback(
    (level: number): TextStyle => ({
      color: palette.heading,
      fontWeight: "800",
      letterSpacing: -0.4,
      lineHeight: level <= 2 ? 30 : 24,
      marginBottom: 14,
      marginTop: level === 1 ? 0 : 28,
      ...(level === 1 && { fontSize: 28 }),
      ...(level === 2 && { borderBottomColor: palette.hrColor, borderBottomWidth: 1, fontSize: 24, paddingBottom: 8 }),
      ...(level === 3 && { fontSize: 20 }),
      ...(level >= 4 && { fontSize: 18 }),
    }),
    [palette],
  );

  const paragraphStyle: TextStyle = useMemo(
    () => ({
      color: palette.text,
      fontSize: 17,
      letterSpacing: 0.15,
      lineHeight: 30,
      marginBottom: 18,
    }),
    [palette],
  );

  const blockquoteOuter: ViewStyle = useMemo(
    () => ({
      backgroundColor: palette.blockquoteBg,
      borderLeftColor: palette.blockquoteBorder,
      borderLeftWidth: 4,
      borderRadius: 16,
      marginBottom: 20,
      paddingHorizontal: 16,
      paddingVertical: 14,
    }),
    [palette],
  );

  const tableStyles = useMemo(
    () => ({
      container: {
        borderColor: palette.hrColor,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
        overflow: "hidden" as const,
      },
      row: {
        flexDirection: "row" as const,
      },
      headerCell: {
        backgroundColor: palette.tableHeadBg,
      },
      cell: {
        borderColor: palette.hrColor,
        borderRightWidth: 1,
        borderTopWidth: 1,
        minWidth: 120,
        paddingHorizontal: 12,
        paddingVertical: 10,
      },
      headerText: {
        color: palette.heading,
        fontSize: 14,
        fontWeight: "800" as const,
        lineHeight: 20,
      },
      cellText: {
        color: palette.text,
        fontSize: 14,
        lineHeight: 21,
      },
    }),
    [palette],
  );

  const textAlignFor = useCallback((align: "left" | "center" | "right" | undefined): TextStyle["textAlign"] => {
    if (align === "center") return "center";
    if (align === "right") return "right";
    return "left";
  }, []);

  return (
    <View style={{ width: "100%" }}>
      {blocks.map((block, idx) => {
        const key = `md-${idx}`;
        switch (block.type) {
          case "heading":
            return renderInline(block.text, headingStyle(block.level), key);
          case "paragraph":
            return renderInline(block.text, paragraphStyle, key);
          case "blockquote":
            return (
              <View key={key} style={blockquoteOuter}>
                {renderInline(block.text, { ...paragraphStyle, color: palette.muted, marginBottom: 0 }, `${key}-inner`)}
              </View>
            );
          case "hr":
            return (
              <View
                key={key}
                style={{ backgroundColor: palette.hrColor, height: 1, marginVertical: 28 }}
              />
            );
          case "list":
            return (
              <View key={key} style={{ marginBottom: 18, paddingLeft: 20 }}>
                {block.items.map((item, itemIdx) => (
                  <View key={`${key}-${itemIdx}`} style={{ flexDirection: "row", marginVertical: 5 }}>
                    <Text style={{ color: palette.muted, fontSize: 17, lineHeight: 30, width: 24 }}>
                      {block.ordered ? `${itemIdx + 1}.` : "•"}
                    </Text>
                    {renderInline(item, { ...paragraphStyle, flex: 1, marginBottom: 0 }, `${key}-${itemIdx}-text`)}
                  </View>
                ))}
              </View>
            );
          case "table":
            return (
              <ScrollView
                key={key}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={tableStyles.container}
              >
                <View>
                  <View style={tableStyles.row}>
                    {block.headers.map((header, cellIdx) => (
                      <View
                        key={`${key}-header-${cellIdx}`}
                        style={[
                          tableStyles.cell,
                          tableStyles.headerCell,
                          { borderTopWidth: 0 },
                          cellIdx === block.headers.length - 1 ? { borderRightWidth: 0 } : null,
                        ]}
                      >
                        {renderInline(
                          header,
                          { ...tableStyles.headerText, textAlign: textAlignFor(block.aligns[cellIdx]) },
                          `${key}-header-${cellIdx}-text`,
                        )}
                      </View>
                    ))}
                  </View>
                  {block.rows.map((row, rowIdx) => (
                    <View key={`${key}-row-${rowIdx}`} style={tableStyles.row}>
                      {block.headers.map((_, cellIdx) => (
                        <View
                          key={`${key}-row-${rowIdx}-${cellIdx}`}
                          style={[
                            tableStyles.cell,
                            cellIdx === block.headers.length - 1 ? { borderRightWidth: 0 } : null,
                          ]}
                        >
                          {renderInline(
                            row[cellIdx] ?? "",
                            { ...tableStyles.cellText, textAlign: textAlignFor(block.aligns[cellIdx]) },
                            `${key}-row-${rowIdx}-${cellIdx}-text`,
                          )}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            );
          default:
            return null;
        }
      })}
    </View>
  );
}
