import AsyncStorage from "@react-native-async-storage/async-storage";

import { createInsightStorage } from "./insightStorage";

export const insightStorage = createInsightStorage(AsyncStorage);
