import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { nativeTabs } from "./nativeTabsConfig.ts";

describe("nativeTabs", () => {
  it("keeps the visible tabs in route order", () => {
    assert.deepEqual(
      nativeTabs.map((tab) => tab.name),
      ["index", "search", "insight", "create", "profile"],
    );
  });

  it("uses i18n label keys for the bottom navigation", () => {
    assert.deepEqual(
      nativeTabs.map((tab) => tab.labelKey),
      ["tabs.home", "tabs.search", "tabs.insight", "tabs.create", "tabs.profile"],
    );
  });

  it("uses selected SF Symbols for native iOS tab feedback", () => {
    assert.deepEqual(
      nativeTabs.map((tab) => tab.sf.selected),
      ["house.fill", "magnifyingglass", "waveform.path.ecg", "plus.circle.fill", "person.fill"],
    );
  });

  it("marks the search tab with the native search role", () => {
    assert.equal(nativeTabs.find((tab) => tab.name === "search")?.role, "search");
  });
});
