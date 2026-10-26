import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildOfflineReply } from "@/lib/offline-answers";
import { getToolPermissions, type ConversationTurn } from "@/lib/tool-policy";

describe("internal QA replies keep contact links on the runtime number", () => {
  it("rebases both WhatsApp and phone links when the admin number is overridden", () => {
    const reply = buildOfflineReply("What is your phone number?", "+255 712 345 678");

    assert.match(reply.text, /https:\/\/wa\.me\/255712345678/);
    assert.match(reply.text, /tel:\+255712345678/);
    assert.match(reply.text, /\+255 712 345 678/);
    assert.doesNotMatch(reply.text, /255746885113/);
    assert.equal(reply.contactReason, "contact");
  });

  it("renders handoff replies without duplicate inline links when the contact card is present", () => {
    const reply = buildOfflineReply(
      "Nataka kuimba Friday Melody Moment",
      "+255 712 345 678",
      { contactCard: true },
    );

    assert.equal(reply.contactReason, "friday-melody");
    assert.match(reply.text, /Wasiliana nasi WhatsApp/);
    assert.doesNotMatch(reply.text, /https:\/\/wa\.me|tel:\+/);
  });

  it("marks every escalation family for the shared contact card", () => {
    const cases = [
      "Amana ni kiasi gani?",
      "Mna punguzo la package?",
      "Jumamosi tarehe 21 mtakuwa free?",
      "Naweza kutumia picha zenu kibiashara?",
      "Picha zangu hamjanitumia mpaka leo",
      "Nahitaji kazi ya video ya dharura ndani ya siku moja",
      "Video itakamilika siku ngapi?",
      "Nataka kuimba Friday Melody Moment",
      "Mnafanya podcast setup?",
      "Mnaongeza drone kwenye Mango?",
    ];

    for (const question of cases) {
      const reply = buildOfflineReply(question);
      assert.ok(reply.contactReason, `missing handoff card for: ${question}`);
      assert.match(reply.text, /(?:wa\.me|ofisi yetu)/i, `missing contact route for: ${question}`);
    }

    assert.equal(buildOfflineReply("Nataka kuimba Friday Melody Moment").contactReason, "friday-melody");
  });
});

describe("model tools require customer intent, not only model choice", () => {
  it("keeps contact and booking cards unavailable for small talk and ordinary questions", () => {
    for (const text of ["Habari", "Sawa", "Mango ni bei gani?", "Mnafanya picha za harusi?"]) {
      assert.deepEqual(getToolPermissions([{ role: "user", text }]), {
        showContactOptions: false,
        prepareBooking: false,
      }, text);
    }
  });

  it("requires explicit booking intent and at least one booking detail", () => {
    assert.equal(
      getToolPermissions([{ role: "user", text: "Nataka kuweka booking" }]).prepareBooking,
      false,
    );
    assert.equal(
      getToolPermissions([{ role: "user", text: "Harusi ya tarehe 20 Novemba 2026" }]).prepareBooking,
      false,
    );
    assert.equal(
      getToolPermissions([
        { role: "user", text: "Nataka kuweka booking" },
        { role: "assistant", text: "Ni tukio la aina gani na tarehe gani?" },
        { role: "user", text: "Harusi ya tarehe 20 Novemba 2026" },
      ]).prepareBooking,
      true,
    );
  });

  it("allows contact for escalations and an affirmative reply to a direct handoff offer", () => {
    for (const text of [
      "Amana ni kiasi gani?",
      "Mna punguzo la package?",
      "Jumamosi mtakuwa free?",
      "Naweza kutumia picha zenu kibiashara?",
      "Picha zangu hamjanitumia",
      "Nahitaji kazi ya dharura kesho",
      "Video itakamilika siku ngapi?",
      "Nataka kuimba Friday Melody Moment",
      "Mnafanya podcast setup?",
    ]) {
      assert.equal(
        getToolPermissions([{ role: "user", text }]).showContactOptions,
        true,
        `handoff tool unavailable for: ${text}`,
      );
    }

    assert.equal(getToolPermissions([{ role: "user", text: "Naomba kuwasiliana na timu." }]).showContactOptions, true);

    const agreed: ConversationTurn[] = [
      { role: "assistant", text: "Ungependa nikuunganishe na timu kupitia WhatsApp au simu?" },
      { role: "user", text: "Ndiyo, tafadhali." },
    ];
    assert.equal(getToolPermissions(agreed).showContactOptions, true);

    const unrelated: ConversationTurn[] = [
      { role: "assistant", text: "Ungependa nikuunganishe na timu kupitia WhatsApp au simu?" },
      { role: "user", text: "Hapana, Mango ni bei gani?" },
    ];
    assert.equal(getToolPermissions(unrelated).showContactOptions, false);
  });

  it("does not offer both handoff cards for a ready booking", () => {
    const permissions = getToolPermissions([
      { role: "user", text: "Nataka booking ya harusi tarehe 20 Novemba 2026." },
    ]);
    assert.deepEqual(permissions, { showContactOptions: false, prepareBooking: true });
  });
});
