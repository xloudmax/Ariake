import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildRichContentHtml,
  detectMobileRichContent,
  parseRichContentMessage,
  selectRichContentRenderer,
} from "./richContent.ts";

describe("detectMobileRichContent", () => {
  it("detects mermaid, math, images, and fenced code independently", () => {
    const content = [
      "Inline math $E=mc^2$ and an image ![Lake](https://example.com/lake.jpg).",
      "",
      "```mermaid",
      "graph TD",
      "A --> B",
      "```",
      "",
      "```ts",
      "const value = 1",
      "```",
    ].join("\n");

    assert.deepEqual(detectMobileRichContent(content), {
      hasCode: true,
      hasImages: true,
      hasMath: true,
      hasMermaid: true,
      hasTable: false,
    });
  });

  it("does not treat escaped dollar signs as math", () => {
    assert.equal(detectMobileRichContent("Price is \\$12.99").hasMath, false);
  });

  it("detects pipe tables even when outer pipes are omitted", () => {
    const content = [
      "Feature | Renderer",
      "--- | ---",
      "Text | Native",
      "Math | WebView",
    ].join("\n");

    assert.equal(detectMobileRichContent(content).hasTable, true);
  });
});

describe("selectRichContentRenderer", () => {
  it("selects the native renderer for simple markdown", () => {
    assert.equal(selectRichContentRenderer({
      hasCode: false,
      hasImages: false,
      hasMath: false,
      hasMermaid: false,
      hasTable: false,
    }), "native");
  });

  it("selects the WebView renderer for heavyweight rich features", () => {
    assert.equal(selectRichContentRenderer({
      hasCode: true,
      hasImages: false,
      hasMath: false,
      hasMermaid: false,
      hasTable: false,
    }), "webview");
    assert.equal(selectRichContentRenderer({
      hasCode: false,
      hasImages: true,
      hasMath: false,
      hasMermaid: false,
      hasTable: false,
    }), "webview");
    assert.equal(selectRichContentRenderer({
      hasCode: false,
      hasImages: false,
      hasMath: true,
      hasMermaid: false,
      hasTable: false,
    }), "webview");
    assert.equal(selectRichContentRenderer({
      hasCode: false,
      hasImages: false,
      hasMath: false,
      hasMermaid: true,
      hasTable: false,
    }), "webview");
    assert.equal(selectRichContentRenderer({
      hasCode: false,
      hasImages: false,
      hasMath: false,
      hasMermaid: false,
      hasTable: true,
    }), "webview");
  });
});

describe("parseRichContentMessage", () => {
  it("accepts height, link, and image messages", () => {
    assert.deepEqual(parseRichContentMessage('{"type":"height","height":320}'), {
      type: "height",
      height: 320,
    });
    assert.deepEqual(parseRichContentMessage('{"type":"link","href":"https://example.com"}'), {
      type: "link",
      href: "https://example.com",
    });
    assert.deepEqual(parseRichContentMessage('{"type":"image","src":"https://example.com/a.png","alt":"A"}'), {
      type: "image",
      src: "https://example.com/a.png",
      alt: "A",
    });
  });

  it("rejects malformed or unsafe messages", () => {
    assert.equal(parseRichContentMessage("not-json"), null);
    assert.equal(parseRichContentMessage('{"type":"height","height":0}'), null);
    assert.equal(parseRichContentMessage('{"type":"link","href":"javascript:alert(1)"}'), null);
    assert.equal(parseRichContentMessage('{"type":"image","src":"javascript:alert(1)"}'), null);
  });
});

describe("buildRichContentHtml", () => {
  it("embeds markdown as JSON and includes fixed renderer resources by default", () => {
    const html = buildRichContentHtml({
      content: "![x](https://example.com/a.png)\n\n$E=mc^2$",
      theme: "light",
    });

    assert.match(html, /markdown-it@14\.1\.0/);
    assert.match(html, /katex@0\.16\.22/);
    assert.match(html, /mermaid@11\.12\.1/);
    assert.match(html, /window\.ReactNativeWebView\.postMessage/);
    assert.doesNotMatch(html, /<article[^>]*>[\s\S]*!\[x\]\(https:\/\/example\.com\/a\.png\)[\s\S]*<\/article>/);
  });

  it("omits KaTeX and Mermaid when features say they are not needed", () => {
    const html = buildRichContentHtml({
      content: "Just plain text and a `code span`.",
      theme: "light",
      features: { hasCode: true, hasImages: false, hasMath: false, hasMermaid: false, hasTable: false },
    });

    assert.match(html, /markdown-it@14\.1\.0/);
    assert.doesNotMatch(html, /katex@0\.16\.22/);
    assert.doesNotMatch(html, /mermaid@11\.12\.1/);
  });

  it("includes KaTeX only when hasMath is true", () => {
    const html = buildRichContentHtml({
      content: "$E=mc^2$",
      theme: "light",
      features: { hasCode: false, hasImages: false, hasMath: true, hasMermaid: false, hasTable: false },
    });

    assert.match(html, /katex@0\.16\.22/);
    assert.doesNotMatch(html, /mermaid@11\.12\.1/);
  });

  it("includes Mermaid only when hasMermaid is true", () => {
    const html = buildRichContentHtml({
      content: "```mermaid\ngraph TD\nA-->B\n```",
      theme: "light",
      features: { hasCode: false, hasImages: false, hasMath: false, hasMermaid: true, hasTable: false },
    });

    assert.match(html, /mermaid@11\.12\.1/);
    assert.doesNotMatch(html, /katex@0\.16\.22/);
  });
});
