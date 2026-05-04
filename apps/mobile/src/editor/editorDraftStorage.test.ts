import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createEditorDraftStorage, type EditorDraftStorageAdapter } from "./editorDraftStorage.ts";
import { createEmptyEditorState } from "./editorState.ts";

function createMemoryAdapter(): EditorDraftStorageAdapter {
  const values = new Map<string, string>();

  return {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async removeItem(key) {
      values.delete(key);
    },
    async setItem(key, value) {
      values.set(key, value);
    },
  };
}

describe("editorDraftStorage", () => {
  it("saves and restores a create draft", async () => {
    const storage = createEditorDraftStorage(createMemoryAdapter(), {
      now: () => "2026-05-01T08:00:00.000Z",
    });

    const state = { ...createEmptyEditorState(), title: "Draft", content: "Body" };
    await storage.saveDraft({ mode: "create", state });

    const draft = await storage.getDraft("create");
    assert.equal(draft?.mode, "create");
    assert.equal(draft?.updatedAt, "2026-05-01T08:00:00.000Z");
    assert.equal(draft?.state.title, "Draft");
  });

  it("saves edit drafts by slug", async () => {
    const storage = createEditorDraftStorage(createMemoryAdapter());
    await storage.saveDraft({
      mode: "edit",
      postId: "post-1",
      slug: "hello-world",
      state: { ...createEmptyEditorState(), title: "Edited", content: "Body" },
    });

    assert.equal((await storage.getDraft("edit", "hello-world"))?.postId, "post-1");
    assert.equal(await storage.getDraft("edit", "another-post"), null);
  });

  it("removes corrupted draft data", async () => {
    const adapter = createMemoryAdapter();
    const storage = createEditorDraftStorage(adapter);
    await adapter.setItem("editor:create", "not-json");

    assert.equal(await storage.getDraft("create"), null);
    assert.equal(await adapter.getItem("editor:create"), null);
  });

  it("removes drafts", async () => {
    const storage = createEditorDraftStorage(createMemoryAdapter());
    await storage.saveDraft({ mode: "create", state: createEmptyEditorState() });
    await storage.removeDraft("create");

    assert.equal(await storage.getDraft("create"), null);
  });
});
