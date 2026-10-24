import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampComposerHeight, visualViewportLayout, visualViewportOffset } from "@/lib/mobile-layout";

describe("mobile layout math", () => {
  it("keeps the composer within its minimum and maximum", () => {
    assert.equal(clampComposerHeight(72, 88, 320), 88);
    assert.equal(clampComposerHeight(280, 88, 320), 280);
    assert.equal(clampComposerHeight(600, 88, 320), 320);
    assert.equal(clampComposerHeight(0), 88);
  });

  it("uses the layout viewport when visualViewport is unavailable", () => {
    assert.deepEqual(visualViewportLayout(undefined, 844, 0), {
      viewportHeight: 844,
      keyboardOffset: 0,
    });
  });

  it("passes the visual viewport displacement to the layout", () => {
    assert.deepEqual(visualViewportLayout(390, 844, 0), {
      viewportHeight: 390,
      keyboardOffset: 454,
    });
  });

  it("reports the keyboard displacement without negative values", () => {
    assert.equal(visualViewportOffset(844, 844, 0), 0);
    assert.equal(visualViewportOffset(390, 844, 0), 454);
    assert.equal(visualViewportOffset(900, 844, -20), 0);
  });
});
