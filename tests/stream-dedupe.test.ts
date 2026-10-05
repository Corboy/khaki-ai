import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectFrames,
  skipRepeatedTextBlocks,
  textBlock,
  textOfFrames,
  type TextFrame,
} from "@/lib/stream-dedupe";

/**
 * Tests for the duplicate-suppression pass.
 *
 * This sits directly in the path every reply travels, so the cases that matter
 * are the ones where it might eat an answer that is not a duplicate. A reply
 * silently disappearing is far worse than one said twice.
 */

const run = (frames: TextFrame[]) => collectFrames(skipRepeatedTextBlocks(frames));

describe("a normal reply is untouched", () => {
  it("passes a single text block straight through", async () => {
    const frames = textBlock("0", "Bei zinaanzia TSH 170,000/=");
    const out = await run(frames);
    assert.equal(textOfFrames(out), "Bei zinaanzia TSH 170,000/=");
    assert.deepEqual(out, frames);
  });

  it("keeps the tool frames around it", async () => {
    const frames: TextFrame[] = [
      { type: "start-step" },
      { type: "tool-input-available", id: "c1" },
      { type: "tool-output-available", id: "c1" },
      { type: "finish-step" },
      ...textBlock("0", "Haya hapa bei zetu."),
      { type: "finish" },
    ];
    const out = await run(frames);
    assert.equal(out.length, frames.length);
    assert.equal(out.filter((f) => f.type === "tool-output-available").length, 1);
    assert.equal(textOfFrames(out), "Haya hapa bei zetu.");
  });
});

describe("a repeated second block is dropped", () => {
  it("emits the first block and not the second", async () => {
    const answer = "Samahani sana kwa usumbufu huu. Tafadhali wasiliana na timu yetu.";
    const frames = [...textBlock("0", answer), ...textBlock("aitxt-abc", answer)];
    const out = await run(frames);
    assert.equal(textOfFrames(out), answer, "the customer should read it once");
    assert.equal(out.filter((f) => f.type === "text-start").length, 1);
  });

  it("notices a repeat that differs only in surrounding whitespace", async () => {
    const answer = "Jibu moja tu.";
    const frames = [...textBlock("0", answer), ...textBlock("1", `  ${answer}\n`)];
    const out = await run(frames);
    assert.equal(textOfFrames(out).trim(), answer);
  });

  it("drops a repeat even when split into differently sized chunks", async () => {
    const answer = "Karibu Khaki Media. Tunafanya sendoff na harusi.";
    const frames = [...textBlock("0", answer, 5), ...textBlock("1", answer, 17)];
    const out = await run(frames);
    assert.equal(textOfFrames(out), answer);
  });
});

describe("what it must never do", () => {
  it("keeps a second block that genuinely differs", async () => {
    const frames = [
      ...textBlock("0", "Ngoja nikuangalie bei."),
      { type: "tool-input-available", id: "c1" },
      ...textBlock("1", "Diamond ni TSH 2,000,000/=."),
    ];
    const out = await run(frames);
    assert.equal(
      textOfFrames(out),
      "Ngoja nikuangalie bei.Diamond ni TSH 2,000,000/=.",
      "a real second block was swallowed",
    );
    assert.equal(out.filter((f) => f.type === "text-start").length, 2);
  });

  it("keeps a third block", async () => {
    const frames = [...textBlock("0", "Kwanza."), ...textBlock("1", "Pili."), ...textBlock("2", "Tatu.")];
    const out = await run(frames);
    assert.equal(textOfFrames(out), "Kwanza.Pili.Tatu.");
  });

  it("keeps an empty second block rather than crashing", async () => {
    const frames = [...textBlock("0", "Jibu."), ...textBlock("1", "")];
    const out = await run(frames);
    assert.equal(textOfFrames(out), "Jibu.");
  });

  it("survives a stream with no text at all", async () => {
    const frames: TextFrame[] = [{ type: "start-step" }, { type: "finish-step" }, { type: "finish" }];
    const out = await run(frames);
    assert.deepEqual(out, frames);
  });

  it("survives an unterminated block", async () => {
    const frames: TextFrame[] = [
      { type: "text-start", id: "0" },
      { type: "text-delta", id: "0", delta: "Bei " },
      { type: "text-delta", id: "0", delta: "zikoje?" },
    ];
    assert.doesNotThrow(async () => run(frames));
  });

  it("preserves the order of everything it keeps", async () => {
    const frames = [
      { type: "start-step" },
      ...textBlock("0", "Moja."),
      { type: "finish-step" },
      { type: "start-step" },
      ...textBlock("1", "Moja."),
      { type: "finish-step" },
    ];
    const out = await run(frames);
    const types = out.map((f) => f.type);
    assert.deepEqual(types, [
      "start-step",
      "text-start",
      "text-delta",
      "text-end",
      "finish-step",
      "start-step",
      "finish-step",
    ]);
  });
});
