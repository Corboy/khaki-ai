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
] as const;

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

