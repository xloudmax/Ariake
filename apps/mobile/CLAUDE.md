# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the **Expo / React Native mobile app** for the C404 blog platform. Repo-wide context (web frontend, Go backend, GraphQL schema location, JWT/refresh-token semantics) lives in the monorepo root `../../CLAUDE.md` — read it for backend-side conventions before touching anything that depends on the wire format.

## Commands

Run from `apps/mobile/`:

- `pnpm start` — Expo dev server (Metro). `pnpm ios` / `pnpm android` build and launch native dev clients.
- `pnpm codegen` — regenerate `src/generated/graphql.ts` from `../backend/graph/schema.graphql` and `src/graphql/**/*.graphql`. Run after **any** schema or `.graphql` operation change.
- `pnpm type-check` — `tsc --noEmit` (strict).
- `pnpm lint` / `pnpm lint:fix` — neostandard ESLint config; stylistic rules are intentionally off, so don't reformat to match. `react-hooks/*` and `no-console` (warn, allows `warn`/`error`) are enforced.
- `pnpm test` — Node's built-in test runner with `--experimental-strip-types`; matches `src/**/*.test.ts`. Single test: `node --experimental-strip-types --test src/path/to/file.test.ts`. **No Jest, no Vitest** — use `node:test` + `node:assert/strict`, not jest globals.
- `pnpm test:tdd` (alias of `test:watch`) — re-run tests on change.

## Architecture

### Routing — Expo Router (file-based, typed routes on)
- Entry: `index.ts` → `expo-router/entry`. Root layout is `app/_layout.tsx`.
- `app/_layout.tsx` blocks render until `setupApolloCache()` resolves (or hits a 3s timeout) so persisted Apollo cache is hydrated before any screen mounts.
- Tab shell is `app/(tabs)/_layout.tsx` using **native tabs** (`expo-router/unstable-native-tabs`) driven by `src/navigation/nativeTabsConfig.ts` — SF Symbols, so changes need to keep iOS-renderable symbol names.
- Detail route: `app/post/[slug].tsx`. New Architecture is enabled (`app.json: newArchEnabled: true`).

### GraphQL / Apollo (`src/apollo/`)
- `client.ts` composes `errorLink → authLink → httpLink`. Auth header is injected from an in-memory cache backed by `expo-secure-store` (see `src/utils/auth.ts`) so each request avoids a keychain IPC.
- **Refresh-token flow**: `errorLink` detects 401/403 or `UNAUTHENTICATED` GraphQL codes and runs a *single-flight* `refreshAccessToken()` (the `refreshingPromise` guard prevents stampedes when many queries 401 at once). On failure it calls `clearAuth()` + `notifyAuthInvalidated()`, which `AuthContext` listens to via `src/auth/authBridge.ts` and navigates to `/(tabs)/profile`. Don't add a second refresh path — extend this one.
- Apollo cache is persisted to `AsyncStorage` with a 4 MB cap. The hydration race in `_layout.tsx` is intentional: a slow restore must not block app launch indefinitely.
- API URL resolution lives in `src/apollo/apiUrl.ts` (`resolveMobileAPIUrl`). Precedence: `EXPO_PUBLIC_API_URL` env var → Expo `hostUri` (dev) → `10.0.2.2:11451` for Android emulator → `localhost:11451`. Production builds **throw** if `EXPO_PUBLIC_API_URL` is unset. The default backend port is `11451` (see root CLAUDE.md).

### GraphQL operations
- All `.graphql` files live under `src/graphql/`. Always reuse fragments from `fragments.graphql` instead of inlining fields — backend team relies on the consistent shape across web + mobile.
- Generated hooks come out of `src/generated/graphql.ts` (codegen config in `codegen.yml`: `withHooks: true`, `documentMode: 'documentNode'`, custom scalars `Time → string`, `Upload → { uri, name?, type? }`). **Do not edit generated files.**

### Auth state (`src/auth/`)
- `AuthContext` is the single source of truth for the React tree. It hydrates from SecureStore on mount and exposes `signIn` / `signOut`. Both call `client.resetStore()`; the `try/catch` is deliberate (it throws when in-flight queries exist).
- `authBridge.ts` is a tiny pub-sub used so the Apollo `errorLink` (non-React) can poke the React `AuthContext` without a circular import.

### Local-only insights (`src/insights/`)
- "Saved insights" + reading history are stored client-side in AsyncStorage — they are **not** server-synced. `insightStorage.ts` is a pure factory (`createInsightStorage(adapter, options)`) over a minimal `getItem/setItem/removeItem` interface, which is why it's testable under Node's test runner with an in-memory adapter (see `insightStorage.test.ts`). The platform binding `mobileInsightStorage.ts` just injects `AsyncStorage`.
- Storage keys are versioned (`c404.mobile.savedInsights.v1`, `…readingHistory.v1`); bump the suffix when changing the stored schema rather than migrating in place.

### Styling — NativeWind v4 + Tailwind 3.4
- `babel.config.js` sets `jsxImportSource: "nativewind"` and adds the `nativewind/babel` preset; `react-native-reanimated/plugin` must remain **last** in the plugins list.
- Global styles entry: `src/global.css`, wired via `withNativeWind(config, { input: "./src/global.css" })` in `metro.config.js`.
- `metro.config.js` also forces `react`, `react/jsx-runtime`, etc. to the local `node_modules/react` to prevent duplicate-React issues under the monorepo + New Architecture.

## Conventions specific to this app

- **Tests**: `node:test` only. Don't add Jest, RNTL, or Detox without first discussing — the current design keeps logic in plain TS modules that are testable without a native runtime, which is why `insightStorage` and `apiUrl` have unit tests but UI components don't.
- **Linting**: `neostandard` with stylistic rules off. Don't introduce Prettier or rewrite for indentation/quote style — those are deliberately unenforced.
- **Console**: `console.log` warns; use `console.warn`/`console.error` for diagnostics that should ship.
- **Secrets**: tokens go through `src/utils/auth.ts`. Never call `SecureStore` directly from screens — bypassing the in-memory cache regresses request latency.
- **Generated code**: `src/generated/` and `.expo/` are excluded from lint and must not be hand-edited.
