import assert from "node:assert/strict";
import * as React from "react";

Object.assign(globalThis, { React });
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";

import { AmbientBackdrop } from "@/components/brand/ambient-backdrop";
import { LiveRoomIndicator } from "@/components/brand/live-room-indicator";

describe("AmbientBackdrop", () => {
  it("stays static instead of changing while the assistant thinks", () => {
    const html = renderToStaticMarkup(React.createElement(AmbientBackdrop));

    assert.doesNotMatch(html, /animate-drift|ambient-light|Thinking sweep/);
  });
});

describe("LiveRoomIndicator", () => {
  it("uses one compact, accessible, text-led status instead of the old meter card", () => {
    const html = renderToStaticMarkup(React.createElement(LiveRoomIndicator));

    assert.match(html, /role="status"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /Khaki AI inafikiria/);
    assert.match(html, /thinking-status-dots/);
    assert.equal((html.match(/thinking-status-dot(?:\s|\")/g) ?? []).length, 3);
    assert.doesNotMatch(html, /animate-wave|animate-orbit|surface-card|rounded-2xl/);
  });

  it("preserves a caller-provided status label", () => {
    const html = renderToStaticMarkup(
      React.createElement(LiveRoomIndicator, { label: "Inatayarisha bei" }),
    );

    assert.match(html, /Inatayarisha bei/);
  });
});
