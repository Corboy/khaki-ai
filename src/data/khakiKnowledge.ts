/**
 * Khaki Media — service catalogue and prices.
 *
 * Every price the assistant quotes comes from this file. It was built from the
 * studio's own published price list, so the packages and figures below are the
 * real ones.
 *
 * When prices change, change them here — the AI, the pricing cards in the chat
 * and the offline fallback all read from this one place.
 */

import { KHAKI_CONFIG } from "@/config/khaki";

export interface ServicePackage {
  name: string;
  price: string;
  features: string[];
}

export interface ServiceDetail {
  id: string;
  title: string;
  swahiliTitle: string;
  category: "photo" | "video" | "audio" | "event";
  description: string;
  highlights: string[];
  pricing: {
    startingAt: string;
    rateType: string;
    packages: ServicePackage[];
  };
}

export const KHAKI_SERVICES: ServiceDetail[] = [
  {
    id: "sendoff-wedding",
    title: "Sendoff & Wedding Coverage",
    swahiliTitle: "Picha na Video za Sendoff & Harusi",
    category: "event",
    description:
      "Tunafunika siku yako yote — kutoka prewedding photoshoot hadi sherehe yenyewe — na kukuletea picha na video ambazo zinabaki nayo maisha yote.",
    highlights: [
      "Timu ya videographers na photographers kwa siku nzima",
      "TV screens zinaonyesha picha moja kwa moja kwenye sherehe",
      "Drone shots kwa mwonekano wa juu",
      "Highlight video ya dakika 10",
      "Photobook, album na picha zenye wooden frame",
      "Prewedding photoshoot bure",
    ],
    pricing: {
      startingAt: "TSH 170,000",
      rateType: "Kwa package",
      packages: [
        {
          name: "Diamond Sendoff & Wedding Package",
          price: "TSH 2,000,000/=",
          features: [
            "4 TV screens",
            "3 Video camera kwa full video coverage",
            "Three A3 sized photos on wooden frame",
            "160 A3 sized photobook",
            "400+ photos softcopies",
            "FlashDisk with full HD video",
            "Drone shots",
            "10 Min highlight video",
            "Banner",
            "Free prewedding photoshoot",
          ],
        },
        {
          name: "Golden Sendoff & Wedding Package",
          price: "TSH 1,500,000/=",
          features: [
            "3 TV screens",
            "2 videographers kwa full video coverage",
            "2 A4 & 1 A3 sized photos on wooden frame",
            "160 A3 photobook",
            "300+ photos softcopies",
            "FlashDisk with full HD video",
            "Drone shots",
            "10 Min highlight video",
            "Free prewedding photoshoot",
          ],
        },
        {
          name: "Basic Sendoff & Wedding Package",
          price: "TSH 1,000,000/=",
          features: [
            "2 TV screens",
            "Full video coverage",
            "2 A4 sized photos with wooden frame",
            "120 photo album",
            "200+ photos softcopies",
            "FlashDisk with full HD video",
            "Free prewedding photoshoot",
          ],
        },
        {
          name: "Apple Package",
          price: "TSH 550,000/=",
          features: [
            "1 A4 photo with wooden frame",
            "1 A3 photo with wooden frame",
            "40 Hardcopies with album & softcopies",
            "Video coverage (in FlashDisk)",
          ],
        },
        {
          name: "Vanilla Package",
          price: "TSH 350,000/=",
          features: [
            "3 A4 photos with wooden frame",
            "40 Hardcopies with album & softcopies",
            "10 Minutes highlight video",
          ],
        },
        {
          name: "Mango Package",
          price: "TSH 170,000/=",
          features: ["Three A4 sized photos with wooden frame", "20 softcopies"],
        },
      ],
    },
  },
  {
    id: "video-production",
    title: "Video Shooting",
    swahiliTitle: "Kupiga Video",
    category: "video",
    description:
      "Kupiga na kuedit video mpaka kwenye final — kwa tangazo, tukio, content ya mitandao, au kazi yoyote inayohitaji video.",
    highlights: ["Kupiga (shooting)", "Kuedit mpaka final", "Video iliyokamilika unakabidhiwa"],
    pricing: {
      startingAt: "TSH 400,000",
      rateType: "Kwa kazi",
      packages: [
        {
          name: "Video mpaka final",
          price: "TSH 400,000/=",
          features: ["Kupiga na kuedit mpaka final", "Video iliyokamilika unakabidhiwa"],
        },
      ],
    },
  },
  {
    id: "audio",
    title: "Audio",
    swahiliTitle: "Kazi za Audio",
    category: "audio",
    description: "Kazi za sauti kwa kiwango cha kitaalamu.",
    highlights: ["Kazi kamili ya sauti", "Kazi iliyokamilika unakabidhiwa"],
    pricing: {
      startingAt: "TSH 200,000",
      rateType: "Kwa kazi",
      packages: [
        {
          name: "Audio",
          price: "TSH 200,000/=",
          features: ["Kazi kamili ya sauti"],
        },
      ],
    },
  },
];

