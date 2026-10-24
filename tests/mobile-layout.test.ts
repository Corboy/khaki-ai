import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampComposerHeight, visualViewportOffset } from "@/lib/mobile-layout";

describe("mobile layout math", () => {
  it("keeps the composer inside a reduced keyboard viewport", () => {
    assert.equal(clampComposerHeight(280, 88, 320), 280);
    assert.equal(clampComposerHeight(72, 88, 320), 88);
    assert.equal(clampComposerHeight(600, 88, 320), 320);
  });

  it("reports the keyboard displacement without negative values", () => {
    assert.equal(visualViewportOffset(844, 844, 0), 0);
    assert.equal(visualViewportOffset(390, 844, 0), 454);
    assert.equal(visualViewportOffset(900, 844, -20), 0);
  });
});
