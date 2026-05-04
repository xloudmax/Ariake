import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Octicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../src/auth/AuthContext";
import { ScreenHeader } from "../../src/components/ScreenPrimitives";
import { RichContentRenderer } from "../../src/components/richContent/RichContentRenderer";
import { DraftStatusPill, EditorActionBar } from "../../src/editor/EditorActionBar";
import { EditorModeSwitch } from "../../src/editor/EditorModeSwitch";
import { EditorPreview } from "../../src/editor/EditorPreview";
import { EditorQualityScoreCard } from "../../src/editor/EditorQualityScoreCard";
import {
  DRAFT_POST_STATUS,
  accessLevelOptions,
  addTokenToCsvList,
  areEditorStatesEqual,
  buildCreatePostInput,
  buildUpdatePostInput,
  createEditorStateFromPost,
  createEditorStateFromVersion,
  createEmptyEditorState,
  insertMarkdownSyntax,
  isCoverImageUrlValid,
  isEditorStateValid,
  postStatusOptions,
  removeTokenFromCsvList,
  type EditorMode,
  type EditorState,
} from "../../src/editor/editorState";
import { editorDraftStorage } from "../../src/editor/mobileEditorDraftStorage";
import { MarkdownToolbar } from "../../src/editor/MarkdownToolbar";
import { PublishChecklist } from "../../src/editor/PublishChecklist";
import { VersionHistoryPanel } from "../../src/editor/VersionHistoryPanel";
import {
  useArchivePostMutation,
  useCreatePostMutation,
  useDeletePostMutation,
  usePostQuery,
  usePostVersionsQuery,
  usePublishPostMutation,
  useUpdatePostMutation,
  type BlogPostDetailFragment,
  type BlogPostVersionFragment,
} from "../../src/generated/graphql";
import { formatDate } from "../../src/i18n";
import { useI18n } from "../../src/i18n/I18nProvider";
import { useToast } from "../../src/components/Toast/ToastProvider";
import { ErrorBoundary as CreateScreenErrorBoundary } from "../../src/components/ErrorBoundary";

type CreateScreenProps = {
  routeMode?: EditorMode;
};

