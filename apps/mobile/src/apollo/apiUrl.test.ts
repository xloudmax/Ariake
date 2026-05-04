import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveMobileAPIUrl } from "./apiUrl.ts";

describe("resolveMobileAPIUrl", () => {
  it("uses the configured public API URL and appends the GraphQL path when needed", () => {
    assert.equal(
      resolveMobileAPIUrl({
        configuredURL: "https://api.example.com",
        isDev: false,
        platformOS: "ios",
      }),
      "https://api.example.com/graphql",
    );
  });

  it("does not duplicate the GraphQL path on configured URLs", () => {
    assert.equal(
      resolveMobileAPIUrl({
        configuredURL: "https://api.example.com/graphql/",
        isDev: false,
        platformOS: "android",
      }),
      "https://api.example.com/graphql",
    );
  });

  it("resolves the Expo dev server host for local development", () => {
    assert.equal(
      resolveMobileAPIUrl({
        isDev: true,
        platformOS: "ios",
        hostUri: "192.168.1.12:8081",
      }),
      "http://192.168.1.12:11451/graphql",
    );
  });

  it("maps Android localhost development traffic to the emulator host", () => {
    assert.equal(
      resolveMobileAPIUrl({
        isDev: true,
        platformOS: "android",
        hostUri: "localhost:8081",
      }),
      "http://10.0.2.2:11451/graphql",
    );
  });

  it("fails fast when production builds do not configure a public API URL", () => {
    assert.throws(
      () => resolveMobileAPIUrl({ isDev: false, platformOS: "ios" }),
      /EXPO_PUBLIC_API_URL must be configured/,
    );
  });
});
