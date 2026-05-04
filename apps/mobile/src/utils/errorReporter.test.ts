import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import { createErrorReporter, type Breadcrumb, type ErrorSink } from "./errorReporter.ts";

let nowCounter = 0;
const fixedNow = () => `2026-01-01T00:00:${String(nowCounter++).padStart(2, "0")}.000Z`;

beforeEach(() => {
  nowCounter = 0;
});

describe("createErrorReporter — sinks", () => {
  it("fans out to every registered sink with normalized error + context", () => {
    const reporter = createErrorReporter({ now: fixedNow });
    const events: Parameters<ErrorSink>[0][] = [];
    reporter.addSink((evt) => events.push(evt));
    reporter.addSink((evt) => events.push(evt));

    reporter.report(new Error("boom"), { tag: "post.submit", extra: { slug: "abc" } });

    assert.equal(events.length, 2);
    assert.equal(events[0].error.message, "boom");
    assert.equal(events[0].context.tag, "post.submit");
    assert.equal(events[0].context.severity, "error");
    assert.deepEqual(events[0].context.extra, { slug: "abc" });
  });

  it("normalizes non-Error inputs (strings, objects) into Error instances", () => {
    const reporter = createErrorReporter();
    const events: Parameters<ErrorSink>[0][] = [];
    reporter.addSink((evt) => events.push(evt));

    reporter.report("oops");
    reporter.report({ code: 42 });

    assert.ok(events[0].error instanceof Error);
    assert.equal(events[0].error.message, "oops");
    assert.ok(events[1].error instanceof Error);
    assert.match(events[1].error.message, /"code":42/);
  });

  it("returns an unsubscribe function from addSink", () => {
    const reporter = createErrorReporter();
    let count = 0;
    const unsubscribe = reporter.addSink(() => { count += 1; });
    reporter.report(new Error("a"));
    unsubscribe();
    reporter.report(new Error("b"));
    assert.equal(count, 1);
  });

  it("isolates a sink that throws — other sinks still receive the event", () => {
    const reporter = createErrorReporter();
    let bGotIt = false;
    reporter.addSink(() => { throw new Error("sink crashed"); });
    reporter.addSink(() => { bGotIt = true; });
    reporter.report(new Error("event"));
    assert.equal(bGotIt, true);
  });
});

describe("createErrorReporter — breadcrumbs", () => {
  it("appends a breadcrumb on every report() with timestamp and level", () => {
    const reporter = createErrorReporter({ now: fixedNow });
    reporter.report(new Error("first"), { tag: "auth.signin" });
    reporter.report(new Error("second"), { tag: "post.like", severity: "warn" });

    const crumbs = reporter.getBreadcrumbs();
    assert.equal(crumbs.length, 2);
    assert.equal(crumbs[0].message, "first");
    assert.equal(crumbs[0].level, "error");
    assert.equal(crumbs[0].tag, "auth.signin");
    assert.equal(crumbs[0].at, "2026-01-01T00:00:00.000Z");
    assert.equal(crumbs[1].level, "warn");
    assert.equal(crumbs[1].at, "2026-01-01T00:00:01.000Z");
  });

  it("supports breadcrumb() for non-error notes (info/debug logs)", () => {
    const reporter = createErrorReporter({ now: fixedNow });
    reporter.breadcrumb("user opened post", { tag: "nav", extra: { slug: "x" } });
    reporter.breadcrumb("network reconnected", { tag: "net", severity: "info" });

    const crumbs = reporter.getBreadcrumbs();
    assert.equal(crumbs.length, 2);
    assert.equal(crumbs[0].message, "user opened post");
    assert.equal(crumbs[0].level, "info");
    assert.deepEqual(crumbs[0].extra, { slug: "x" });
  });

  it("respects the breadcrumbLimit (oldest entries dropped)", () => {
    const reporter = createErrorReporter({ breadcrumbLimit: 3 });
    for (let i = 0; i < 5; i += 1) {
      reporter.breadcrumb(`step ${i}`);
    }
    const crumbs = reporter.getBreadcrumbs();
    assert.equal(crumbs.length, 3);
    assert.deepEqual(crumbs.map((c: Breadcrumb) => c.message), ["step 2", "step 3", "step 4"]);
  });

  it("includes a breadcrumb snapshot in the sink event", () => {
    const reporter = createErrorReporter();
    let captured: Breadcrumb[] | null = null;
    reporter.addSink(({ breadcrumbs }) => { captured = breadcrumbs.slice(); });

    reporter.breadcrumb("opened editor");
    reporter.breadcrumb("clicked publish");
    reporter.report(new Error("publish failed"));

    assert.ok(captured);
    const crumbs = captured as Breadcrumb[];
    // 2 breadcrumbs + the report itself = 3
    assert.equal(crumbs.length, 3);
    assert.equal(crumbs[0].message, "opened editor");
    assert.equal(crumbs[2].message, "publish failed");
  });

  it("reset() clears breadcrumbs and sinks", () => {
    const reporter = createErrorReporter();
    let calls = 0;
    reporter.addSink(() => { calls += 1; });
    reporter.breadcrumb("note 1");
    reporter.breadcrumb("note 2");
    assert.equal(reporter.getBreadcrumbs().length, 2);
    reporter.reset();
    assert.equal(reporter.getBreadcrumbs().length, 0);

    reporter.report(new Error("after reset"));
    // sinks were cleared too, so the existing subscriber is gone.
    assert.equal(calls, 0);
    // A new breadcrumb is recorded for this report (next call would replay it).
    assert.equal(reporter.getBreadcrumbs().length, 1);
  });
});
