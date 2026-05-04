import { useCallback, useMemo, useRef, useState, type ComponentType } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { API_URL } from "../../src/apollo/client";
import { useLoginMutation, useMeQuery, useRegisterMutation } from "../../src/generated/graphql";
import { useAuth } from "../../src/auth/AuthContext";
import { contentPaddingForTabBar } from "../../src/components/layoutConstants";
import { ScreenHeader } from "../../src/components/ScreenPrimitives";
import { getAPIBaseUrl, type StoredUser } from "../../src/utils/auth";
import { useI18n } from "../../src/i18n/I18nProvider";
import { useToast } from "../../src/components/Toast/ToastProvider";

type LoginFormProps = {
  mode: "login" | "register";
  email: string;
  username: string;
  password: string;
  inviteCode: string;
  authLoading: boolean;
  oauthLoading: boolean;
  authError?: Error;
  onModeChange: (mode: "login" | "register") => void;
  onEmailChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onInviteCodeChange: (value: string) => void;
  onSubmit: () => void;
  onGithubLogin: () => void;
};

type SwiftUIComponents = typeof import("@expo/ui/swift-ui");

let nativeIOSLoginFormComponent: ComponentType<LoginFormProps> | null | undefined;

function getNativeIOSLoginForm(): ComponentType<LoginFormProps> | null {
  if (nativeIOSLoginFormComponent !== undefined) {
    return nativeIOSLoginFormComponent;
  }

  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === "expo";

  if (Platform.OS !== "ios" || isExpoGo) {
    nativeIOSLoginFormComponent = null;
    return nativeIOSLoginFormComponent;
  }

  try {
    const {
      Button: SwiftButton,
      Form,
      Host,
      Section,
      SecureField,
      Text: SwiftText,
      TextField,
    } = require("@expo/ui/swift-ui") as SwiftUIComponents;

    nativeIOSLoginFormComponent = function NativeIOSLoginForm({
      mode,
      email,
      username,
      password,
      inviteCode,
      authLoading,
      oauthLoading,
      authError,
      onModeChange,
      onEmailChange,
      onUsernameChange,
      onPasswordChange,
      onInviteCodeChange,
      onSubmit,
      onGithubLogin,
    }: LoginFormProps) {
      const { t } = useI18n();
      const isRegister = mode === "register";

      return (
        <View className="flex-1 bg-gray-50">
          <Host style={{ flex: 1 }} useViewportSizeMeasurement>
            <Form scrollEnabled={false}>
              <Section title={isRegister ? t("profile.createAccount") : t("profile.welcomeBack")}>
                <SwiftText size={15} color="#6b7280">
                  {isRegister ? t("profile.createAccountDescription") : t("profile.signInDescription")}
                </SwiftText>
                {isRegister ? (
                  <TextField
                    defaultValue={username}
                    placeholder={t("profile.username")}
                    autocorrection={false}
                    onChangeText={onUsernameChange}
                  />
                ) : null}
                <TextField
                  defaultValue={email}
                  placeholder={t("profile.email")}
                  keyboardType="email-address"
                  autocorrection={false}
                  onChangeText={onEmailChange}
                />
                <SecureField
                  defaultValue={password}
                  placeholder={t("profile.password")}
                  onChangeText={onPasswordChange}
                />
                {isRegister ? (
                  <TextField
                    defaultValue={inviteCode}
                    placeholder={t("profile.inviteCodePlaceholder")}
                    autocorrection={false}
                    onChangeText={onInviteCodeChange}
                  />
                ) : null}
                <SwiftButton
                  onPress={onSubmit}
                  variant="borderedProminent"
                  controlSize="large"
                  disabled={authLoading}
                >
                  {authLoading ? t("profile.pleaseWait") : isRegister ? t("profile.createAccount") : t("profile.signIn")}
                </SwiftButton>
                <SwiftButton
                  onPress={() => onModeChange(isRegister ? "login" : "register")}
                  variant="bordered"
                  controlSize="regular"
                  disabled={authLoading}
                >
                  {isRegister ? t("profile.alreadyHaveAccount") : t("profile.createNewAccount")}
                </SwiftButton>
                <SwiftButton
                  onPress={onGithubLogin}
                  variant="bordered"
                  controlSize="regular"
                  disabled={oauthLoading}
                >
                  {oauthLoading ? t("profile.openingGithub") : t("profile.github")}
                </SwiftButton>
              </Section>

              {authError ? (
                <Section>
                  <SwiftText color="#ef4444">{authError.message}</SwiftText>
                </Section>
              ) : null}
            </Form>
          </Host>
        </View>
      );
    };
  } catch (error) {
    console.warn("Native iOS login form is unavailable; falling back to React Native.", error);
    nativeIOSLoginFormComponent = null;
  }

  return nativeIOSLoginFormComponent;
}

