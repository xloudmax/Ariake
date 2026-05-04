import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { ApolloProvider } from "@apollo/client";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, useColorScheme } from "react-native";
import { client, setupApolloCache } from "../src/apollo/client";
import { AuthProvider } from "../src/auth/AuthContext";
import { I18nProvider } from "../src/i18n/I18nProvider";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { OfflineBanner } from "../src/components/OfflineBanner";
import { ToastProvider, showToastExternal } from "../src/components/Toast/ToastProvider";
import { startNetworkMonitor } from "../src/utils/network";
import {
  registerOfflineQueueHandler,
  startOfflineQueueAutoDrain,
  subscribeOfflineQueueDrain,
} from "../src/utils/mobileOfflineQueue";
import {
  CreateCommentDocument,
  LikePostDocument,
  UnlikePostDocument,
  type CreateCommentMutationVariables,
  type LikePostMutationVariables,
  type UnlikePostMutationVariables,
} from "../src/generated/graphql";
import { i18n } from "../src/i18n";
import { loadInlineRichAssets } from "../src/components/richContent/richContent";
import "../src/global.css";

// Register handlers once at module load — they live for the lifetime of the
// app and route a queued mutation kind back to the right Apollo operation.
// Order matters: handlers must be registered BEFORE startOfflineQueueAutoDrain
// is called, otherwise the first drain would no-op queue entries it doesn't
// recognise.
registerOfflineQueueHandler("comment.create", async (variables) => {
  await client.mutate({
    mutation: CreateCommentDocument,
    variables: variables as CreateCommentMutationVariables,
    fetchPolicy: "no-cache",
  });
});
registerOfflineQueueHandler("post.like", async (variables) => {
  await client.mutate({
    mutation: LikePostDocument,
    variables: variables as LikePostMutationVariables,
    fetchPolicy: "no-cache",
  });
});
registerOfflineQueueHandler("post.unlike", async (variables) => {
  await client.mutate({
    mutation: UnlikePostDocument,
    variables: variables as UnlikePostMutationVariables,
    fetchPolicy: "no-cache",
  });
});

export default function RootLayout() {
  const [cacheReady, setCacheReady] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    startNetworkMonitor();
    startOfflineQueueAutoDrain();
    loadInlineRichAssets().catch(() => {});

    // Toast user when queued mutations actually replay. We want one summary
    // toast per drain (not per entry), and we never speak up if there was
    // nothing to drain.
    const unsubDrain = subscribeOfflineQueueDrain((result) => {
      if (result.succeeded > 0) {
        showToastExternal({
          variant: "success",
          message: i18n.t("common.replayedSuccess", { count: result.succeeded }),
        });
      }
    });

    let cancelled = false;
    (async () => {
      await setupApolloCache();
      if (!cancelled) setCacheReady(true);
    })();
    return () => {
      cancelled = true;
      unsubDrain();
    };
  }, []);

  if (!cacheReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#020617' : '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <I18nProvider>
        <ApolloProvider client={client}>
          <AuthProvider>
            <ToastProvider>
              <View style={{ flex: 1 }}>
                <Stack
                  screenOptions={{
                    animation: "slide_from_right",
                    fullScreenGestureEnabled: true,
                    gestureEnabled: true,
                    headerShown: false,
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ gestureEnabled: false, headerShown: false }} />
                  <Stack.Screen
                    name="post/[slug]"
                    options={{
                      animation: "slide_from_right",
                      fullScreenGestureEnabled: false,
                      gestureEnabled: true,
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="editor/[slug]"
                    options={{
                      animation: "slide_from_right",
                      fullScreenGestureEnabled: false,
                      gestureEnabled: true,
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="editor/new"
                    options={{
                      animation: "slide_from_bottom",
                      fullScreenGestureEnabled: false,
                      gestureEnabled: true,
                      headerShown: false,
                      presentation: "modal",
                    }}
                  />
                </Stack>
                <OfflineBanner />
              </View>
              <StatusBar style="auto" />
            </ToastProvider>
          </AuthProvider>
        </ApolloProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
