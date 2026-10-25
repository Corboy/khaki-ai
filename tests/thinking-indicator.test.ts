import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";

Object.assign(globalThis, { React });
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";

import { AmbientBackdrop } from "@/components/brand/ambient-backdrop";
import { LiveRoomIndicator } from "@/components/brand/live-room-indicator";
import { ThinkingRobot } from "@/components/brand/thinking-robot";

describe("AmbientBackdrop", () => {
  it("stays static instead of changing while the assistant thinks", () => {
    const html = renderToStaticMarkup(React.createElement(AmbientBackdrop));

    assert.doesNotMatch(html, /animate-drift|ambient-light|Thinking sweep/);
  });
});

describe("LiveRoomIndicator", () => {
  it("uses one compact, accessible, text-led status instead of the old meter card", () => {
    const html = renderToStaticMarkup(React.createElement(LiveRoomIndicator));

    assert.match(html, /data-thinking-robot="true"/);
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

describe("thinking robot animation asset", () => {
  it("has a dedicated loopable thinking segment", () => {
    const animation = JSON.parse(
      readFileSync(join(process.cwd(), "public/animations/khaki-thinking.json"), "utf8"),
    ) as { markers?: Array<{ cm: string; tm: number; dr: number }> };
    const marker = animation.markers?.find(({ cm }) => cm === "thinking");

    assert.ok(marker, "the Lottie asset should keep its named thinking marker");
    assert.deepEqual([marker.tm, marker.dr], [271, 119]);
  });

  it("uses the exact Khaki brass accent instead of source purple and neon yellow", () => {
    const animation = JSON.parse(
      readFileSync(join(process.cwd(), "public/animations/khaki-thinking.json"), "utf8"),
    ) as unknown;
    const source = JSON.stringify(animation);
    const colors: number[][] = [];

    const collectColorTrack = (value: unknown) => {
      if (!Array.isArray(value)) return;
      if (value.length >= 3 && value.slice(0, 3).every((channel) => typeof channel === "number")) {
        colors.push(value.slice(0, 3) as number[]);
        return;
      }
      for (const keyframe of value) {
        if (!keyframe || typeof keyframe !== "object" || Array.isArray(keyframe)) continue;
        const frame = keyframe as Record<string, unknown>;
        if ("s" in frame) collectColorTrack(frame.s);
        if ("e" in frame) collectColorTrack(frame.e);
      }
    };
    const visit = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (!value || typeof value !== "object") return;
      const node = value as Record<string, unknown>;
      if ((node.ty === "fl" || node.ty === "st") && node.c && typeof node.c === "object") {
        collectColorTrack((node.c as Record<string, unknown>).k);
      }
      Object.values(node).forEach(visit);
    };
    const thinkingLayer = (
      animation as { layers?: Array<Record<string, unknown> & { nm?: string }> }
    ).layers?.find(({ nm }) => nm === "THINK");
    assert.ok(thinkingLayer, "the asset should retain its thinking artwork layer");
    visit(thinkingLayer);

    const brandRgb = [212, 175, 55];
    assert.ok(
      colors.some(
        (color) =>
          color.every((channel, i) => Math.floor(channel * 255) === brandRgb[i]) &&
          color[2] >= 55.1 / 255,
      ),
      "the thinking artwork should render as Khaki brass despite Lottie float rounding",
    );
    assert.doesNotMatch(source, /0\.7098,0\.0078,0\.9412|1,0\.9412,0|0,0\.0824,0\.3804/);
  });
});
