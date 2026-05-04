import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  addTokenToCsvList,
  areEditorStatesEqual,
  buildCreatePostInput,
  buildUpdatePostInput,
  classifyEditorError,
  createEditorStateFromVersion,
  createEmptyEditorState,
  getEditorDraftKey,
  getEditorQualityScore,
  getPublishChecklist,
  insertMarkdownSyntax,
  isEditorStateValid,
  removeTokenFromCsvList,
  toCsvList,
  type EditorState,
} from "./editorState.ts";

const baseState: EditorState = {
  accessLevel: "PUBLIC",
  categories: ["Engineering"],
  content: "  Hello **world**  ",
  coverImageUrl: " https://example.com/cover.png ",
  excerpt: " Short excerpt ",
  status: "PUBLISHED",
  tags: ["React Native"],
  title: "  Mobile editor  ",
};

describe("editorState", () => {
  it("creates an empty public published editor state", () => {
    assert.deepEqual(createEmptyEditorState(), {
      accessLevel: "PUBLIC",
      categories: [],
      content: "",
      coverImageUrl: null,
      excerpt: null,
      status: "PUBLISHED",
      tags: [],
      title: "",
    });
  });

  it("validates title, content, and optional cover image URL", () => {
    assert.equal(isEditorStateValid(createEmptyEditorState()), false);
    assert.equal(isEditorStateValid(baseState), true);

    assert.equal(isEditorStateValid({ ...baseState, coverImageUrl: "not-a-url" }), false);
    assert.equal(isEditorStateValid({ ...baseState, coverImageUrl: null }), true);
    assert.equal(isEditorStateValid({ ...baseState, coverImageUrl: "" }), true);
  });

  it("compares dirty state including optional metadata", () => {
    assert.equal(areEditorStatesEqual(baseState, { ...baseState }), true);
    assert.equal(areEditorStatesEqual(baseState, { ...baseState, excerpt: "Changed" }), false);
    assert.equal(areEditorStatesEqual(baseState, { ...baseState, coverImageUrl: null }), false);
    assert.equal(areEditorStatesEqual(baseState, { ...baseState, tags: ["React Native", "Expo"] }), false);
  });

  it("builds trimmed create and update inputs", () => {
    const expected = {
      accessLevel: "PUBLIC",
      categories: ["Engineering"],
      content: "Hello **world**",
      coverImageUrl: "https://example.com/cover.png",
      excerpt: "Short excerpt",
      status: "PUBLISHED",
      tags: ["React Native"],
      title: "Mobile editor",
    };

    assert.deepEqual(buildCreatePostInput(baseState), expected);
    assert.deepEqual(buildUpdatePostInput(baseState), expected);
  });

  it("trims empty optional metadata to undefined in inputs", () => {
    const input = buildCreatePostInput({
      ...baseState,
      coverImageUrl: "   ",
      excerpt: "  \n ",
    });

    assert.equal(input.coverImageUrl, undefined);
    assert.equal(input.excerpt, undefined);
  });

  it("generates stable draft keys", () => {
    assert.equal(getEditorDraftKey("create"), "editor:create");
    assert.equal(getEditorDraftKey("edit", "hello-world"), "editor:post:hello-world");
    assert.equal(getEditorDraftKey("edit", null), "editor:create");
  });

  it("normalizes and deduplicates tokens", () => {
    const items = ["React", "Expo"];
    assert.deepEqual(addTokenToCsvList(items, "  #react  "), ["React", "Expo"]);
    assert.deepEqual(addTokenToCsvList(items, " GraphQL "), ["React", "Expo", "GraphQL"]);
    assert.deepEqual(removeTokenFromCsvList(items, "Expo"), ["React"]);
    assert.equal(toCsvList(items), "React, Expo");
  });

  it("inserts markdown syntax with correct selection offset", () => {
    const content = "Hello world";

    const bold = insertMarkdownSyntax(content, { start: 6, end: 11 }, "bold");
    assert.equal(bold.content, "Hello **world**");
    assert.deepEqual(bold.selection, { start: 8, end: 13 });

    const code = insertMarkdownSyntax(content, { start: 11, end: 11 }, "code");
    assert.equal(code.content, "Hello world`code`");
    assert.deepEqual(code.selection, { start: 12, end: 16 });

    const heading = insertMarkdownSyntax(content, { start: 6, end: 11 }, "heading");
    assert.equal(heading.content, "# Hello world");
    assert.deepEqual(heading.selection, { start: 8, end: 13 });

    const list = insertMarkdownSyntax("Item 1\nItem 2", { start: 0, end: 13 }, "list");
    assert.equal(list.content, "- Item 1\n- Item 2");
    assert.deepEqual(list.selection, { start: 0, end: 17 });
  });

  it("creates editor state from historical version", () => {
    const restored = createEditorStateFromVersion(baseState, {
      title: "Old Title",
      content: "Old Content",
    });

    assert.equal(restored.title, "Old Title");
    assert.equal(restored.content, "Old Content");
    assert.equal(restored.tags, baseState.tags);
  });

  it("classifies editor errors", () => {
    assert.equal(classifyEditorError(new Error("Network connection lost")), "network");
    assert.equal(classifyEditorError(new Error("Permission denied to update post")), "permission");
    assert.equal(classifyEditorError(new Error("Validation failed: Title is required")), "validation");
    assert.equal(classifyEditorError(new Error("Something went wrong")), "unknown");
  });

  it("evaluates publish checklist", () => {
    const checklist = getPublishChecklist(baseState);
    assert.equal(checklist.length, 5);
    assert.equal(checklist.every(item => item.complete), true);

    const emptyChecklist = getPublishChecklist(createEmptyEditorState());
    assert.equal(emptyChecklist.find(i => i.key === "title")?.complete, false);
    assert.equal(emptyChecklist.find(i => i.key === "excerpt")?.complete, false);
  });

  it("calculates quality score", () => {
    const { score, issues } = getEditorQualityScore(baseState);
    assert.equal(score < 100, true);
    assert.equal(issues.some(i => i.key === "contentShort"), true);

    const perfectState: EditorState = {
      ...baseState,
      content: "A".repeat(200),
    };
    const perfect = getEditorQualityScore(perfectState);
    assert.equal(perfect.score, 100);
    assert.equal(perfect.issues.length, 0);

    const empty = getEditorQualityScore(createEmptyEditorState());
    assert.equal(empty.score, 26);
    assert.equal(empty.issues.length, 5);
  });
});
