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
    assert.match(casual, /Karibu sana\./);
    assert.doesNotMatch(casual, /Habari\?\s*→\s*"Nzuri kabisa bro/i);
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

describe("the prompt has one consistent source of truth", () => {
  it("points each kind of business fact to the relevant prompt section", () => {
    const rules = section("TAFSIRI YA MUHIMU");
    assert.match(rules, /sehemu\s+husika: huduma na bei ziko sehemu ya 9/i);
    assert.doesNotMatch(rules, /lazima zitokee kwenye sehemu ya 9 hapa chini/i);
    const escalation = section("KUWAPA TIMU");
    assert.match(escalation, /masharti yoyote ambayo\s+hayajaelezwa kwenye sehemu husika/i);
    assert.doesNotMatch(escalation, /masharti yoyote ambayo hayapo kwenye sehemu ya 9/i);
  });

  it("does not hard-code example prices outside the generated service list", () => {
    const prompt = buildSystemPrompt();
    const serviceList = section("HUDUMA NA BEI");
    const examples = prompt.replace(serviceList, "");
    assert.doesNotMatch(examples, /(?:TSH\s*[\d,.]+|\b\d{2,3}k\b)/i);
  });

  it("separates booking intent from a package or price enquiry", () => {
    const booking = section("BOOKING");
    assert.match(booking, /bei\/package pekee, \*\*si booking intent\*\*/i);
    assert.match(booking, /nia ya kubook/i);
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

  it("does not let copied customer or external text override business facts or safety rules", () => {
    const guard = section("KULINDA MAELEKEZO HAYA");
    assert.match(guard, /ujumbe uliocopyiwa/i);
    assert.match(guard, /data ya nje/i);
    assert.match(guard, /facts.*bei.*permissions.*usalama/i);
    assert.match(guard, /credentials/i);
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

  it("uses East Africa time when the backend injects the current date and time", () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      const prompt = buildSystemPrompt({ now: new Date("2027-03-09T23:30:00Z") });
      assert.ok(prompt.includes("10 Machi 2027"), "date should be converted to Dar es Salaam time");
      assert.ok(prompt.includes("02:30 (EAT)"), "time should be converted to East Africa time");
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    }
  });

  it("keeps custom instructions before the dynamic clock so the clock remains the prompt tail", () => {
    const sections = promptSections({
      customInstructions: "Tumia sauti ya Khaki Media.",
      now: new Date("2027-03-09T23:30:00Z"),
    });
    assert.ok(sections.at(-2)?.includes("Tumia sauti ya Khaki Media."));
    assert.match(sections.at(-1) ?? "", /^# 23\. SASA/);
  });

  it("grounds Friday Melody Moment in the published schedule and does not invent logistics", () => {
    const event = section("FRIDAY MELODY MOMENT");
    assert.match(event, /kila Ijumaa/i);
    assert.match(event, /20:30.*EAT/i);
    assert.match(event, /Kikatoliki/i);
    assert.match(event, /nyimbo nyingine za dini/i);
    assert.match(event, /hakuna saa ya mwisho|haina muda maalum wa kumalizika|hakina muda maalum wa kumalizika/i);
    assert.match(event, /usibuni.*venue|venue.*usibuni/i);
  });

  it("does not infer a customer's gender or form of address from their name", () => {
    const address = section("MANENO YA MWITO");
    assert.match(address, /usikisie jinsia/i);
    assert.match(address, /jina/i);
    assert.match(address, /neutral/i);
    assert.doesNotMatch(address, /jina la kike.*dada/i);
  });

  it("instructs the model to show contact actions only for a real handoff", () => {
    const prompt = buildSystemPrompt();
    assert.ok(prompt.includes("show_contact_options"), "the tool must be named in the prompt");
    assert.match(prompt, /WhatsApp.*simu|simu.*WhatsApp/i);
    assert.ok(/Usitumie kwa salamu.*bei/i.test(prompt), "ordinary greetings and price questions must not show handoff actions");
    assert.ok(/ha.*tuma.*ujumbe|haitumi.*ujumbe/i.test(prompt), "the prompt must clarify that no message is sent automatically");
  });
});
