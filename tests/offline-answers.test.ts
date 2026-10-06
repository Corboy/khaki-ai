import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { KHAKI_CONFIG } from "@/config/khaki";
import { answerOffline } from "@/lib/offline-answers";

/**
 * Tests for the answer used when no model is available.
 *
 * This is not a rarely-seen path. It runs whenever the API key is missing, the
 * quota is spent, or every model in the failover chain refuses -- which is the
 * state the app is in right now, on the free tier. A customer asking about
 * price and getting nothing, or getting the wrong price, is the worst version
 * of this app.
 */

const PHONE = KHAKI_CONFIG.contact.displayPhone;

describe("the offline answer never invents anything", () => {
  const questions = [
    "Bei zenu zikoje?",
    "Mnafanya drone shots?",
    "Kazi za audio ni bei gani?",
    "Mpo wapi?",
    "Habari",
    "Nataka kuweka booking",
    "Je, mnakata picha za harusi?",
    "asdfghjkl",
    "",
  ];

  it("always ends by pointing at the studio's WhatsApp", () => {
    for (const question of questions) {
      const answer = answerOffline(question);
      assert.ok(answer.length > 0, `empty answer for "${question}"`);
      assert.ok(
        answer.includes(PHONE.replace("+255 ", "+255 ")) || answer.includes(PHONE),
        `no contact in the answer for "${question}": ${answer.slice(0, 80)}`,
      );
    }
  });

  it("never quotes TZS, which is not what this studio prints", () => {
    for (const question of questions) {
      assert.ok(!answerOffline(question).includes("TZS"), `TZS leaked for "${question}"`);
    }
  });

  it("never mentions the recording studio the project started as", () => {
    for (const question of questions) {
      const answer = answerOffline(question).toLowerCase();
      for (const word of ["mixing", "mastering", "podcast", "kurekodi muziki", "livestream"]) {
        assert.ok(!answer.includes(word), `"${word}" leaked for "${question}"`);
      }
    }
  });

  it("never repeats an invented price", () => {
    /*
     * A whole number, not a substring.
     *
     * The first version of this test looked for "50,000" with `includes`, which
     * is inside "350,000" and "550,000" -- both real. The lookarounds keep the
     * match from starting or ending mid-number.
     */
    const invented = ["50,000", "1,200,000", "1,800,000", "120,000", "250,000", "100,000"];
    for (const question of questions) {
      const answer = answerOffline(question);
      for (const price of invented) {
        const whole = new RegExp(`(?<![\\d,])${price}(?![\\d])`);
        assert.ok(!whole.test(answer), `invented price ${price} for "${question}"`);
      }
    }
  });
});

describe("questions it should answer well", () => {
  it("answers a price question with real packages", () => {
    const answer = answerOffline("Bei zenu zikoje?");
    assert.ok(answer.includes("170,000"), "the cheapest package should appear");
    assert.ok(answer.includes("2,000,000"), "the dearest should appear");
    assert.ok(/Mango|Diamond/.test(answer), "packages should be named");
  });

  it("answers about the audio service with its real price", () => {
    const answer = answerOffline("Kazi za audio ni bei gani?");
    assert.ok(answer.includes("200,000"), "audio is TSH 200,000");
    assert.ok(answer.includes("400,000") === false, "audio must not be quoted the video price");
  });

  it("answers about video with its real price", () => {
    const answer = answerOffline("Kupiga video mpaka final ni bei gani?");
    assert.ok(answer.includes("400,000"));
  });

  it("answers about drone shots", () => {
    const answer = answerOffline("Mnafanya drone shots?");
    assert.ok(/drone/i.test(answer));
    assert.ok(/Diamond|Golden/.test(answer), "the packages that include it should be named");
  });

  it("answers where the studio is", () => {
    const answer = answerOffline("Mpo wapi?");
    assert.ok(answer.includes(KHAKI_CONFIG.location.address));
  });

  it("answers how to get in touch", () => {
    const answer = answerOffline("Namba yenu ya simu ni ipi?");
    assert.ok(answer.includes(KHAKI_CONFIG.contact.email) || answer.includes(PHONE));
  });

  it("greets a greeting", () => {
    const answer = answerOffline("Habari");
    assert.ok(/Karibu|Habari/.test(answer));
  });

  it("explains the booking process rather than only the price", () => {
    const answer = answerOffline("Nataka kuweka booking");
    assert.ok(/booking/i.test(answer));
  });

  it("answers in Swahili regardless of the question", () => {
    const answer = answerOffline("how much is a wedding package?");
    // Even when asked in English it answers from the Swahili price list, which
    // is the register the studio's own customers use.
    assert.ok(/TSH/.test(answer) || /Karibu|Khaki/.test(answer));
  });
});

