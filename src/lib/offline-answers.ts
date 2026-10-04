import { KHAKI_CONFIG } from "@/config/khaki";
import { findService, KHAKI_FAQS } from "@/data/khakiKnowledge";
import { describeOpeningHours } from "@/lib/studio-hours";

/**
 * Offline answers — what Khaki AI says when no model key is configured, or when
 * every model has refused the turn.
 *
 * This is deliberately small and honest: it matches the customer's question
 * against a fixed set of intents and replies with facts pulled from the price
 * list. It never pretends to be the model, and every answer ends by pointing at
 * the studio's WhatsApp line.
 */

interface Intent {
  id: string;
  keywords: string[];
  build: () => string;
}

const CONTACT_FOOTER = `\n\nKwa mazungumzo zaidi na booking, wasiliana nasi WhatsApp **${KHAKI_CONFIG.contact.displayPhone}**.`;

const PACKAGES = findService("sendoff-wedding")!.pricing.packages;
const VIDEO = findService("video-production")!;
const AUDIO = findService("audio")!;

function priceOverview(): string {
  const rows = PACKAGES.map((entry) => `- **${entry.name}** — ${entry.price}`).join("\n");
  return `**Sendoff & Harusi** (packages zinaanzia ${findService("sendoff-wedding")!.pricing.startingAt}):\n\n${rows}\n\nPia tunapiga **video mpaka final — ${VIDEO.pricing.startingAt}** na **kazi za audio — ${AUDIO.pricing.startingAt}**.`;
}

function packageFor(keyword: string): string | null {
  const entry = PACKAGES.find((item) => item.name.toLowerCase().includes(keyword));
  if (!entry) return null;
  return `**${entry.name}** — ${entry.price}\n\n${entry.features
    .map((feature) => `- ${feature}`)
    .join("\n")}`;
}

