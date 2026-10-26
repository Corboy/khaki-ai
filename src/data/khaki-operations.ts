/**
 * Khaki Media — operational detail that sits alongside the price list.
 *
 * This file is deliberately thin. The previous version described a recording
 * studio with equipment, turnaround times and a deposit policy — none of which
 * was real. What is left is only what the business has actually published, plus
 * the guard rails that stop the assistant inventing the rest.
 *
 * When the studio decides a policy (deposit, cancellation, delivery time), add
 * it here and the assistant will start quoting it.
 */

/** Things a customer can ask for that are not in the fixed price list. */
export const KHAKI_EXTRAS = [
  "Drone shots kwenye packages ambazo hazina",
  "Prewedding photoshoot kwenye packages ambazo hazina",
  "Photobook au album ya ziada",
  "Picha za ziada zenye wooden frame",
  "Kufunika siku ya pili (harusi au sendoff ya pili)",
] as const;

/**
 * Everything the assistant must hand to the team rather than answer itself.
 *
 * These are the questions where a wrong guess costs the customer money or
 * commitment, so the assistant's job is to hand over cleanly, not to improvise.
 */
export const KHAKI_ESCALATION = [
  "Amana, malipo, namba za akaunti au maelezo yoyote ya kifedha",
  "Punguzo, ofa maalum au bei ya mkataba",
  "Availability ya tarehe — kama siku husika bado ipo",
  "Mikataba, haki za picha (rights) na matumizi ya kibiashara",
  "Malalamiko au tatizo la kazi iliyokwisha fanyika",
  "Kazi ya dharura inayohitaji kuanza ndani ya siku moja",
  "Muda kamili wa kukamilisha kazi baada ya tukio",
  "Kushiriki, usajili, orodha ya waimbaji au logistics za Friday Melody Moment",
] as const;

/** Verified public facts for the studio's weekly singing programme. */
export const KHAKI_FRIDAY_MELODY = {
  name: "Friday Melody Moment",
  schedule: "kila Ijumaa",
  localStartTime: "saa 2:30 usiku",
  startTime: "20:30",
  timezone: "EAT",
  music: "hasa nyimbo za Kikatoliki na nyimbo nyingine za dini",
  ending: "Hakina muda maalum wa kumalizika; muda hutegemea idadi ya waimbaji wa siku hiyo.",
} as const;

/** Fixed handoff reasons avoid accepting arbitrary phone numbers or URLs from the model. */
export const KHAKI_CONTACT_REASONS = [
  "contact",
  "booking",
  "availability",
  "service",
  "complaint",
  "friday-melody",
] as const;

export type KhakiContactReason = (typeof KHAKI_CONTACT_REASONS)[number];

/** Safe, non-sensitive WhatsApp drafts. They are opened, never sent automatically. */
export const KHAKI_CONTACT_MESSAGES: Record<KhakiContactReason, string> = {
  contact: "Habari Khaki Media, naomba kuwasiliana na timu.",
  booking: "Habari Khaki Media, naomba kuzungumza na timu kuhusu booking.",
  availability: "Habari Khaki Media, naomba kuthibitisha availability ya tarehe yangu.",
  service: "Habari Khaki Media, naomba maelezo kuhusu huduma zenu.",
  complaint: "Habari Khaki Media, naomba msaada kuhusu kazi yangu.",
  "friday-melody": "Habari Khaki Media, naomba maelezo kuhusu Friday Melody Moment na namna ya kushiriki.",
};

export const KHAKI_CONTACT_LABELS: Record<KhakiContactReason, string> = {
  contact: "Kuzungumza na timu",
  booking: "Booking",
  availability: "Kuthibitisha upatikanaji",
  service: "Kuulizia huduma",
  complaint: "Msaada wa kazi iliyofanyika",
  "friday-melody": "Friday Melody Moment",
};

/**
 * Anything the assistant does not know goes to the office, with a way to reach
 * it. Two ways, because a customer on a phone may prefer either.
 */
export const KHAKI_OFFICE_LINE =
  "Hili tuongee na ofisi yetu moja kwa moja — WhatsApp au piga simu, namba ni ile ile.";

/**
 * Who built the assistant.
 *
 * Asked often enough to be worth a straight answer rather than a deflection.
 */
export const KHAKI_MAKER_LINE =
  "Nimetengenezwa na Faustine kutoka Khaki Media.";

