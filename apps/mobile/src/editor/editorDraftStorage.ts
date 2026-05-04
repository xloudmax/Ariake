import type { EditorMode, EditorState } from "./editorState.ts";
import { getEditorDraftKey } from "./editorState.ts";

export type EditorDraft = {
  mode: EditorMode;
  postId?: string | null;
  slug?: string | null;
  state: EditorState;
  updatedAt: string;
};

export type EditorDraftStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

type EditorDraftStorageOptions = {
  now?: () => string;
};

export function createEditorDraftStorage(
  adapter: EditorDraftStorageAdapter,
  options: EditorDraftStorageOptions = {},
) {
  const now = options.now ?? (() => new Date().toISOString());

  const saveDraft = async (draft: Omit<EditorDraft, "updatedAt">) => {
    const nextDraft: EditorDraft = {
      ...draft,
      updatedAt: now(),
    };
    await adapter.setItem(getEditorDraftKey(draft.mode, draft.slug), JSON.stringify(nextDraft));
    return nextDraft;
  };

  const getDraft = async (mode: EditorMode, slug?: string | null) => {
    const raw = await adapter.getItem(getEditorDraftKey(mode, slug));
    if (!raw) return null;

    try {
      return JSON.parse(raw) as EditorDraft;
    } catch {
      await adapter.removeItem(getEditorDraftKey(mode, slug));
      return null;
    }
  };

  const removeDraft = async (mode: EditorMode, slug?: string | null) => {
    await adapter.removeItem(getEditorDraftKey(mode, slug));
  };

  return {
    getDraft,
    removeDraft,
    saveDraft,
  };
}
