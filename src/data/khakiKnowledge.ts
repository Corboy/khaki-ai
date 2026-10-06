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
      "Timu ya wapiga picha na video kwa siku nzima",
      "TV screen zinaonyesha picha moja kwa moja kwenye sherehe",
      "Picha za drone kutoka juu",
      "Video fupi ya dakika 10",
      "Album na picha zenye frame ya mbao",
      "Prewedding bure",
    ],
    pricing: {
      startingAt: "TSH 170,000",
      rateType: "Kwa package",
      packages: [
        {
          name: "Diamond Sendoff & Wedding Package",
          price: "TSH 2,000,000/=",
          features: [
            "TV screen 4",
            "Kamera 3 za video, kufunika tukio lote",
            "Picha 3 za A3 kwenye frame ya mbao",
            "Album ya picha 160 za A3",
            "Picha 400+ kwenye simu",
            "Flash disk yenye video ya HD",
            "Picha za drone",
            "Video fupi ya dakika 10",
            "Banner",
            "Prewedding bure",
          ],
        },
        {
          name: "Golden Sendoff & Wedding Package",
          price: "TSH 1,500,000/=",
          features: [
            "TV screen 3",
            "Wapiga video 2, kufunika tukio lote",
            "Picha 2 za A4 na 1 ya A3 kwenye frame ya mbao",
            "Album ya picha 160 za A3",
            "Picha 300+ kwenye simu",
            "Flash disk yenye video ya HD",
            "Picha za drone",
            "Video fupi ya dakika 10",
            "Prewedding bure",
          ],
        },
        {
          name: "Basic Sendoff & Wedding Package",
          price: "TSH 1,000,000/=",
          features: [
            "TV screen 2",
            "Kufunika tukio lote kwa video",
            "Picha 2 za A4 kwenye frame ya mbao",
            "Album ya picha 120",
            "Picha 200+ kwenye simu",
            "Flash disk yenye video ya HD",
            "Prewedding bure",
          ],
        },
        {
          name: "Apple Package",
          price: "TSH 550,000/=",
          features: [
            "Picha 1 ya A4 kwenye frame ya mbao",
            "Picha 1 ya A3 kwenye frame ya mbao",
            "Picha 40 zilizochapwa, na album, na kwenye simu",
            "Video kwenye flash disk",
          ],
        },
        {
          name: "Vanilla Package",
          price: "TSH 350,000/=",
          features: [
            "Picha 3 za A4 kwenye frame ya mbao",
            "Picha 40 zilizochapwa, na album, na kwenye simu",
            "Video fupi ya dakika 10",
          ],
        },
        {
          name: "Mango Package",
          price: "TSH 170,000/=",
          features: ["Picha 3 za A4 kwenye frame ya mbao", "Picha 20 kwenye simu"],
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
    highlights: ["Kupiga video", "Kuedit mpaka final", "Video iliyokamilika unakabidhiwa"],
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
 * Answers people ask for constantly.
 *
 * Deliberately short. Everything a customer asks about price or contents is
 * already in `KHAKI_SERVICES` above, and repeating it here used to cost the
 * assistant about 500 tokens on every single message. These three earn their
 * place because they state something the raw price list does not: what the
 * business actually does, how the tiers differ, and what you walk away with.
 *
 * Add one when it cannot be derived from the packages.
 */
export const KHAKI_FAQS: Array<{ question: string; answer: string }> = [
  {
    question: "Mnafanya kazi gani?",
    answer:
      "Kazi tatu: picha na video za sendoff na harusi, kupiga video mpaka final, na kazi za audio.",
  },
  {
    question: "Tofauti kati ya packages ni ipi?",
    answer:
      "Ukubwa wa kufunikwa: TV screens (2–4), idadi ya kamera, ukubwa wa album, wingi wa picha, na kama kuna picha za drone.",
  },
  {
    question: "Tunapata nini kwa mwisho?",
    answer:
      "Picha zenye frame ya mbao, album ya picha, picha kwenye simu, na video ya HD kwenye flash disk — kulingana na package.",
  },
];

/** Convenience lookup so callers never depend on array order. */
export function findService(id: string): ServiceDetail | undefined {
  return KHAKI_SERVICES.find((service) => service.id === id);
}
