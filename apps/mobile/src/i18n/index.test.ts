import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizeLocale, createI18n } from "./core.ts";
import { formatPercent } from "@c404/shared";

describe("i18n", () => {
  it("normalizes Apple Chinese locale variants to Simplified Chinese", () => {
    assert.equal(normalizeLocale("zh-Hans-CN"), "zh-Hans");
    assert.equal(normalizeLocale("zh-Hant-HK"), "zh-Hans");
    assert.equal(normalizeLocale("zh"), "zh-Hans");
  });

  it("normalizes English locale variants to base English", () => {
    assert.equal(normalizeLocale("en-US"), "en");
    assert.equal(normalizeLocale("en-GB"), "en");
    assert.equal(normalizeLocale("en"), "en");
  });

  it("falls back to English for unsupported languages", () => {
    assert.equal(normalizeLocale("ja-JP"), "en");
    assert.equal(normalizeLocale("fr"), "en");
    assert.equal(normalizeLocale(null), "en");
    assert.equal(normalizeLocale(undefined), "en");
  });

  it("translates known keys correctly", () => {
    const i18n = createI18n("zh-Hans");
    assert.equal(i18n.t("common.loading"), "加载中...");

    i18n.locale = "en";
    assert.equal(i18n.t("common.loading"), "Loading...");
  });

  it("formats percentages correctly", () => {
    assert.equal(formatPercent(0.42), "42%");
    assert.equal(formatPercent(1), "100%");
    assert.equal(formatPercent(0), "0%");
  });
});