describe("the customer can act on the answer", () => {
  /*
   * The phone number used to be printed as bold text. On the phone, where this
   * is entirely used, that is a number to memorise in an answer whose whole
   * purpose is to start a conversation. Every contact has to be tappable.
   */

  it("ends with a tappable WhatsApp link, not just the digits", () => {
    for (const question of ["Bei zikoje?", "Nataka kuweka booking", "asdfgh"]) {
      const answer = answerOffline(question);
      const link = answer.match(/\]\((https:\/\/wa\.me\/\d+[^)]*)\)/);
      assert.ok(link, `no WhatsApp link for "${question}": ${answer.slice(-120)}`);
      assert.match(link![1], /^https:\/\/wa\.me\/255746885113/);
    }
  });

  it("still shows the number a person can read out", () => {
    const answer = answerOffline("Bei zikoje?");
    assert.ok(answer.includes(PHONE), "the digits must survive inside the link text");
  });

  it("offers a call link when asked how to get in touch", () => {
    const answer = answerOffline("Namba yenu ya simu ni ipi?");
    assert.match(answer, /\(tel:\+\d+\)/, "a customer who would rather call needs a tel: link");
    assert.match(answer, /\(mailto:[^)]+\)/, "and an address they can write to");
  });

  /*
   * Note on what these can and cannot prove.
   *
   * They check the markdown this function returns, not what the browser
   * renders. That gap bit: react-markdown drops any href whose protocol is not
   * on its list, and `tel:` is not on it, so the call link rendered as
   * <a href=""> while every assertion here passed. The renderer now allows
   * `tel:` explicitly, and the live href is checked in the browser rather than
   * assumed from the string.
   */

  it("never emits a link with an empty target", () => {
    for (const question of ["Bei zikoje?", "Namba yenu", "Mpo wapi?", "Habari"]) {
      const answer = answerOffline(question);
      for (const match of answer.matchAll(/\]\(([^)]*)\)/g)) {
        assert.ok(match[1].length > 4, `empty link target for "${question}"`);
      }
    }
  });
});

describe("questions about money and policy", () => {
  /*
   * KHAKI_ESCALATION has listed these for rounds as things to hand to the team,
   * but the offline matcher had no intent for them -- so on a spent quota a
   * customer asking about a deposit got "Sijaelewa vizuri swali lako" and the
   * package list. The business does have a position on these; the position is
   * "ask us", and saying so is not the same as not understanding.
   */
  const MONEY = [
    "Amana ni kiasi gani?",
    "Bei ya amana ni ngapi?",
    "Namba ya akaunti ni ipi?",
    "Nikifuta booking mnanirudishia pesa?",
    "Video itakamilika baada ya siku ngapi?",
    "Mtakuja watu wangapi?",
    "Mnaweza kuposti picha zetu Instagram?",
    "Ninaweza kupata punguzo?",
  ];

  it("hands every one of them to the team rather than guessing", () => {
    for (const question of MONEY) {
      const answer = answerOffline(question);
      assert.match(
        answer,
        /linathibitishwa na timu/i,
        `"${question}" did not route to the hand-off: ${answer.slice(0, 100)}`,
      );
      assert.ok(
        !/Sijaelewa vizuri/i.test(answer),
        `"${question}" fell through to the generic reply`,
      );
    }
  });

  it("does not claim an amount, a percentage or a timeframe", () => {
    /*
     * Links are stripped first.
     *
     * The WhatsApp link is percent-encoded -- `%F0%9F%91%8B` for the wave emoji
     * -- so a naive percentage check finds "0%" inside it and reports that the
     * answer quoted a deposit of 0%. It did not; it linked to WhatsApp.
     */
    const prose = (text: string) => text.replace(/\[[^\]]*\]\([^)]*\)/g, "").replace(/https?:\/\/\S+/g, "");

    for (const question of MONEY) {
      const answer = prose(answerOffline(question));
      assert.ok(!/\d\s?%/.test(answer), `"${question}" quoted a percentage`);
      assert.ok(!/asilimia/i.test(answer), `"${question}" quoted a percentage`);
      // The only numbers allowed are the studio's own published prices and
      // phone number.
      const numbers = answer.match(/[\d,]{4,}/g) ?? [];
      for (const number of numbers) {
        assert.ok(
          ["170,000", "350,000", "550,000", "1,000,000", "1,500,000", "2,000,000", "400,000", "200,000", "746", "255"].some(
            (known) => number.includes(known),
          ),
          `"${question}" produced an unknown figure: ${number}`,
        );
      }
    }
  });

  it("leaves the other questions where they were", () => {
    // Each of these must still reach its own intent, not the new one.
    assert.match(answerOffline("Bei za packages zikoje?"), /170,000/);
    assert.match(answerOffline("Mpo wapi?"), /Kigamboni/);
    assert.match(answerOffline("Mnafanya drone shots?"), /drone/i);
    assert.match(answerOffline("Nataka kuweka booking"), /booking/i);
    assert.match(answerOffline("Saa zenu za kufungua ni zipi?"), /Saa zetu/i);
  });
});

