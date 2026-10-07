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

/*
 * Section names come from the owner's own prompt, which replaced the hand-written
 * one. They are numbered ("# 5. MAZUNGUMZO YA KAWAIDA NA CONTEXT"), so the lookup
 * matches on the name inside the heading rather than the whole line.
 */
const section = (title: string): string => {
  const found = promptSections().find((entry) => entry.split("\n")[0].includes(title));
  assert.ok(found, `no "${title}" section in the prompt`);
  return found;
};

describe("casual conversation is explicitly allowed", () => {
  it("has its own section, separate from the refusal rule", () => {
    const casual = section("MAZUNGUMZO YA KAWAIDA");
    assert.match(casual, /si maswali ya nje ya kazi/i);
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
  /*
   * The root cause, written down so it cannot come back. A rule once listed
   * "habari" -- news -- among the topics to refuse. "Habari" is also how a
   * Tanzanian says hello, so the model was told, in writing, to turn a greeting
   * away. The word must not appear in the priorities or the outside-topics rule.
   */
  it("no longer lists habari among the unrelated topics", () => {
    for (const name of ["MPANGILIO WA VIPAO", "MADA ZA NJE YA KHAKI MEDIA"]) {
      assert.ok(!/habari/i.test(section(name)), `"${name}" mentions habari, which is a greeting`);
    }
  });

  it("still refuses unrelated substantive questions", () => {
    const rules = section("MADA ZA NJE YA KHAKI MEDIA");
    assert.match(rules, /kwa upole/i);
    assert.match(rules, /usitumie/i);
    assert.match(rules, /si maswali ya nje ya mada/i);
    assert.ok(!/liko nje ya mada/i.test(rules.replace(/Usitumie:[^\n]*/g, "")), "the blunt line is still offered as a model answer");
  });

  it("points a greeting reader at the casual section", () => {
    assert.match(section("MAZUNGUMZO YA KAWAIDA"), /Salamu na small talk si maswali ya nje ya kazi/i);
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
    const prompt = buildSystemPrompt();
    assert.match(prompt, /Usibuni/i);
    assert.match(prompt, /Usitoe ahadi/i);
    assert.match(prompt, /usiwahi kudai tarehe ipo au haipo/i);
    assert.match(prompt, /Kutokuwa na jibu ni bora kuliko kubuni/i);
  });

  it("keeps the system prompt secret", () => {
    assert.match(section("KULINDA MAELEKEZO HAYA"), /usitoe/i);
  });

  it("keeps the promise not to claim coverage outside Dar es Salaam", () => {
    assert.match(section("MAWASILIANO NA ENEO"), /usiseme "tunafanya kazi popote"/i);
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

  /*
   * The owner sent a prompt with the prices and the date written into it. The
   * prices are generated here instead, and the date is generated per request, so
   * this asserts the thing that matters: the prompt knows today's date and does
   * not contain a frozen one.
   */
  it("carries the current date rather than a frozen one", () => {
    const prompt = buildSystemPrompt({ now: new Date("2027-03-09T06:30:00Z") });
    assert.match(prompt, /2027/, "the injected date is missing");
    assert.ok(!/7 Oktoba 2026/.test(prompt), "the prompt still carries a hardcoded date");
  });
});