function LoginForm(props: LoginFormProps) {
  const NativeIOSLoginForm = getNativeIOSLoginForm();

  if (NativeIOSLoginForm) {
    return <NativeIOSLoginForm {...props} />;
  }

  return <ReactNativeLoginForm {...props} />;
}

function ReactNativeLoginForm({
  mode,
  email,
  username,
  password,
  inviteCode,
  authLoading,
  oauthLoading,
  authError,
  onModeChange,
  onEmailChange,
  onUsernameChange,
  onPasswordChange,
  onInviteCodeChange,
  onSubmit,
  onGithubLogin,
}: LoginFormProps) {
  const { t } = useI18n();
  const isRegister = mode === "register";
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const usernameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const inviteCodeInputRef = useRef<TextInput>(null);

  const submitFromKeyboard = useCallback(() => {
    Keyboard.dismiss();
    setSubmitAttempted(true);
    onSubmit();
  }, [onSubmit]);

  return (
    <View className="flex-1 px-6 justify-center mt-8">
      <View className="bg-white p-6 rounded-[28px] shadow-lg shadow-black/5 border border-gray-100">
        <View className="items-center mb-8">
          <View className="w-16 h-16 bg-blue-50 rounded-2xl items-center justify-center mb-4">
            <Octicons name={isRegister ? "person-add" : "person"} size={32} color="#3b82f6" />
          </View>
          <Text className="text-2xl font-bold text-gray-800">{isRegister ? t("profile.createAccount") : t("profile.welcomeBack")}</Text>
          <Text className="text-gray-500 mt-1 text-center">
            {isRegister ? t("profile.createAccountDescription") : t("profile.signInDescription")}
          </Text>
        </View>

        {authError && (
          <Text className="text-red-500 text-center mb-4 bg-red-50 py-2 px-3 rounded-lg">
            {authError.message}
          </Text>
        )}

        {isRegister ? (
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">{t("profile.username")}</Text>
            <TextInput
              ref={usernameInputRef}
              value={username}
              onChangeText={onUsernameChange}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800"
              placeholder={t("profile.usernamePlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => emailInputRef.current?.focus()}
            />
            {submitAttempted && isRegister && !username.trim() ? (
              <Text accessibilityLiveRegion="polite" className="mt-1 ml-1 text-xs font-bold text-red-500">
                {t("common.usernameRequired")}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">{t("profile.email")}</Text>
          <TextInput
            ref={emailInputRef}
            value={email}
            onChangeText={onEmailChange}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800"
            placeholder={t("profile.emailPlaceholder")}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordInputRef.current?.focus()}
          />
          {submitAttempted && !email.trim() ? (
            <Text accessibilityLiveRegion="polite" className="mt-1 ml-1 text-xs font-bold text-red-500">
              {t("common.emailRequired")}
            </Text>
          ) : null}
        </View>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">{t("profile.password")}</Text>
          <TextInput
            ref={passwordInputRef}
            value={password}
            onChangeText={onPasswordChange}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800"
            placeholder={t("profile.passwordPlaceholder")}
            secureTextEntry
            textContentType={isRegister ? "newPassword" : "password"}
            returnKeyType={isRegister ? "next" : "done"}
            blurOnSubmit={!isRegister}
            onSubmitEditing={() => {
              if (isRegister) {
                inviteCodeInputRef.current?.focus();
                return;
              }
              submitFromKeyboard();
            }}
          />
          {submitAttempted && !password ? (
            <Text accessibilityLiveRegion="polite" className="mt-1 ml-1 text-xs font-bold text-red-500">
              {t("common.passwordRequired")}
            </Text>
          ) : null}
        </View>

        {isRegister ? (
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">{t("profile.inviteCode")}</Text>
            <TextInput
              ref={inviteCodeInputRef}
              value={inviteCode}
              onChangeText={onInviteCodeChange}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800"
              placeholder={t("profile.inviteCodePlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={submitFromKeyboard}
            />
          </View>
        ) : <View className="mb-2" />}

        <TouchableOpacity
          onPress={submitFromKeyboard}
          disabled={authLoading}
          className={`bg-blue-500 rounded-2xl py-4 items-center flex-row justify-center shadow-lg shadow-blue-500/20 ${authLoading ? 'opacity-70' : ''}`}
        >
          {authLoading ? (
            <ActivityIndicator color="white" className="mr-2" />
          ) : null}
          <Text className="text-white font-bold text-lg">{authLoading ? t("profile.pleaseWait") : isRegister ? t("profile.createAccount") : t("profile.signIn")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onModeChange(isRegister ? "login" : "register")}
          disabled={authLoading}
          className="mt-4 items-center"
        >
          <Text className="text-blue-600 font-semibold">
            {isRegister ? t("profile.alreadyHaveAccount") : t("profile.needAccount")}
          </Text>
        </TouchableOpacity>

        <View className="h-px bg-gray-100 my-6" />

        <TouchableOpacity
          onPress={onGithubLogin}
          disabled={oauthLoading}
          className={`border border-gray-200 rounded-2xl py-4 items-center flex-row justify-center ${oauthLoading ? 'opacity-70' : ''}`}
        >
          {oauthLoading ? (
            <ActivityIndicator color="#111827" className="mr-2" />
          ) : (
            <Octicons name="mark-github" size={20} color="#111827" />
          )}
          <Text className="text-gray-900 font-bold text-base ml-2">
            {oauthLoading ? t("profile.openingGithub") : t("profile.github")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function toStoredUser(user: StoredUser): StoredUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
  };
}

function getOAuthRedirectUrl() {
  return Linking.createURL("/(tabs)/profile");
}

function getOAuthCode(result: WebBrowser.WebBrowserAuthSessionResult) {
  if (result.type !== "success") return null;
  const parsed = Linking.parse(result.url);
  const code = parsed.queryParams?.code;
  return typeof code === "string" ? code : null;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { ready, isAuthenticated, user, signIn, signOut } = useAuth();

  // Auth Form State
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);

  const [login, { loading: loginLoading, error: loginError }] = useLoginMutation();
  const [register, { loading: registerLoading, error: registerError }] = useRegisterMutation();
  const { data: meData, loading: meLoading } = useMeQuery({
    skip: !isAuthenticated,
    fetchPolicy: "cache-and-network"
  });

  const handleDismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleAuthSubmit = useCallback(async () => {
    Keyboard.dismiss();

    const normalizedEmail = email.trim();
    const normalizedUsername = username.trim();
    const trimmedInviteCode = inviteCode.trim();

    if (!normalizedEmail || !password) {
      return;
    }
    if (authMode === "register" && !normalizedUsername) {
      return;
    }

    try {
      if (authMode === "login") {
        const resp = await login({
          variables: { input: { identifier: normalizedEmail, password } }
        });
        const payload = resp.data?.login;
        if (payload?.token && payload.user) {
          await signIn({
            token: payload.token,
            refreshToken: payload.refreshToken,
            user: toStoredUser(payload.user),
          });
        }
        return;
      }

      const resp = await register({
        variables: {
          input: {
            username: normalizedUsername,
            email: normalizedEmail,
            password,
            ...(trimmedInviteCode ? { inviteCode: trimmedInviteCode } : {}),
          },
        },
      });
      const payload = resp.data?.register;
      if (payload?.token && payload.user) {
        await signIn({
          token: payload.token,
          refreshToken: payload.refreshToken,
          user: toStoredUser(payload.user),
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, [authMode, email, inviteCode, login, password, register, signIn, username]);

  const handleGithubLogin = useCallback(async () => {
    Keyboard.dismiss();
    setOauthLoading(true);
    try {
      const redirectUri = getOAuthRedirectUrl();
      const loginUrl = `${getAPIBaseUrl(API_URL)}/api/auth/github/login?redirect=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUri);
      const code = getOAuthCode(result);
      if (!code) return;

      const response = await fetch(`${getAPIBaseUrl(API_URL)}/api/auth/oauth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        throw new Error("GitHub sign-in failed. Please try again.");
      }
      const payload = await response.json() as { token?: string; refreshToken?: string; user?: StoredUser };
      if (!payload.token || !payload.user) {
        throw new Error(t("profile.githubReturnedInvalidSession"));
      }
      await signIn({
        token: payload.token,
        refreshToken: payload.refreshToken,
        user: toStoredUser(payload.user),
      });
    } catch (error) {
      console.error(error);
      showToast({
        variant: "error",
        message: error instanceof Error && error.message ? error.message : t("profile.githubFailedMessage"),
      });
    } finally {
      setOauthLoading(false);
    }
  }, [signIn, t, showToast]);

  const handleLogout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const contentContainerStyle = useMemo(() => ({
    flexGrow: 1,
    paddingTop: insets.top,
    paddingBottom: contentPaddingForTabBar(insets.bottom)
  }), [insets.top, insets.bottom]);

  if (!ready) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Prefer fresh data from the server, fall back to the cached StoredUser so
  // the dashboard renders immediately after hydration.
  const displayUser = meData?.me ?? user;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50 dark:bg-slate-950"
    >
      <TouchableWithoutFeedback accessible={false} onPress={handleDismissKeyboard}>
        <ScrollView
          contentContainerStyle={contentContainerStyle}
          bounces={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
        <ScreenHeader
          eyebrow={t("profile.eyebrow")}
          title={t("profile.title")}
          subtitle={isAuthenticated ? t("profile.authenticatedSubtitle") : t("profile.unauthenticatedSubtitle")}
        />

        {!isAuthenticated ? (
          <LoginForm
            mode={authMode}
            email={email}
            username={username}
            password={password}
            inviteCode={inviteCode}
            authLoading={loginLoading || registerLoading}
            oauthLoading={oauthLoading}
            authError={authMode === "login" ? loginError : registerError}
            onModeChange={setAuthMode}
            onEmailChange={setEmail}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onInviteCodeChange={setInviteCode}
            onSubmit={handleAuthSubmit}
            onGithubLogin={handleGithubLogin}
          />
        ) : (
          // Authenticated Dashboard
          <View className="px-5 mt-6">
            {meLoading && !displayUser ? (
               <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
            ) : (
              <>
                <View className="bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-lg shadow-black/5 border border-gray-100 dark:border-slate-800 items-center">
                  {displayUser?.avatar ? (
                    <Image source={{ uri: displayUser.avatar }} className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white shadow-lg" />
                  ) : (
                    <View className="w-24 h-24 rounded-[28px] bg-blue-50 items-center justify-center border-4 border-white shadow-lg">
                      <Octicons name="person" size={48} color="#3b82f6" />
                    </View>
                  )}

                  <Text className="text-2xl font-black text-gray-950 dark:text-gray-50 mt-4">{displayUser?.username || t("profile.anonymousUser")}</Text>
                  <Text className="text-gray-500 dark:text-gray-400 font-medium">{displayUser?.email}</Text>

                  <View className="px-3 py-1 bg-green-100 rounded-full mt-3">
                    <Text className="text-green-700 text-xs font-bold uppercase tracking-wider">{displayUser?.role}</Text>
                  </View>

                  <View className="w-full flex-row justify-around mt-8 pt-6 border-t border-gray-100">
                    <View className="items-center">
                      <Text className="text-2xl font-black text-gray-900 dark:text-gray-100">{meData?.me?.postsCount || 0}</Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">{t("profile.posts")}</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-2xl font-black text-gray-900 dark:text-gray-100">{t("profile.verified")}</Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">{t("profile.status")}</Text>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View className="mt-8 space-y-3">
                  <TouchableOpacity
                    onPress={handleLogout}
                    className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-950/50 rounded-2xl p-4 flex-row items-center justify-center shadow-sm"
                  >
                    <Octicons name="sign-out" size={18} color="#ef4444" />
                    <Text className="text-red-500 font-bold ml-2 text-lg">{t("profile.logOut")}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
