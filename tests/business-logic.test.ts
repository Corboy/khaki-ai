import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildWhatsAppBookingUrl, formatTSH } from "@/config/khaki";
import { KHAKI_SERVICES } from "@/data/khakiKnowledge";
import {
  describeClock,
  describeOpeningHours,
  formatClock,
  getStudioStatus,
  isAppointmentOnly,
} from "@/lib/studio-hours";

/**
 * Tests for the logic that decides what a customer is told.
 *
 * These are the places where a wrong answer costs the business money or sends
 * someone to a closed door, and none of it is visible in a screenshot:
 * Swahili clock conversion, the open/closed indicator, and the booking link.
 *
 * Run with `pnpm test`.
 */

/** A Date on a known weekday, so assertions do not depend on when tests run. */
function at(dayOfWeek: number, hour: number, minute = 0): Date {
  // 2026-10-05 is a Monday. Walk forward to the requested weekday.
  const base = new Date(2026, 9, 5, hour, minute, 0);
  const shift = (dayOfWeek - 1 + 7) % 7;
  base.setDate(base.getDate() + shift);
  return base;
}

describe("Swahili clock conversion", () => {
  it("maps 24-hour times to how a Tanzanian says them", () => {
    assert.equal(describeClock(0), "12:00 alfajiri");
    assert.equal(describeClock(6 * 60), "6:00 asubuhi");
    assert.equal(describeClock(8 * 60), "8:00 asubuhi");
    assert.equal(describeClock(12 * 60), "12:00 mchana");
    assert.equal(describeClock(16 * 60), "4:00 jioni");
    assert.equal(describeClock(19 * 60), "7:00 usiku");
    assert.equal(describeClock(22 * 60), "10:00 usiku");
  });

  it("keeps minutes", () => {
    assert.equal(describeClock(8 * 60 + 30), "8:30 asubuhi");
    assert.equal(describeClock(21 * 60 + 45), "9:45 usiku");
  });
});

describe("clock formatting", () => {
  it("pads to HH:MM", () => {
    assert.equal(formatClock(0), "00:00");
    assert.equal(formatClock(8 * 60 + 5), "08:05");
    assert.equal(formatClock(22 * 60), "22:00");
  });
});

describe("opening hours", () => {
  it("is not appointment-only once real hours are published", () => {
    assert.equal(isAppointmentOnly(), false);
  });

  it("describes the full week", () => {
    const copy = describeOpeningHours();
    assert.equal(copy.weekdays, "Jumatatu – Ijumaa: 8:00 asubuhi – 10:00 usiku");
    assert.equal(copy.saturdays, "Jumamosi: 8:00 asubuhi – 10:00 usiku");
    assert.equal(copy.sundays, "Jumapili: 8:00 asubuhi – 10:00 usiku");
  });
});

describe("open / closed indicator", () => {
  it("says the studio has not opened yet, before 08:00", () => {
    const status = getStudioStatus(at(1, 7, 0));
    assert.equal(status.isOpen, false);
    assert.equal(status.label, "Bado hatujafungua");
    assert.equal(status.detail, "Tunafungua leo saa 08:00");
  });

  it("says the studio is open during the day", () => {
    const status = getStudioStatus(at(1, 12, 0));
    assert.equal(status.isOpen, true);
    assert.equal(status.label, "Studio ipo wazi sasa");
    assert.equal(status.detail, "Hadi saa 22:00");
  });

  it("warns when closing within the hour", () => {
    const status = getStudioStatus(at(3, 21, 30));
    assert.equal(status.isOpen, true);
    assert.equal(status.detail, "Inafunga saa 22:00");
  });

  it("treats the closing minute as closed, not open", () => {
    assert.equal(getStudioStatus(at(1, 22, 0)).isOpen, false);
  });

  it("points at the next opening after hours, on a weekday", () => {
    const status = getStudioStatus(at(2, 23, 0));
    assert.equal(status.isOpen, false);
    assert.equal(status.label, "Studio imefungwa");
    assert.equal(status.detail, "Tunafungua kesho saa 08:00");
  });

  it("still finds an opening on Sunday night, since it opens seven days", () => {
    const status = getStudioStatus(at(0, 23, 0));
    assert.equal(status.isOpen, false);
    assert.equal(status.detail, "Tunafungua kesho saa 08:00");
  });

  it("is open at the first minute of the day", () => {
    assert.equal(getStudioStatus(at(6, 8, 0)).isOpen, true);
  });
});

describe("booking link", () => {
  it("targets the studio's real number", () => {
    const url = buildWhatsAppBookingUrl({});
    assert.match(url, /^https:\/\/wa\.me\/255746885113\?text=/);
  });

  it("carries every detail the customer gave", () => {
    const url = decodeURIComponent(
      buildWhatsAppBookingUrl({
        name: "Amina",
        service: "Harusi",
        date: "12 Desemba",
        time: "16:00",
        notes: "Kigamboni",
      }),
    );
    assert.ok(url.includes("Jina: Amina"));
    assert.ok(url.includes("Huduma: Harusi"));
    assert.ok(url.includes("Tarehe: 12 Desemba"));
    assert.ok(url.includes("Muda: 16:00"));
    assert.ok(url.includes("Maelezo: Kigamboni"));
    assert.ok(url.includes("Nimepata taarifa kupitia Khaki AI."));
  });

  it("omits fields the customer did not give, rather than sending blanks", () => {
    const url = decodeURIComponent(buildWhatsAppBookingUrl({ name: "Amina" }));
    assert.ok(!url.includes("Huduma:"));
    assert.ok(!url.includes("Tarehe:"));
  });

  it("encodes newlines so the message arrives as separate lines", () => {
    assert.ok(buildWhatsAppBookingUrl({ name: "Amina" }).includes("%0A"));
  });

  it("lets the admin panel override the number", () => {
    const url = buildWhatsAppBookingUrl({}, "+255 700 000 000");
    assert.match(url, /^https:\/\/wa\.me\/255700000000\?text=/);
  });

  it("strips punctuation from an overridden number", () => {
    const url = buildWhatsAppBookingUrl({}, "(255) 746-885-113");
    assert.match(url, /^https:\/\/wa\.me\/255746885113\?text=/);
  });
});

describe("prices", () => {
  it("formats with the same TSH the studio prints on its posters", () => {
    assert.equal(formatTSH(170000), "TSH 170,000");
    assert.equal(formatTSH(2000000), "TSH 2,000,000");
  });

  /*
   * Every published price, asserted against the price list itself. The first
   * version of this test checked KHAKI_CONFIG and failed — the prices live in
   * KHAKI_SERVICES. The test caught the mistake in the test, which is the point.
   */
  it("carries every price from the studio's posters", () => {
    const published = KHAKI_SERVICES.flatMap((service) =>
      service.pricing.packages.map((entry) => entry.price),
    );

    for (const price of [
      "TSH 170,000/=",
      "TSH 350,000/=",
      "TSH 550,000/=",
      "TSH 1,000,000/=",
      "TSH 1,500,000/=",
      "TSH 2,000,000/=",
      "TSH 400,000/=",
      "TSH 200,000/=",
    ]) {
      assert.ok(published.includes(price), `missing published price ${price}`);
    }
  });

  it("covers all three service lines", () => {
    const ids = KHAKI_SERVICES.map((service) => service.id).sort();
    assert.deepEqual(ids, ["audio", "sendoff-wedding", "video-production"]);
  });
});