describe("the recording-studio vocabulary", () => {
  /*
   * The audio intent used to match "kurekodi", "muziki", "wimbo", "beat" and
   * "mic" -- words the studio has never used about itself -- and answer with the
   * audio price. So "Mna studio ya kurekodi nyimbo?" was answered with
   * "Kazi za audio ni TSH 200,000 kwa kazi", which reads as a yes. A customer
   * would ring up to record an album at that price.
   *
   * This is the same invented business the project began with, sitting in a
   * keyword list rather than in the data, and it is deterministic: no model
   * involved, no quota, no luck.
   */
  const RECORDING = [
    "Nataka kurekodi wimbo. Mnatoa huduma hiyo?",
    "Mnafanya muziki? Nina beat yangu.",
    "Mna studio ya kurekodi nyimbo?",
    "Naweza kurekodi album yangu kwenu?",
    "Mna microphone nzuri?",
    "Mnarekodi nyimbo za harusi?",
  ];

  it("never answers a recording question with the audio price", () => {
    /*
     * The property that matters, asserted for all of them.
     *
     * Handing off is asserted separately and only where the question is
     * unambiguously about recording. "Mnarekodi nyimbo za harusi?" also
     * contains "harusi", which the wedding intent matches first -- it answers
     * with the studio's coverage rather than with a recording service. Not the
     * most useful answer, but not a false claim either, and routing preferences
     * are not what this test is protecting.
     */
    for (const question of RECORDING) {
      const answer = answerOffline(question);
      assert.ok(
        !/Kazi za audio ni/i.test(answer),
        `"${question}" was answered with the audio price, which implies the studio records: ${answer.slice(0, 110)}`,
      );
    }
  });

  it("hands off the questions that are unambiguously about recording", () => {
    for (const question of RECORDING.slice(0, 5)) {
      assert.match(
        answerOffline(question),
        /linathibitishwa na timu/i,
        `"${question}" did not hand off: ${answerOffline(question).slice(0, 110)}`,
      );
    }
  });

  it("still answers the audio service by its own name", () => {
    for (const question of ["Mnatoa huduma ya audio?", "Kazi za audio ni bei gani?"]) {
      const answer = answerOffline(question);
      assert.match(answer, /200,000/, `"${question}" lost the audio price`);
      assert.match(
        answer,
        /kinathibitishwa na timu/i,
        `"${question}" quotes a price without saying the scope is unconfirmed`,
      );
    }
  });

  it("gets a customer asking for the audio price to that price, by either route", () => {
    /*
     * "Audio ni ngapi?" ties -- "audio" scores 5 and the price intent's "ngapi"
     * scores 5 -- and the price intent is declared first, so the whole list is
     * returned. That is not wrong: the list contains "Kazi za Audio — TSH
     * 200,000". Asserting the specific answer would have been asserting a
     * routing preference nobody asked for, so this asserts the price arrives.
     */
    const answer = answerOffline("Audio ni ngapi?");
    assert.match(answer, /200,000/, "the audio price is not reachable from this question");
  });

  it("does not route an ordinary video question to the hand-off", () => {
    // "kurekodi" is not in the video intent, but the video service does record
    // things; make sure the new keywords did not swallow it.
    const answer = answerOffline("Mnapiga video ya harusi?");
    assert.ok(!/linathibitishwa na timu/i.test(answer), "a plain video question was sent to the team");
  });
});