export function CreateScreen({ routeMode }: CreateScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; slug?: string }>();
  const { isAuthenticated, ready } = useAuth();
  const { t, locale } = useI18n();
  const { showToast } = useToast();
  const colorScheme = useColorScheme();

  const editSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const requestedMode: EditorMode = routeMode ?? (params.mode === "edit" ? "edit" : "create");
  const mode: EditorMode = requestedMode === "edit" && editSlug ? "edit" : "create";
  const isEditMode = mode === "edit";

  const [editorState, setEditorState] = useState<EditorState>(() => createEmptyEditorState());
  const [initialState, setInitialState] = useState<EditorState>(() => createEmptyEditorState());
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [editorView, setEditorView] = useState<"edit" | "preview">("edit");
  const [selection, setSelection] = useState({ end: 0, start: 0 });
  const [tagInput, setTagInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [confirmPreviewVisible, setConfirmPreviewVisible] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<BlogPostVersionFragment | null>(null);
  const restoredDraftKeyRef = useRef<string | null>(null);
  const initializedPostIdRef = useRef<string | null>(null);
  const contentInputRef = useRef<TextInput>(null);

  const { data: editData, loading: loadingPost, error: loadError } = usePostQuery({
    variables: { slug: editSlug ?? "" },
    skip: !isEditMode || !editSlug,
    fetchPolicy: "cache-and-network",
  });

  const [createPost, { loading: creating }] = useCreatePostMutation();
  const [updatePost, { loading: updating }] = useUpdatePostMutation();
  const [deletePost, { loading: deleting }] = useDeletePostMutation();
  const [publishPost, { loading: publishingExisting }] = usePublishPostMutation();
  const [archivePost, { loading: archiving }] = useArchivePostMutation();
  const submitting = creating || updating || deleting || publishingExisting || archiving;
  const editedPost = editData?.post;
  const { data: versionsData, loading: loadingVersions } = usePostVersionsQuery({
    variables: { postId: editedPost?.id ?? "" },
    skip: !isEditMode || !editedPost?.id,
  });
  const isValid = isEditorStateValid(editorState);
  const isDirty = useMemo(() => !areEditorStatesEqual(editorState, initialState), [editorState, initialState]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Auto-clear inline submit errors as soon as the user fixes them.
  useEffect(() => {
    if (submitAttempted && isValid) setSubmitAttempted(false);
  }, [submitAttempted, isValid]);
  const normalizedCoverImageUrl = editorState.coverImageUrl?.trim() || null;
  const coverImageUrlValid = isCoverImageUrlValid(editorState.coverImageUrl);
  const previewTheme = colorScheme === "dark" ? "dark" : "light";
  const markdownActions = useMemo(() => [
    { icon: "heading" as const, label: t("create.toolbarHeading"), kind: "heading" as const },
    { icon: "bold" as const, label: t("create.toolbarBold"), kind: "bold" as const },
    { icon: "italic" as const, label: t("create.toolbarItalic"), kind: "italic" as const },
    { icon: "list-unordered" as const, label: t("create.toolbarList"), kind: "list" as const },
    { icon: "code" as const, label: t("create.toolbarCode"), kind: "code" as const },
    { icon: "link" as const, label: t("create.toolbarLink"), kind: "link" as const },
  ], [t]);

  const updateEditor = useCallback((patch: Partial<EditorState>) => {
    setEditorState((current) => ({ ...current, ...patch }));
  }, []);

  const handleSelectionChange = useCallback((event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setSelection(event.nativeEvent.selection);
  }, []);

  const handleMarkdownAction = useCallback((kind: "bold" | "code" | "heading" | "italic" | "link" | "list") => {
    setEditorState((current) => {
      const { content, selection: nextSelection } = insertMarkdownSyntax(current.content, selection, kind);
      setSelection(nextSelection);
      requestAnimationFrame(() => contentInputRef.current?.focus());
      return { ...current, content };
    });
  }, [selection]);

  const addTag = useCallback(() => {
    setEditorState((current) => ({ ...current, tags: addTokenToCsvList(current.tags, tagInput) }));
    setTagInput("");
  }, [tagInput]);

  const addCategory = useCallback(() => {
    setEditorState((current) => ({ ...current, categories: addTokenToCsvList(current.categories, categoryInput) }));
    setCategoryInput("");
  }, [categoryInput]);

  const removeTag = useCallback((tag: string) => {
    setEditorState((current) => ({ ...current, tags: removeTokenFromCsvList(current.tags, tag) }));
  }, []);

  const removeCategory = useCallback((category: string) => {
    setEditorState((current) => ({ ...current, categories: removeTokenFromCsvList(current.categories, category) }));
  }, []);

  const handleDismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const clearDraft = useCallback(async () => {
    await editorDraftStorage.removeDraft(mode, editSlug);
    setDraftStatus("idle");
  }, [editSlug, mode]);

  useEffect(() => {
    if (!isEditMode) return;
    if (!editedPost) return;
    if (initializedPostIdRef.current === editedPost.id) return;

    const nextState = createEditorStateFromPost(editedPost);
    setEditorState(nextState);
    setInitialState(nextState);
    initializedPostIdRef.current = editedPost.id;
  }, [editedPost, isEditMode]);

  useEffect(() => {
    const draftKey = `${mode}:${editSlug ?? "create"}:${editedPost?.id ?? "new"}`;
    if (restoredDraftKeyRef.current === draftKey) return;
    if (isEditMode && !editedPost) return;

    let cancelled = false;
    restoredDraftKeyRef.current = draftKey;

    editorDraftStorage.getDraft(mode, editSlug).then((draft) => {
      if (cancelled || !draft) return;

      Alert.alert(t("create.restoreDraftTitle"), t("create.restoreDraftMessage"), [
        {
          text: t("create.discardDraftAction"),
          style: "destructive",
          onPress: () => {
            editorDraftStorage.removeDraft(mode, editSlug).catch(() => {});
          },
        },
        {
          text: t("create.restoreDraftAction"),
          onPress: () => {
            setEditorState(draft.state);
            setDraftStatus("saved");
          },
        },
      ]);
    }).catch((err) => {
      console.warn("Failed to restore editor draft:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [editSlug, editedPost, isEditMode, mode, t]);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    if (!isDirty || !isValid) return;

    setDraftStatus("saving");
    const timeout = setTimeout(() => {
      editorDraftStorage.saveDraft({
        mode,
        postId: editedPost?.id,
        slug: editSlug,
        state: editorState,
      }).then(() => {
        setDraftStatus("saved");
      }).catch((err) => {
        setDraftStatus("idle");
        console.warn("Failed to save editor draft:", err);
      });
    }, 700);

    return () => clearTimeout(timeout);
  }, [editSlug, editedPost?.id, editorState, isAuthenticated, isDirty, isValid, mode, ready]);

  const requireLogin = useCallback(() => {
    Alert.alert(t("create.loginRequired"), t("create.loginRequiredDescription"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("tabs.profile"), onPress: () => router.push("/(tabs)/profile") },
    ]);
  }, [router, t]);

  const showEditorError = useCallback((err: unknown, fallback: string) => {
    const message = err instanceof Error && err.message ? err.message : fallback;
    showToast({ variant: "error", message });
  }, [showToast]);

  const navigateToPost = useCallback((slug: string) => {
    router.replace({ pathname: "/post/[slug]", params: { slug } });
  }, [router]);

  const runPostAction = useCallback(async (
    action: "archive" | "delete" | "publish",
  ) => {
    if (!editedPost) return;

    try {
      if (action === "delete") {
        const { data } = await deletePost({
          refetchQueries: ["Posts"],
          variables: { id: editedPost.id },
        });
        if (data?.deletePost.success) {
          await clearDraft();
          showToast({
            variant: "success",
            message: data.deletePost.message || t("create.deleteSuccessMessage"),
          });
          router.replace("/(tabs)");
        } else {
          showToast({
            variant: "error",
            message: data?.deletePost.message || t("create.failedToDelete"),
          });
        }
        return;
      }

      let nextPost: BlogPostDetailFragment | null | undefined;

      if (action === "archive") {
        const { data } = await archivePost({ refetchQueries: ["Post", "Posts"], variables: { id: editedPost.id } });
        nextPost = data?.archivePost;
      } else {
        const { data } = await publishPost({ refetchQueries: ["Post", "Posts"], variables: { id: editedPost.id } });
        nextPost = data?.publishPost;
      }

      if (nextPost?.id) {
        await clearDraft();
        const nextState = createEditorStateFromPost(nextPost);
        setEditorState(nextState);
        setInitialState(nextState);
        showToast({
          variant: "success",
          message: action === "archive" ? t("create.archiveSuccessMessage") : t("create.publishSuccessMessage"),
          action: {
            label: t("create.viewPostAction"),
            onPress: () => navigateToPost(nextPost.slug),
          },
        });
      }
    } catch (err: unknown) {
      showEditorError(err, t("create.actionFailed"));
    }
  }, [archivePost, clearDraft, deletePost, editedPost, navigateToPost, publishPost, router, showEditorError, showToast, t]);

  const confirmPostAction = useCallback((action: "archive" | "delete" | "publish") => {
    const copy = {
      archive: {
        message: t("create.archiveConfirmMessage"),
        title: t("create.archiveConfirmTitle"),
        action: t("create.archivePost"),
        style: "default" as const,
      },
      delete: {
        message: t("create.deleteConfirmMessage"),
        title: t("create.deleteConfirmTitle"),
        action: t("common.delete"),
        style: "destructive" as const,
      },
      publish: {
        message: t("create.publishConfirmMessage"),
        title: t("create.publishConfirmTitle"),
        action: t("create.publishPost"),
        style: "default" as const,
      },
    }[action];

    Alert.alert(copy.title, copy.message, [
      { text: t("common.cancel"), style: "cancel" },
      { text: copy.action, style: copy.style, onPress: () => { runPostAction(action).catch(() => {}); } },
    ]);
  }, [runPostAction, t]);

  const handleSubmit = useCallback(async (targetStatus = editorState.status) => {
    Keyboard.dismiss();

    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    if (!isValid) {
      setSubmitAttempted(true);
      return;
    }

    try {
      let nextPost: BlogPostDetailFragment | null | undefined;

      if (isEditMode && editedPost) {
        const { data } = await updatePost({
          variables: {
            id: editedPost.id,
            input: buildUpdatePostInput(editorState, targetStatus),
          },
          refetchQueries: ["Post", "Posts"],
        });
        nextPost = data?.updatePost;
      } else {
        const { data } = await createPost({
          variables: {
            input: buildCreatePostInput(editorState, targetStatus),
          },
          refetchQueries: ["Posts"],
        });
        nextPost = data?.createPost;
      }

      if (nextPost?.id) {
        await clearDraft();
        const nextState = createEditorStateFromPost(nextPost);
        setEditorState(nextState);
        setInitialState(nextState);
        Alert.alert(
          isEditMode ? t("create.updateSuccessTitle") : t("create.successTitle"),
          isEditMode ? t("create.updateSuccessMessage") : t("create.successMessage"),
          [{
            text: t("create.viewPostAction"),
            onPress: () => navigateToPost(nextPost.slug),
          }],
        );
      }
    } catch (err: unknown) {
      showEditorError(err, isEditMode ? t("create.failedToUpdate") : t("create.failedToCreate"));
    }
  }, [clearDraft, createPost, editedPost, editorState, isAuthenticated, isEditMode, isValid, navigateToPost, requireLogin, showEditorError, t, updatePost]);

  const confirmSubmit = useCallback((targetStatus = editorState.status) => {
    const isPublishing = targetStatus === "PUBLISHED";
    if (!isPublishing) {
      handleSubmit(targetStatus).catch(() => {});
      return;
    }

    setConfirmPreviewVisible(true);
  }, [editorState.status, handleSubmit]);

  const handleConfirmPreviewSubmit = useCallback(() => {
    setConfirmPreviewVisible(false);
    handleSubmit("PUBLISHED").catch(() => {});
  }, [handleSubmit]);

  const handleRestoreVersion = useCallback((version: BlogPostVersionFragment) => {
    Alert.alert(t("create.restoreVersionConfirmTitle"), t("create.restoreVersionConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("create.restoreVersion"),
        onPress: () => {
          setEditorState((current) => createEditorStateFromVersion(current, version));
          setSelectedVersion(null);
          setEditorView("edit");
        },
      },
    ]);
  }, [t]);

  const handleSaveDraft = useCallback(() => {
    handleSubmit(DRAFT_POST_STATUS);
  }, [handleSubmit]);

  const handlePublish = useCallback(() => {
    confirmSubmit("PUBLISHED");
  }, [confirmSubmit]);

  const handleBack = useCallback(() => {
    if (!isDirty) {
      if (router.canGoBack()) router.back(); else router.replace("/(tabs)");
      return;
    }

    Alert.alert(t("create.unsavedChangesTitle"), t("create.unsavedChangesMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("create.discardChangesAction"),
        style: "destructive",
        onPress: () => {
          if (router.canGoBack()) router.back(); else router.replace("/(tabs)");
        },
      },
    ]);
  }, [isDirty, router, t]);

  if (ready && !isAuthenticated) {
    return (
      <View style={{ paddingTop: insets.top }} className="flex-1 bg-gray-50 dark:bg-slate-950">
        <ScreenHeader
          title={isEditMode ? t("create.editTitle") : t("create.title")}
          subtitle={t("create.loginRequiredDescription")}
        />
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-5 h-16 w-16 items-center justify-center rounded-[24px] bg-blue-50 dark:bg-blue-950/40">
            <Octicons name="pencil" size={28} color="#2563eb" />
          </View>
          <Text className="text-center text-2xl font-black text-gray-900 dark:text-gray-50">
            {t("create.loginRequired")}
          </Text>
          <Text className="mt-3 text-center text-base leading-6 text-gray-500 dark:text-gray-400">
            {t("create.loginRequiredDescription")}
          </Text>
          <TouchableOpacity
            className="mt-7 rounded-full bg-blue-600 px-6 py-3"
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Text className="font-black text-white">{t("tabs.profile")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isEditMode && loadingPost && !editedPost) {
    return (
      <View style={{ paddingTop: insets.top }} className="flex-1 items-center justify-center bg-gray-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-3 text-gray-500 dark:text-gray-400">{t("create.loadingPost")}</Text>
      </View>
    );
  }

  if (isEditMode && (loadError || !editedPost)) {
    return (
      <View style={{ paddingTop: insets.top }} className="flex-1 bg-gray-50 dark:bg-slate-950">
        <ScreenHeader title={t("create.editTitle")} subtitle={t("create.unableToLoadPost")} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base text-red-500">{loadError?.message || t("create.unableToLoadPost")}</Text>
          <TouchableOpacity className="mt-6 rounded-full bg-blue-600 px-5 py-3" onPress={handleBack}>
            <Text className="font-black text-white">{t("post.goBack")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-slate-950"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <TouchableWithoutFeedback accessible={false} onPress={handleDismissKeyboard}>
        <View style={{ paddingTop: insets.top }} className="flex-1">
          <ScreenHeader
            title={isEditMode ? t("create.editTitle") : t("create.title")}
            subtitle={isEditMode ? t("create.editSubtitle") : t("create.subtitle")}
          />

          <View className="flex-1 px-5">
            <View className="mb-1 flex-row items-center justify-between border-b border-gray-100 py-2 dark:border-slate-800">
              <TextInput
                className="flex-1 py-2 text-2xl font-bold text-gray-900 dark:text-gray-50"
                placeholder={t("create.postTitlePlaceholder")}
                placeholderTextColor="#9ca3af"
                value={editorState.title}
                onChangeText={(value) => updateEditor({ title: value })}
                maxLength={100}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => contentInputRef.current?.focus()}
                accessibilityLabel={t("create.postTitlePlaceholder")}
              />
              <TouchableOpacity
                className={`ml-4 flex-row items-center rounded-full px-5 py-2 ${submitting || !isValid ? "bg-gray-200 dark:bg-slate-800" : "bg-blue-600"}`}
                onPress={handlePublish}
                disabled={submitting || !isValid}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text className={`mr-1 font-bold ${submitting || !isValid ? "text-gray-400 dark:text-gray-500" : "text-white"}`}>
                      {isEditMode ? t("create.updatePost") : t("create.publishPost")}
                    </Text>
                    <Octicons name="paper-airplane" size={14} color={submitting || !isValid ? "#9ca3af" : "#fff"} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {submitAttempted && !editorState.title.trim() ? (
              <Text
                accessibilityLiveRegion="polite"
                className="mb-3 text-xs font-bold text-red-500"
              >
                {t("common.titleRequired")}
              </Text>
            ) : (
              <View className="mb-3" />
            )}

            <View className="mb-3 flex-row items-center justify-between">
              <DraftStatusPill dirty={isDirty} status={draftStatus} />
              <EditorActionBar
                canEditPostActions={isEditMode}
                disabled={submitting || !isValid || (isEditMode && !editedPost)}
                onArchive={() => confirmPostAction("archive")}
                onDelete={() => confirmPostAction("delete")}
                onSaveDraft={handleSaveDraft}
              />
            </View>

            <EditorModeSwitch
              value={editorView}
              onChange={(view) => {
                Keyboard.dismiss();
                setEditorView(view);
              }}
            />

            {editorView === "edit" ? (
              <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
              >
                <View className="mb-4 rounded-[24px] border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <Text className="mb-3 text-xs font-black uppercase tracking-[1.4px] text-slate-400">
                    {t("create.metadata")}
                  </Text>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-black text-slate-700 dark:text-slate-200">{t("create.excerpt")}</Text>
                    <TextInput
                      className="min-h-[86px] rounded-2xl border border-slate-200 px-3 py-2 text-sm leading-5 text-slate-800 dark:border-slate-700 dark:text-slate-100"
                      placeholder={t("create.excerptPlaceholder")}
                      placeholderTextColor="#9ca3af"
                      multiline
                      textAlignVertical="top"
                      value={editorState.excerpt ?? ""}
                      onChangeText={(value) => updateEditor({ excerpt: value })}
                      returnKeyType="default"
                      blurOnSubmit={false}
                    />
                  </View>

                  <View className="mb-4">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-sm font-black text-slate-700 dark:text-slate-200">{t("create.coverImageUrl")}</Text>
                      {!coverImageUrlValid ? (
                        <Text className="text-xs font-bold text-red-500">{t("create.invalidCoverImageUrl")}</Text>
                      ) : null}
                    </View>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      className={`rounded-2xl border px-3 py-2 text-sm text-slate-800 dark:text-slate-100 ${coverImageUrlValid ? "border-slate-200 dark:border-slate-700" : "border-red-300 dark:border-red-800"}`}
                      keyboardType="url"
                      placeholder={t("create.coverImageUrlPlaceholder")}
                      placeholderTextColor="#9ca3af"
                      returnKeyType="done"
                      value={editorState.coverImageUrl ?? ""}
                      onChangeText={(value) => updateEditor({ coverImageUrl: value })}
                    />
                  </View>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-black text-slate-700 dark:text-slate-200">{t("create.tags")}</Text>
                    <View className="mb-2 flex-row flex-wrap gap-2">
                      {editorState.tags.map((tag) => (
                        <TouchableOpacity
                          key={tag}
                          accessibilityLabel={t("create.removeTag", { tag })}
                          accessibilityRole="button"
                          className="flex-row items-center rounded-full bg-blue-50 px-3 py-1.5 dark:bg-blue-950/50"
                          onPress={() => removeTag(tag)}
                        >
                          <Text className="text-xs font-bold text-blue-600 dark:text-blue-300">#{tag}</Text>
                          <Octicons name="x" size={12} color="#2563eb" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View className="flex-row items-center rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                      <TextInput
                        className="flex-1 text-sm text-slate-800 dark:text-slate-100"
                        placeholder={t("create.addTagPlaceholder")}
                        placeholderTextColor="#9ca3af"
                        value={tagInput}
                        onChangeText={setTagInput}
                        returnKeyType="done"
                        onSubmitEditing={addTag}
                      />
                      <TouchableOpacity disabled={!tagInput.trim()} onPress={addTag}>
                        <Octicons name="plus-circle" size={18} color={tagInput.trim() ? "#2563eb" : "#94a3b8"} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-black text-slate-700 dark:text-slate-200">{t("create.categories")}</Text>
                    <View className="mb-2 flex-row flex-wrap gap-2">
                      {editorState.categories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          accessibilityLabel={t("create.removeCategory", { category })}
                          accessibilityRole="button"
                          className="flex-row items-center rounded-full bg-amber-50 px-3 py-1.5 dark:bg-amber-950/30"
                          onPress={() => removeCategory(category)}
                        >
                          <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">{category}</Text>
                          <Octicons name="x" size={12} color="#b45309" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View className="flex-row items-center rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                      <TextInput
                        className="flex-1 text-sm text-slate-800 dark:text-slate-100"
                        placeholder={t("create.addCategoryPlaceholder")}
                        placeholderTextColor="#9ca3af"
                        value={categoryInput}
                        onChangeText={setCategoryInput}
                        returnKeyType="done"
                        onSubmitEditing={addCategory}
                      />
                      <TouchableOpacity disabled={!categoryInput.trim()} onPress={addCategory}>
                        <Octicons name="plus-circle" size={18} color={categoryInput.trim() ? "#2563eb" : "#94a3b8"} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-black text-slate-700 dark:text-slate-200">{t("create.status")}</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {postStatusOptions.map((status) => {
                        const selected = editorState.status === status;
                        return (
                          <TouchableOpacity
                            key={status}
                            className={`rounded-full border px-3 py-2 ${selected ? "border-blue-500 bg-blue-500" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"}`}
                            onPress={() => updateEditor({ status })}
                          >
                            <Text className={`text-xs font-black ${selected ? "text-white" : "text-slate-600 dark:text-slate-300"}`}>
                              {t(`create.status${status}`)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-black text-slate-700 dark:text-slate-200">{t("create.accessLevel")}</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {accessLevelOptions.map((accessLevel) => {
                        const selected = editorState.accessLevel === accessLevel;
                        return (
                          <TouchableOpacity
                            key={accessLevel}
                            className={`rounded-full border px-3 py-2 ${selected ? "border-indigo-500 bg-indigo-500" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"}`}
                            onPress={() => updateEditor({ accessLevel })}
                          >
                            <Text className={`text-xs font-black ${selected ? "text-white" : "text-slate-600 dark:text-slate-300"}`}>
                              {t(`create.access${accessLevel}`)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {isEditMode ? (
                    <VersionHistoryPanel
                      loading={loadingVersions}
                      versions={versionsData?.postVersions ?? []}
                      onSelectVersion={setSelectedVersion}
                    />
                  ) : null}
                </View>

                <MarkdownToolbar actions={markdownActions} onAction={handleMarkdownAction} />

                {submitAttempted && !editorState.content.trim() ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    className="mt-2 text-xs font-bold text-red-500"
                  >
                    {t("common.contentRequired")}
                  </Text>
                ) : null}

                <TextInput
                  ref={contentInputRef}
                  className="min-h-[400px] flex-1 text-base leading-7 text-gray-800 dark:text-gray-200"
                  placeholder={`${t("create.postContentPlaceholder")}

# Heading 1
## Heading 2

You can use standard markdown syntax here.`}
                  placeholderTextColor="#9ca3af"
                  multiline
                  textAlignVertical="top"
                  value={editorState.content}
                  onChangeText={(value) => updateEditor({ content: value })}
                  onSelectionChange={handleSelectionChange}
                  selection={selection}
                  returnKeyType="default"
                  blurOnSubmit={false}
                />
              </ScrollView>
            ) : (
              <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
              >
                <EditorPreview coverImageUrl={normalizedCoverImageUrl} state={editorState} theme={previewTheme} />
              </ScrollView>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>

      <Modal
        animationType="slide"
        onRequestClose={() => setConfirmPreviewVisible(false)}
        presentationStyle="pageSheet"
        visible={confirmPreviewVisible}
      >
        <View className="flex-1 bg-gray-50 px-5 dark:bg-slate-950" style={{ paddingTop: insets.top + 12 }}>
          <View className="mb-4 flex-row items-center justify-between">
            <TouchableOpacity className="rounded-full bg-slate-100 px-4 py-2 dark:bg-slate-900" onPress={() => setConfirmPreviewVisible(false)}>
              <Text className="font-black text-slate-600 dark:text-slate-300">{t("common.cancel")}</Text>
            </TouchableOpacity>
            <Text className="text-base font-black text-slate-900 dark:text-slate-50">
              {isEditMode ? t("create.updateConfirmTitle") : t("create.publishConfirmTitle")}
            </Text>
            <TouchableOpacity className="rounded-full bg-blue-600 px-4 py-2" disabled={submitting} onPress={handleConfirmPreviewSubmit}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text className="font-black text-white">{isEditMode ? t("create.updatePost") : t("create.publishPost")}</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="mb-4 rounded-[28px] border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
              <Text className="text-xs font-black uppercase tracking-[1.4px] text-blue-600 dark:text-blue-300">
                {t("create.finalReview")}
              </Text>
              <Text className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
                {isEditMode ? t("create.updateConfirmMessage") : t("create.publishConfirmMessage")}
              </Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                <View className="rounded-full bg-white px-3 py-1 dark:bg-slate-900">
                  <Text className="text-xs font-black text-slate-600 dark:text-slate-300">{t(`create.status${editorState.status}`)}</Text>
                </View>
                <View className="rounded-full bg-white px-3 py-1 dark:bg-slate-900">
                  <Text className="text-xs font-black text-slate-600 dark:text-slate-300">{t(`create.access${editorState.accessLevel}`)}</Text>
                </View>
              </View>
              <PublishChecklist state={editorState} />
              <EditorQualityScoreCard state={editorState} />
            </View>

            <View className="mb-8 rounded-[28px] bg-white px-4 py-5 dark:bg-slate-900/70">
              <Text className="mb-4 text-3xl font-black leading-10 text-slate-950 dark:text-slate-50">
                {editorState.title.trim() || t("create.postTitlePlaceholder")}
              </Text>
              {editorState.excerpt ? (
                <Text className="mb-5 text-base leading-6 text-slate-500 dark:text-slate-400">{editorState.excerpt}</Text>
              ) : null}
              {normalizedCoverImageUrl ? (
                <Image
                  source={{ uri: normalizedCoverImageUrl }}
                  className="mb-5 h-48 w-full rounded-[24px] bg-slate-100 dark:bg-slate-800"
                  resizeMode="cover"
                />
              ) : null}
              <RichContentRenderer content={editorState.content || `*${t("post.noContent")}*`} theme={previewTheme} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedVersion(null)}
        presentationStyle="pageSheet"
        visible={!!selectedVersion}
      >
        <View className="flex-1 bg-gray-50 px-5 dark:bg-slate-950" style={{ paddingTop: insets.top + 12 }}>
          <View className="mb-4 flex-row items-center justify-between">
            <TouchableOpacity className="rounded-full bg-slate-100 px-4 py-2 dark:bg-slate-900" onPress={() => setSelectedVersion(null)}>
              <Text className="font-black text-slate-600 dark:text-slate-300">{t("common.close")}</Text>
            </TouchableOpacity>
            <Text className="text-base font-black text-slate-900 dark:text-slate-50">
              {selectedVersion ? t("create.versionNumber", { version: selectedVersion.versionNum }) : t("create.versionHistory")}
            </Text>
            <TouchableOpacity
              className="rounded-full bg-blue-600 px-4 py-2"
              disabled={!selectedVersion}
              onPress={() => selectedVersion ? handleRestoreVersion(selectedVersion) : undefined}
            >
              <Text className="font-black text-white">{t("create.restoreVersion")}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedVersion ? (
              <View className="mb-8 rounded-[28px] bg-white px-4 py-5 dark:bg-slate-900/70">
                <Text className="text-xs font-black uppercase tracking-[1.4px] text-blue-600 dark:text-blue-300">
                  {formatDate(selectedVersion.createdAt, locale)}
                </Text>
                <Text className="mt-3 text-3xl font-black leading-10 text-slate-950 dark:text-slate-50">
                  {selectedVersion.title}
                </Text>
                <Text className="mb-5 mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {selectedVersion.changeLog || t("create.noChangeLog")}
                </Text>
                <RichContentRenderer content={selectedVersion.content || `*${t("post.noContent")}*`} theme={previewTheme} />
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// Local ErrorBoundary isolation: if anything inside CreateScreen throws (e.g.
// the navigation-context error currently fired by EditorModeSwitch when
// rendered as a NativeTabs child), only this tab shows the fallback UI — the
// rest of the app (home, article detail, etc.) keeps rendering normally.
//
// The Create tab itself is just a landing — it pushes onto the dedicated
// editor Stack screen (`/editor/new`) where navigation context is reliable.
// Using the imperative `router` from expo-router avoids `useRouter()` (whose
// hook-time context lookup is what breaks under NativeTabs).
import { router } from "expo-router";
import { contentPaddingForTabBar } from "../../src/components/layoutConstants";
import { GlassSurface } from "../../src/components/GlassSurface";

function CreateTabRoute() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <CreateScreenErrorBoundary>
      <View
        className="flex-1 bg-gray-50 dark:bg-slate-950"
        style={{ paddingTop: insets.top }}
      >
        <ScreenHeader title={t("create.title")} subtitle={t("create.subtitle")} />
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ paddingBottom: contentPaddingForTabBar(insets.bottom) }}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("create.startWriting")}
            accessibilityHint={t("create.startWritingDescription")}
            activeOpacity={0.85}
            onPress={() => router.push("/editor/new")}
            className="w-full overflow-hidden rounded-[28px]"
          >
            <GlassSurface
              className="w-full items-center px-6 py-10"
              colorScheme="auto"
              fallbackColor="rgba(59, 130, 246, 0.12)"
              fallbackTint="systemChromeMaterial"
            >
              <View className="mb-5 h-16 w-16 items-center justify-center rounded-[24px] bg-blue-500">
                <Octicons name="pencil" size={28} color="#ffffff" />
              </View>
              <Text className="text-center text-xl font-black text-gray-950 dark:text-gray-50">
                {t("create.startWriting")}
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
                {t("create.startWritingDescription")}
              </Text>
            </GlassSurface>
          </TouchableOpacity>
        </View>
      </View>
    </CreateScreenErrorBoundary>
  );
}

export default CreateTabRoute;