const INTENTS: Intent[] = [
  {
    id: "greeting",
    keywords: ["habari", "mambo", "shikamoo", "hello", "hi ", "hey", "vipi", "salama", "hujambo"],
    build: () =>
      `Habari! Karibu **${KHAKI_CONFIG.brandName}**. Mimi ni ${KHAKI_CONFIG.assistantName}.\n\nTunafanya picha na video za **sendoff, harusi na matukio**. Unahitaji nini leo?`,
  },
  {
    id: "price",
    keywords: ["bei", "gharama", "price", "cost", "packages", "shilingi", "ngapi", "tsh"],
    build: priceOverview,
  },
  {
    id: "diamond",
    keywords: ["diamond"],
    build: () => packageFor("diamond") ?? priceOverview(),
  },
  {
    id: "golden",
    keywords: ["golden"],
    build: () => packageFor("golden") ?? priceOverview(),
  },
  {
    id: "basic",
    keywords: ["basic"],
    build: () => packageFor("basic") ?? priceOverview(),
  },
  {
    id: "apple",
    keywords: ["apple"],
    build: () => packageFor("apple") ?? priceOverview(),
  },
  {
    id: "vanilla",
    keywords: ["vanilla"],
    build: () => packageFor("vanilla") ?? priceOverview(),
  },
  {
    id: "mango",
    keywords: ["mango"],
    build: () => packageFor("mango") ?? priceOverview(),
  },
  {
    id: "wedding",
    keywords: ["harusi", "sendoff", "send off", "wedding", "arusi", "sherehe"],
    build: () =>
      `Tunafunika **sendoff na harusi** kwa picha na video.\n\n${priceOverview()}\n\nNi sendoff au harusi? Na ni tarehe gani?`,
  },
  {
    id: "video",
    keywords: ["video", "coverage", "highlight", "full hd", "flashdisk", "flash disk", "shoot", "kupiga"],
    build: () =>
      `**Kupiga video mpaka final ni ${VIDEO.pricing.startingAt}** kwa kazi — tunapiga, tunaedit, na unakabidhiwa video iliyokamilika.\n\nKwenye packages za sendoff na harusi, video coverage inapatikana kwenye Diamond, Golden, Basic, Apple na Vanilla.`,
  },
  {
    id: "audio",
    keywords: ["audio", "sauti", "sound", "kurekodi", "rekodi", "muziki", "beat", "wimbo", "mic"],
    build: () => `**Kazi za audio ni ${AUDIO.pricing.startingAt}** kwa kazi.`,
  },
  {
    id: "drone",
    keywords: ["drone", "angani", "juu"],
    build: () =>
      `Ndio, tunafanya **drone shots**. Zinapatikana kwenye **Diamond** (TSH 2,000,000/=) na **Golden** (TSH 1,500,000/=). Kwenye packages nyingine zinaweza kuombwa kama nyongeza — bei inathibitishwa na timu.`,
  },
  {
    id: "prewedding",
    keywords: ["prewedding", "pre wedding", "pre-wedding", "kabla ya harusi"],
    build: () =>
      `**Prewedding photoshoot ni bure** kwenye Diamond, Golden na Basic packages. Kwenye Apple, Vanilla na Mango haipo — unaweza kuiomba kama nyongeza.`,
  },
  {
    id: "booking",
    keywords: ["booking", "book", "nafasi", "slot", "reserve", "kuweka", "miadi"],
    build: () =>
      `Kuweka booking ni hatua nne:\n\n1. Unatuchagulia aina ya tukio (sendoff au harusi).\n2. Unatupa tarehe na mahali.\n3. Unachagua package.\n4. Timu inathibitisha nafasi na kutupa maelezo ya malipo.\n\nSheria za amana zinathibitishwa na timu moja kwa moja.`,
  },
  {
    id: "deliverables",
    keywords: ["photobook", "album", "frame", "softcopy", "soft copy", "hardcopy", "napata nini"],
    build: () =>
      `Unapata:\n\n- Picha zenye **wooden frame** (idadi inategemea package)\n- **Photobook** au **album**\n- **Softcopies** — Diamond 400+, Golden 300+, Basic 200+, Apple/Vanilla 40, Mango 20\n- **Full HD video** kwenye FlashDisk (kulingana na package)`,
  },
  {
    id: "location",
    keywords: ["wapi", "location", "mnapo", "address", "kufika", "direction", "mahali"],
    build: () =>
      `Tupo **${KHAKI_CONFIG.location.address}**, ${KHAKI_CONFIG.location.city}.`,
  },
  {
    id: "hours",
    keywords: ["saa", "muda wa kufungua", "open", "hours", "mnafungua", "usiku"],
    build: () =>
      `**Saa zetu:**\n\n${describeOpeningHours()
        .lines.map((line) => `- ${line}`)
        .join("\n")}`,
  },
  {
    id: "contact",
    keywords: ["namba", "simu", "whatsapp", "email", "barua pepe", "wasiliana", "contact"],
    build: () =>
      `**Wasiliana nasi:**\n\n- WhatsApp / Simu: ${KHAKI_CONFIG.contact.displayPhone}\n- Barua pepe: ${KHAKI_CONFIG.contact.email}\n- Instagram & TikTok: **${KHAKI_CONFIG.social.handle}**\n- Mahali: ${KHAKI_CONFIG.location.address}, ${KHAKI_CONFIG.location.city}`,
  },
];

/** Lower-case, collapse punctuation to spaces, pad so `includes` matches words. */
function normalise(input: string): string {
  return ` ${input.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ")} `;
}

function scoreIntent(intent: Intent, haystack: string): number {
  return intent.keywords.reduce(
    (score, keyword) => (haystack.includes(keyword) ? score + keyword.length : score),
    0,
  );
}

export function answerOffline(question: string): string {
  const haystack = normalise(question);
  const best = INTENTS.map((intent) => ({ intent, score: scoreIntent(intent, haystack) })).sort(
    (a, b) => b.score - a.score,
  )[0];

  if (best && best.score > 0) {
    const answer = best.intent.build();
    if (answer) return answer + CONTACT_FOOTER;
  }

  const faq = KHAKI_FAQS[0];
  return [
    "Sijaelewa vizuri swali lako, lakini hizi ndizo packages zetu:",
    "",
    ...PACKAGES.map((entry) => `- **${entry.name}** — ${entry.price}`),
    "",
    faq ? `Mfano: "${faq.question}" — uliza hivyo na nitakujibu.` : "",
    CONTACT_FOOTER.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}
