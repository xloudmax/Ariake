import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMarkdownBlocks, parseInline, type MdBlock } from "@c404/shared";

describe("parseMarkdownBlocks", () => {
  it("parses headings at all levels", () => {
    const blocks = parseMarkdownBlocks("# H1\n## H2\n### H3");
    assert.deepStrictEqual(blocks, [
      { type: "heading", level: 1, text: "H1" },
      { type: "heading", level: 2, text: "H2" },
      { type: "heading", level: 3, text: "H3" },
    ] satisfies MdBlock[]);
  });

  it("parses paragraphs separated by empty lines", () => {
    const blocks = parseMarkdownBlocks("First paragraph.\n\nSecond paragraph.");
    assert.deepStrictEqual(blocks, [
      { type: "paragraph", text: "First paragraph." },
      { type: "paragraph", text: "Second paragraph." },
    ] satisfies MdBlock[]);
  });

  it("parses blockquotes", () => {
    const blocks = parseMarkdownBlocks("> This is\n> a quote");
    assert.deepStrictEqual(blocks, [
      { type: "blockquote", text: "This is\na quote" },
    ] satisfies MdBlock[]);
  });

  it("parses horizontal rules", () => {
    const blocks = parseMarkdownBlocks("text\n\n---\n\nmore");
    assert.equal(blocks[1].type, "hr");
  });

  it("parses unordered lists", () => {
    const blocks = parseMarkdownBlocks("- alpha\n- beta\n- gamma");
    assert.deepStrictEqual(blocks, [
      { type: "list", ordered: false, items: ["alpha", "beta", "gamma"] },
    ] satisfies MdBlock[]);
  });

  it("parses ordered lists", () => {
    const blocks = parseMarkdownBlocks("1. first\n2. second");
    assert.deepStrictEqual(blocks, [
      { type: "list", ordered: true, items: ["first", "second"] },
    ] satisfies MdBlock[]);
  });

  it("handles mixed blocks", () => {
    const blocks = parseMarkdownBlocks(
      "# Title\n\nParagraph text.\n\n- item1\n- item2\n\n---\n\n> quote"
    );
    assert.equal(blocks.length, 5);
    assert.equal(blocks[0].type, "heading");
    assert.equal(blocks[1].type, "paragraph");
    assert.equal(blocks[2].type, "list");
    assert.equal(blocks[3].type, "hr");
    assert.equal(blocks[4].type, "blockquote");
  });

  it("ignores empty input", () => {
    const blocks = parseMarkdownBlocks("");
    assert.deepStrictEqual(blocks, []);
  });

  it("joins continuation lines into a single paragraph", () => {
    const blocks = parseMarkdownBlocks("line one\nline two");
    assert.deepStrictEqual(blocks, [
      { type: "paragraph", text: "line one\nline two" },
    ] satisfies MdBlock[]);
  });

  it("parses pipe tables with and without outer pipes", () => {
    const blocks = parseMarkdownBlocks([
      "Before",
      "",
      "Feature | Renderer",
      "--- | :---:",
      "Text | Native",
      "Math | WebView",
      "",
      "| Key | Value |",
      "| ---: | --- |",
      "| A | B |",
    ].join("\n"));

    assert.deepStrictEqual(blocks, [
      { type: "paragraph", text: "Before" },
      {
        type: "table",
        headers: ["Feature", "Renderer"],
        aligns: [undefined, "center"],
        rows: [
          ["Text", "Native"],
          ["Math", "WebView"],
        ],
      },
      {
        type: "table",
        headers: ["Key", "Value"],
        aligns: ["right", undefined],
        rows: [["A", "B"]],
      },
    ] satisfies MdBlock[]);
  });
});

describe("parseInline", () => {
  it("returns plain text as a single node", () => {
    const nodes = parseInline("hello world");
    assert.deepStrictEqual(nodes, [{ type: "text", text: "hello world" }]);
  });

  it("parses bold", () => {
    const nodes = parseInline("before **bold** after");
    assert.equal(nodes.length, 3);
    assert.deepStrictEqual(nodes[1], { type: "bold", text: "bold" });
  });

  it("parses italic", () => {
    const nodes = parseInline("before *italic* after");
    assert.equal(nodes.length, 3);
    assert.deepStrictEqual(nodes[1], { type: "italic", text: "italic" });
  });

  it("parses inline code", () => {
    const nodes = parseInline("use `code` here");
    assert.equal(nodes.length, 3);
    assert.deepStrictEqual(nodes[1], { type: "code", text: "code" });
  });

  it("parses links", () => {
    const nodes = parseInline("click [here](https://example.com) now");
    assert.equal(nodes.length, 3);
    assert.deepStrictEqual(nodes[1], { type: "link", text: "here", href: "https://example.com" });
  });

  it("parses mixed inline elements", () => {
    const nodes = parseInline("**bold** and *italic* and `code`");
    assert.equal(nodes.length, 5);
    assert.equal(nodes[0].type, "bold");
    assert.equal(nodes[2].type, "italic");
    assert.equal(nodes[4].type, "code");
  });
});
