import type {
  AccessLevel,
  BlogPostDetailFragment,
  BlogPostVersionFragment,
  CreatePostInput,
  PostStatus,
  UpdatePostInput,
} from "../generated/graphql";

import {
  type EditorMode,
  type EditorErrorKind,
  type MarkdownAction,
  type EditorTextSelection,
  type PublishChecklistKey,
  type PublishChecklistItem,
  type EditorQualityIssueKey,
  type EditorQualityIssue,
  type EditorQualityScore,
  type BaseEditorState,
  isCoverImageUrlValid,
  getPublishChecklist,
  getEditorQualityScore,
  classifyEditorError,
  isEditorStateValid,
  getEditorDraftKey,
  normalizeToken,
  addTokenToCsvList,
  removeTokenFromCsvList,
  toCsvList,
  insertMarkdownSyntax,
} from "@c404/shared";

export type {
  EditorMode,
  EditorErrorKind,
  MarkdownAction,
  EditorTextSelection,
  PublishChecklistKey,
  PublishChecklistItem,
  EditorQualityIssueKey,
  EditorQualityIssue,
  EditorQualityScore,
  BaseEditorState,
};

export {
  isCoverImageUrlValid,
  getPublishChecklist,
  getEditorQualityScore,
  classifyEditorError,
  isEditorStateValid,
  getEditorDraftKey,
  normalizeToken,
  addTokenToCsvList,
  removeTokenFromCsvList,
  toCsvList,
  insertMarkdownSyntax,
};

export type EditorState = BaseEditorState & {
  accessLevel: AccessLevel;
  categories: string[];
  status: PostStatus;
};

export type EditorVersionSnapshot = Pick<BlogPostVersionFragment, "content" | "title"> & {
  versionNum?: number | null;
};

export const DEFAULT_ACCESS_LEVEL = "PUBLIC" satisfies AccessLevel;
export const DEFAULT_POST_STATUS = "PUBLISHED" satisfies PostStatus;
export const DRAFT_POST_STATUS = "DRAFT" satisfies PostStatus;
export const postStatusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const satisfies readonly PostStatus[];
export const accessLevelOptions = ["PUBLIC", "PRIVATE", "RESTRICTED"] as const satisfies readonly AccessLevel[];

export const createEmptyEditorState = (): EditorState => ({
  accessLevel: DEFAULT_ACCESS_LEVEL,
  categories: [],
  content: "",
  coverImageUrl: null,
  excerpt: null,
  status: DEFAULT_POST_STATUS,
  tags: [],
  title: "",
});

export const createEditorStateFromPost = (post: BlogPostDetailFragment): EditorState => ({
  accessLevel: post.accessLevel,
  categories: post.categories ?? [],
  content: post.content ?? "",
  coverImageUrl: post.coverImageUrl ?? null,
  excerpt: post.excerpt ?? null,
  status: post.status,
  tags: post.tags ?? [],
  title: post.title ?? "",
});

export const createEditorStateFromVersion = (
  current: EditorState,
  version: EditorVersionSnapshot,
): EditorState => ({
  ...current,
  content: version.content ?? "",
  title: version.title ?? current.title,
});

const normalizeText = (value?: string | null) => value?.trim() || undefined;

export const areEditorStatesEqual = (left: EditorState, right: EditorState) => (
  left.accessLevel === right.accessLevel &&
  left.content === right.content &&
  left.coverImageUrl === right.coverImageUrl &&
  left.excerpt === right.excerpt &&
  left.status === right.status &&
  left.title === right.title &&
  JSON.stringify(left.categories) === JSON.stringify(right.categories) &&
  JSON.stringify(left.tags) === JSON.stringify(right.tags)
);

export const buildCreatePostInput = (state: EditorState, status: PostStatus = state.status): CreatePostInput => ({
  accessLevel: state.accessLevel,
  categories: state.categories,
  content: state.content.trim(),
  coverImageUrl: normalizeText(state.coverImageUrl),
  excerpt: normalizeText(state.excerpt),
  status,
  tags: state.tags,
  title: state.title.trim(),
});

export const buildUpdatePostInput = (state: EditorState, status: PostStatus = state.status): UpdatePostInput => ({
  accessLevel: state.accessLevel,
  categories: state.categories,
  content: state.content.trim(),
  coverImageUrl: normalizeText(state.coverImageUrl),
  excerpt: normalizeText(state.excerpt),
  status,
  tags: state.tags,
  title: state.title.trim(),
});
