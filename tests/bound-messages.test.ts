import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  boundMessages,
  MAX_CONTEXT_CHARS,
  MAX_CONTEXT_MESSAGES,
  wasTrimmed,
} from "@/lib/bound-messages";

/**
 * Tests for the request bounds.
 *
 * This is the only thing standing between a deployed URL and the studio's API
 * bill. There is no login and no rate limit, so a request that is not bounded
 * here is bounded nowhere.
 *
 * The property that matters most: the last message is never dropped. Losing it
 * would have the model answer a question the customer did not ask -- a worse
 * outcome than any amount of trimming.
 */

const message = (role: "user" | "assistant", text: string) => ({
  id: `${role}-${text.length}-${Math.random()}`,
  role,
  parts: [{ type: "text" as const, text }],
});

/** The text a message carries, whatever shape its parts happen to be. */
const textOf = (m: { parts: ReadonlyArray<{ type: string; text?: string }> }): string =>
  m.parts.map((part) => (part.type === "text" ? (part.text ?? "") : "")).join("");

describe("short conversations pass through untouched", () => {
  it("keeps a normal exchange whole", () => {
    const messages = [
      message("user", "Bei zikoje?"),
      message("assistant", "Zinaanzia TSH 170,000/=."),
      message("user", "Diamond ina nini?"),
    ];
    const bounded = boundMessages(messages);
    assert.equal(bounded.length, 3);
    assert.equal(wasTrimmed(messages, bounded), false);
  });

  it("returns an empty list for an empty conversation", () => {
    assert.deepEqual(boundMessages([]), []);
  });
});

describe("the number of turns is capped", () => {
  it("keeps only the most recent turns", () => {
    const messages = Array.from({ length: 200 }, (_, i) =>
      message(i % 2 === 0 ? "user" : "assistant", `ujumbe ${i}`),
    );
    const bounded = boundMessages(messages);
    assert.ok(
      bounded.length <= MAX_CONTEXT_MESSAGES,
      `expected at most ${MAX_CONTEXT_MESSAGES}, got ${bounded.length}`,
    );
    // The newest survive, so the last message is the last one sent.
    assert.equal(textOf(bounded[bounded.length - 1]), "ujumbe 199");
  });
});

describe("the amount of text is capped", () => {
  it("drops old turns once the character budget is spent", () => {
    const paragraph = "x".repeat(4_000);
    const messages = Array.from({ length: 20 }, () => message("user", paragraph));
    const bounded = boundMessages(messages);

    const total = bounded.reduce((sum, m) => sum + textOf(m).length, 0);
    assert.ok(total <= MAX_CONTEXT_CHARS + 4_000, `carried ${total} characters`);
  });

  it("never splits a message in half", () => {
    const messages = [
      message("user", "a".repeat(30_000)),
      message("assistant", "fupi"),
      message("user", "Swali la mwisho"),
    ];
    const bounded = boundMessages(messages);
    for (const m of bounded) {
      assert.ok(
        textOf(m).length === 30_000 || textOf(m).length < 1_000,
        "a message was truncated rather than kept or dropped whole",
      );
    }
  });

  it("keeps the last message even when it alone is over budget", () => {
    const huge = message("user", "y".repeat(MAX_CONTEXT_CHARS * 3));
    const bounded = boundMessages([message("assistant", "habari"), huge]);
    assert.equal(bounded.length, 1);
    assert.equal(textOf(bounded[0]).length, MAX_CONTEXT_CHARS * 3);
  });
});

describe("what a hostile or careless client cannot do", () => {
  it("cannot make one request carry 500 messages", () => {
    const messages = Array.from({ length: 500 }, () => message("user", "habari"));
    const bounded = boundMessages(messages);
    assert.ok(bounded.length <= MAX_CONTEXT_MESSAGES);
  });

  it("cannot make one request carry a megabyte of text", () => {
    const messages = Array.from({ length: 40 }, () => message("user", "z".repeat(25_000)));
    const bounded = boundMessages(messages);
    const total = bounded.reduce((sum, m) => sum + textOf(m).length, 0);
    assert.ok(total <= MAX_CONTEXT_CHARS + 25_000, `carried ${total} characters`);
  });

  it("still answers the question that was actually asked", () => {
    const messages = [
      ...Array.from({ length: 100 }, (_, i) => message("user", "kelele ".repeat(200) + i)),
      message("user", "Bei za Diamond ni ngapi?"),
    ];
    const bounded = boundMessages(messages);
    assert.equal(textOf(bounded[bounded.length - 1]), "Bei za Diamond ni ngapi?");
  });
});

describe("messages without text parts", () => {
  it("survives a message that is only a tool call", () => {
    const toolOnly = {
      id: "t1",
      role: "assistant" as const,
      parts: [
        {
          type: "tool-onyesha_bei" as const,
          toolCallId: "c1",
          state: "output-available" as const,
          input: { huduma: "sendoff-wedding" },
          output: { type: "pricing" },
        },
      ],
    };
    const bounded = boundMessages([
      { id: "u1", role: "user", parts: [{ type: "text", text: "Bei?" }] },
      toolOnly,
    ]);
    assert.equal(bounded.length, 2);
  });

  it("survives a malformed message with no parts at all", () => {
    const broken = { id: "b1", role: "user" as const, parts: [] };
    assert.doesNotThrow(() => boundMessages([broken]));
    assert.equal(boundMessages([broken]).length, 1);
  });
});
