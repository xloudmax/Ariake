import AsyncStorage from "@react-native-async-storage/async-storage";

import { createEditorDraftStorage } from "./editorDraftStorage";

export const editorDraftStorage = createEditorDraftStorage(AsyncStorage);
