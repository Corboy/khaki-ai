import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  it("uses the complete Khaki brand mark for the accessible thinking status", () => {
    const html = renderToStaticMarkup(React.createElement(LiveRoomIndicator));

    assert.match(html, /data-khaki-thinking-mark="true"/);
    assert.match(html, /role="status"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /Khaki AI inafikiria/);
    assert.match(html, /class="thinking-status-label"/);
    assert.match(html, /src="\/images\/khaki-logo-256\.webp"/);
    assert.match(html, /style="width:30px;height:30px"/);
    assert.match(html, /thinking-status-dots/);
    assert.equal(html.split("thinking-status-dot").length - 1, 4);
    assert.doesNotMatch(html, /KhakiGlyph|data-thinking-robot|animate-wave|animate-orbit|surface-card/);
  });

  it("preserves a caller-provided status label", () => {
    const html = renderToStaticMarkup(
      React.createElement(LiveRoomIndicator, { label: "Inatayarisha bei" }),
    );

    assert.match(html, /Inatayarisha bei/);
  });

  it("animates the active status subtly and freezes every cue for reduced motion", () => {
    const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
    const reducedMotion = css.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.thinking-status-mark::before\s*\{[^}]+\}\s*\.thinking-status-label\s*\{[^}]+\}\s*\.thinking-status-dot\s*\{[^}]+\}\s*\}/,
    )?.[0];

    assert.match(css, /\.thinking-status-mark::before\s*\{[^}]*animation:\s*thinking-mark-halo/s);
    assert.match(css, /@keyframes thinking-mark-halo[\s\S]*?50%[\s\S]*?transform:/);
    assert.match(css, /\.thinking-status-label\s*\{[^}]*animation:\s*thinking-label-breathe/s);
    assert.match(css, /@keyframes thinking-label-breathe[\s\S]*?50%[\s\S]*?color:/);
    assert.ok(reducedMotion, "reduced-motion styles freeze the halo and status dots");
    assert.match(reducedMotion, /animation:\s*none/);
  });
});
