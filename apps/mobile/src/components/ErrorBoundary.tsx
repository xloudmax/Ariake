import React, { Component, type ReactNode } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

import { i18n } from "../i18n";
import { reportError } from "../utils/mobileErrorReporter";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    reportError(error, {
      tag: "render.errorBoundary",
      severity: "fatal",
      extra: { componentStack: info.componentStack },
    });
  }

  handleReset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-slate-950">
        <View className="w-full max-w-md">
          <Text className="mb-3 text-2xl font-black text-gray-900 dark:text-gray-50">
            {i18n.t("common.error")}
          </Text>
          <Text className="mb-5 text-sm text-gray-600 dark:text-gray-400">
            {error.message || String(error)}
          </Text>
          {__DEV__ && error.stack ? (
            <ScrollView className="mb-5 max-h-64 rounded-2xl bg-gray-100 p-3 dark:bg-slate-900">
              <Text className="font-mono text-xs text-gray-700 dark:text-gray-300">
                {error.stack}
              </Text>
            </ScrollView>
          ) : null}
          <TouchableOpacity
            accessibilityLabel={i18n.t("common.tryAgain")}
            accessibilityRole="button"
            className="self-start rounded-full bg-blue-600 px-5 py-3"
            onPress={this.handleReset}
          >
            <Text className="text-sm font-extrabold text-white">
              {i18n.t("common.tryAgain")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}