/**
 * Answers people ask for constantly, written from what the price list actually
 * says. Add to this list as the studio decides more — the assistant treats it
 * as the official answer and will not guess beyond it.
 */
export const KHAKI_FAQS: Array<{ question: string; answer: string }> = [
  {
    question: "Mnafanya kazi gani?",
    answer:
      "Kazi tatu: picha na video za sendoff na harusi (packages zinaanzia TSH 170,000/=), kupiga video mpaka final (TSH 400,000/=), na kazi za audio (TSH 200,000/=).",
  },
  {
    question: "Kupiga video mpaka final ni bei gani?",
    answer:
      "TSH 400,000/= kwa kazi. Tunapiga na kuedit mpaka final, na unakabidhiwa video iliyokamilika.",
  },
  {
    question: "Kazi za audio ni bei gani?",
    answer: "TSH 200,000/= kwa kazi.",
  },
  {
    question: "Packages zenu zinaanzia bei gani?",
    answer:
      "Mango Package ndiyo inaanzia — TSH 170,000/= na unapata picha tatu za A4 zenye wooden frame pamoja na softcopies 20. Kama unataka video pia, Vanilla Package (TSH 350,000/=) inaongeza highlight video ya dakika 10.",
  },
  {
    question: "Tofauti kati ya packages ni ipi?",
    answer:
      "Zinatofautiana kwa ukubwa wa kufunikwa: TV screens (2 hadi 4), idadi ya cameras na videographers, ukubwa wa photobook, wingi wa picha, na kama kuna drone shots. Diamond (TSH 2,000,000/=) ni kamili zaidi — ina drone shots, 3 cameras, 4 TV screens na prewedding photoshoot.",
  },
  {
    question: "Prewedding photoshoot inapatikana kwenye package zipi?",
    answer:
      "Prewedding photoshoot ni bure kwenye Diamond, Golden na Basic packages. Kwenye Apple, Vanilla na Mango haipo — unaweza kuiomba kama nyongeza.",
  },
  {
    question: "Mnafanya drone shots?",
    answer:
      "Ndio. Drone shots zinapatikana kwenye Diamond na Golden packages. Kwenye packages nyingine zinaweza kuombwa kama nyongeza.",
  },
  {
    question: "TV screens ni za nini?",
    answer:
      "TV screens zinaonyesha picha zenu moja kwa moja kwenye sherehe, ili wageni waone picha wakati sherehe inaendelea. Diamond ina 4, Golden 3, Basic 2.",
  },
  {
    question: "Tunapata nini kwa mwisho?",
    answer:
      "Unapata picha zenye wooden frame, photobook au album, softcopies kwenye flash disk, na full HD video kwenye FlashDisk — kulingana na package uliyochagua.",
  },
];

/** Convenience lookup so callers never depend on array order. */
export function findService(id: string): ServiceDetail | undefined {
  return KHAKI_SERVICES.find((service) => service.id === id);
}

/** One-line summary used by the pricing card and the system prompt. */
export const KHAKI_PRICING_SUMMARY = KHAKI_SERVICES.map(
  (service) =>
    `${service.swahiliTitle}: ${service.pricing.packages
      .map((entry) => `${entry.name} ${entry.price}`)
      .join(" · ")}`,
).join(" | ");

export const KHAKI_BRAND_LINE = `${KHAKI_CONFIG.brandName} — ${KHAKI_CONFIG.taglineEn}`;
