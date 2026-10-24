import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { visualViewportLayout, visualViewportOffset } from "@/lib/mobile-layout";

describe("mobile layout math", () => {
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
