import assert from "node:assert/strict";
import * as React from "react";

Object.assign(globalThis, { React });
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";

import { AmbientBackdrop } from "@/components/brand/ambient-backdrop";
import { LiveRoomIndicator } from "@/components/brand/live-room-indicator";

describe("AmbientBackdrop", () => {
  it("is a plain, static canvas behind the conversation", () => {
    const html = renderToStaticMarkup(React.createElement(AmbientBackdrop));

    assert.match(html, /bg-black/);
    assert.doesNotMatch(html, /animate-|grain|radial-gradient/);
  });
});

describe("LiveRoomIndicator", () => {
  it("uses a compact static Khaki mark and an accessible text-led status", () => {
    const html = renderToStaticMarkup(React.createElement(LiveRoomIndicator));

    assert.match(html, /data-khaki-thinking-mark="true"/);
    assert.match(html, /role="status"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /Khaki AI inafikiria/);
    assert.match(html, /thinking-status-dots/);
    assert.equal((html.match(/thinking-status-dot(?:\s|\")/g) ?? []).length, 3);
    assert.doesNotMatch(html, /data-thinking-robot|animate-wave|animate-orbit|surface-card/);
  });

  it("preserves a caller-provided status label", () => {
    const html = renderToStaticMarkup(
      React.createElement(LiveRoomIndicator, { label: "Inatayarisha bei" }),
    );

    assert.match(html, /Inatayarisha bei/);
  });
});