describe("questions a customer asks that are not about prices", () => {
  /*
   * Read the offline path as a customer would, thirty realistic questions, and
   * four of them were answered with "Sijaelewa vizuri swali lako" plus the
   * whole price list. That matters more than it sounds: free-tier quota is per
   * model, and when all six are exhausted this path is not the fallback, it is
   * the product.
   */
  it("answers courtesy with courtesy, not a catalogue", () => {
    for (const question of ["Asante sana", "Kwaheri", "Nashukuru", "Baadaye"]) {
      const answer = answerOffline(question);
      assert.ok(
        !/Sijaelewa vizuri/i.test(answer),
        `"${question}" got the generic reply: ${answer.slice(0, 80)}`,
      );
      assert.ok(
        !/170,000/.test(answer),
        `"${question}" was answered with the price list`,
      );
      assert.match(answer, /Karibu sana/i, `"${question}" was not answered warmly`);
    }
  });

  it("recognises a region other than Dar es Salaam", () => {
    /*
     * The pure region question, which was the one that failed.
     *
     * "Mnapiga harusi Arusha?" does not reach this intent, and that is the
     * matcher's scoring rather than a mistake: "arusi" is a substring of
     * "harusi", so the wedding intent scores 11 against Arusha's 6 and wins.
     * The answer it gives -- "Tunafunika sendoff na harusi kwa picha na video"
     * -- makes no claim about travelling, so nothing false is said; it simply
     * does not address the region. Left as it is, and written down, rather than
     * weighted around a scoring change that would touch every intent.
     */
    for (const question of ["Mnafanya kazi Mwanza?", "Mpo Dodoma?", "Mnafanya kazi Mbeya?"]) {
      const answer = answerOffline(question);
      assert.match(
        answer,
        /mkoa mwingine/i,
        `"${question}" did not explain the service area: ${answer.slice(0, 90)}`,
      );
      assert.match(answer, /Dar es Salaam/, `"${question}" did not name the studio's city`);
      assert.ok(!/Sijaelewa vizuri/i.test(answer), `"${question}" got the generic reply`);
    }
  });

  it("hands live broadcasting to the team", () => {
    for (const question of ["Mnafanya live streaming?", "Mnapiga live kwenye YouTube?"]) {
      assert.match(
        answerOffline(question),
        /linathibitishwa na timu/i,
        `"${question}" was not handed off`,
      );
    }
  });

  it("answers the app question with the install steps it really has", () => {
    const answer = answerOffline("Mna app ya Android?");
    assert.ok(!/Sijaelewa vizuri/i.test(answer), "the app question got the generic reply");
    assert.match(answer, /Add to Home screen/i, "the install step is missing");
  });

  it("still sends an Apple Package question to the package, not the app", () => {
    // "app" is a substring of "Apple": if the app intent used it as a keyword,
    // the package intent would lose every question about Apple.
    const answer = answerOffline("Apple Package ni bei gani?");
    assert.match(answer, /550,000/, `the Apple package price is gone: ${answer.slice(0, 90)}`);
  });

  it("leaves no realistic question on the generic reply", () => {
    const answered = [
      "Habari", "Mambo vipi", "Bei zenu zikoje?", "Mango package ni bei gani?",
      "Nataka kujua kuhusu sendoff", "Mnafanya harusi?", "Kupiga video mpaka final ni ngapi?",
      "Kazi za audio ni bei gani?", "Mna drone shots?", "Napata nini kwa mwisho?", "Mpo wapi?",
      "Saa zenu za kufungua ni zipi?", "Nataka kuweka booking", "Namba yenu ya simu ni ipi?",
      "Amana ni kiasi gani?", "Ninaweza kupata punguzo?", "Mnafanya kazi Mwanza?",
      "Nataka kurekodi wimbo", "Mnafanya live streaming?", "Asante sana", "Kwaheri",
      "Mna app ya Android?",
    ];
    for (const question of answered) {
      assert.ok(
        !/Sijaelewa vizuri/i.test(answerOffline(question)),
        `"${question}" still falls through to the generic reply`,
      );
    }
  });
});

describe("questions it cannot answer", () => {
  it("still returns something useful instead of nothing", () => {
    const answer = answerOffline("zzzz qqqq xxxx");
    assert.ok(answer.length > 40);
    assert.ok(answer.includes("170,000"), "an unknown question still shows what things cost");
  });

  it("does not fold under an empty question", () => {
    assert.ok(answerOffline("").length > 40);
  });

  it("does not fold under a very long question", () => {
    const long = "nataka kujua ".repeat(400);
    assert.ok(answerOffline(long).length > 40);
  });

  it("survives punctuation and mixed case", () => {
    const answer = answerOffline("BEI?!?! ...zikoje???");
    assert.ok(answer.includes("170,000"), "matching should ignore punctuation and case");
  });
});
