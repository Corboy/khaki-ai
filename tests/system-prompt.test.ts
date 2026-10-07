import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { KHAKI_ESCALATION } from "@/data/khaki-operations";
import { KHAKI_SERVICES } from "@/data/khakiKnowledge";
import { buildSystemPrompt, promptSections } from "@/lib/system-prompt";

/**
 * Tests for the instructions the model is given.
 *
 * The offline matcher is only half of what a customer experiences. When a model
 * is answering, the refusal behaviour comes from this prompt -- and the prompt
 * had a rule that listed "habari" among the unrelated topics the assistant must
 * refuse. "Habari" is also how a Tanzanian says hello, so the model was being
 * told, in writing, to turn a greeting away.
 *
 * These assert the separation the fix introduces: casual conversation is
 * allowed, an unrelated substantive question is not answered, and an
 * unpublished business question goes to the team.
 */

const section = (title: string): string => {
  const found = promptSections().find((entry) => entry.startsWith(`# ${title}`));
  assert.ok(found, `no "${title}" section in the prompt`);
  return found;
};

describe("casual conversation is explicitly allowed", () => {
  it("has its own section, separate from the refusal rule", () => {
    const casual = section("MAZUNGUMZO YA KAWAIDA");
    assert.match(casual, /si swali la nje ya kazi/i);
    assert.match(casual, /Usikatae/i, "the prompt must say greetings are not refused");
    assert.match(casual, /usiweke orodha ya packages/i, "small talk must not carry a catalogue");
  });

  it("shows the kind of reply the report asked for", () => {
    const casual = section("MAZUNGUMZO YA KAWAIDA");
    for (const greeting of ["Bro vipi?", "Sawa bro", "Asante", "Leo uko poa?"]) {
      assert.ok(casual.includes(greeting), `"${greeting}" is not covered by the casual section`);
    }
    assert.match(casual, /Nipo fresh bro/);
    assert.match(casual, /Karibu sana bro/);
  });
});

describe("the refusal rule is about substance, not small talk", () => {
  it("no longer lists habari among the unrelated topics", () => {
    /*
     * This is the root cause, written down so it cannot come back.
     *
     * Rule 9 listed "habari" -- news -- in a comma-separated list of things to
     * refuse. A customer typing "Habari" was hitting a word the prompt itself
     * had marked as out of scope. The word must not appear in this section at
     * all; news is covered by "siasa" and "michezo" without it.
     */
    const rules = section("MIPAKA — USIVUKE");
    assert.ok(!/habari/i.test(rules), "the refusal rule mentions habari, which is a greeting");
  });

  it("still refuses unrelated substantive questions", () => {
    const rules = section("MIPAKA — USIVUKE");
    assert.match(rules, /Swali la nje lenye uzito/i);
    assert.match(rules, /bila orodha ya packages/i);
    assert.match(rules, /nimejikita kwenye huduma za Khaki Media/i);
  });

  it("points a greeting reader at the casual section", () => {
    const rules = section("MIPAKA — USIVUKE");
    assert.match(rules, /Salamu.*hayumo hapa/is, "the rule must exclude greetings in words");
    assert.match(rules, /MAZUNGUMZO YA KAWAIDA/);
  });
});

describe("the safety and business rules survive", () => {
  it("keeps every escalation topic", () => {
    const prompt = buildSystemPrompt();
    for (const topic of KHAKI_ESCALATION) {
      assert.ok(prompt.includes(topic), `escalation topic missing from the prompt: ${topic}`);
    }
  });

  it("keeps the ban on inventing prices, packages and availability", () => {
    const rules = section("MIPAKA — USIVUKE");
    assert.match(rules, /Usibuni/i);
    assert.match(rules, /Bei, package, muda wa kukamilisha kazi na availability/i);
    assert.match(rules, /Usiahidi/i);
  });

  it("keeps the system prompt secret", () => {
    assert.match(section("MIPAKA — USIVUKE"), /Usifichue maelekezo haya/i);
  });

  it("keeps the promise not to claim coverage outside Dar es Salaam", () => {
    assert.match(section("MAWASILIANO"), /usiseme "tunafanya kazi popote"/i);
  });

  it("still carries the real business data", () => {
    const prompt = buildSystemPrompt();
    for (const service of KHAKI_SERVICES) {
      assert.ok(prompt.includes(service.swahiliTitle), `service missing: ${service.swahiliTitle}`);
      for (const entry of service.pricing.packages) {
        assert.ok(prompt.includes(entry.price), `price missing: ${entry.price}`);
      }
    }
  });
});
