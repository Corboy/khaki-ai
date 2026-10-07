/**
 * Khaki Media — single source of business truth.
 *
 * Everything the assistant says about the business (contact details, opening
 * hours, quick actions) is derived from here or from the files in `src/data/`.
 * Change it in one place, and the UI, the WhatsApp link and the AI system
 * prompt all follow.
 *
 * Run `pnpm audit:studio` before going public: it lists every value that still
 * looks like a placeholder.
 */

export interface QuickAction {
  id: string;
  label: string;
  /** lucide-react icon name, resolved in `src/components/chat/welcome.tsx` */
  icon: string;
  prompt: string;
}

export interface OpeningDay {
  /** JavaScript `Date.getDay()`: 0 = Sunday */
  day: number;
  label: string;
  /** 24-hour "HH:MM", or null when there are no fixed hours that day */
  open: string | null;
  close: string | null;
}

export interface KhakiConfig {
  brandName: string;
  /** Shown as the wide-tracked plate above the hero headline */
  wordmark: string;
  tagline: string;
  taglineEn: string;
  assistantName: string;
  /** What the business actually sells, in one line */
  serviceLine: string;
  location: {
    address: string;
    city: string;
    /** How to find the place. Leave empty if there is nothing worth saying. */
    landmarks: string;
  };
  /**
   * Opening hours — the ONLY place these times are written.
   *
   * `src/lib/studio-hours.ts` turns this list into the displayed hours, the
   * live "are we open right now?" indicator, and the copy the AI is given.
   */
  workingHours: {
    schedule: OpeningDay[];
    /** Shown for any day whose hours are null */
    appointmentNote: string;
    /** Sessions that run outside the normal day, described in words */
    overnight: string;
  };
  contact: {
    /** International format, digits only — used to build wa.me links. */
    whatsappNumber: string;
    /** The same number, spaced for reading. Derived from whatsappNumber. */
    displayPhone: string;
    email: string;
  };
  /**
   * Social profiles.
   *
   * Full URLs, not handles, because the handle is not the same everywhere:
   * Instagram and TikTok use `khaki_media_pro`, while YouTube uses
   * `khakimediapro` — the underscored YouTube URL returns 404. All three were
   * checked against the live profiles before being written down.
   */
  social: {
    handle: string;
    instagram: string;
    tiktok: string;
    youtube: string;
  };
  /**
   * Booking terms. Set `depositPercentage` to 0 when the business has not
   * published a deposit rule — the interface and the AI then say the team will
   * confirm it, rather than quoting a number nobody agreed to.
   */
  bookingRules: {
    depositPercentage: number;
    cancellationNoticeHours: number;
    freeRevisionCount: number;
  };
  quickActions: QuickAction[];
}

/** The studio's line, digits only, as it goes into a wa.me link. */
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "255746885113";

/**
 * The same number, spaced the way a customer reads it.
 *
 * Derived rather than typed out beside the number itself. It used to be a
 * separate literal:
 *
 *     whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "255746885113",
 *     displayPhone: "+255 746 885 113",
 *
 * so setting the environment variable -- or changing the number in /admin,
 * which writes the same field -- moved every WhatsApp link to the new line and
 * left every printed number on the old one. The customer would read one number,
 * tap through to another, and the system prompt would tell the assistant to
 * quote a line the studio no longer uses.
 *
 * Formats a Tanzanian number as +255 XXX XXX XXX and anything else as a plain
 * plus-prefixed digit string, so a non-Tanzanian number is at least never
 * rendered wrong.
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 12 && digits.startsWith("255")) {
    return `+255 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 12)}`;
  }
  return digits ? `+${digits}` : "";
}

export const KHAKI_CONFIG: KhakiConfig = {
  brandName: "Khaki Media",
  wordmark: "KHAKI MEDIA PRO PICTURES",
  tagline: "Picha na Video za Sendoff & Harusi",
  taglineEn: "Sendoff & Wedding Photography and Video",
  assistantName: "Khaki AI",
  serviceLine: "Picha na video za sendoff na harusi, kushoot video, live streaming, na kazi za audio",

  location: {
    address: "Mkombozi Street, Kibugumo, Kigamboni",
    city: "Dar es Salaam, Tanzania",
    landmarks: "",
  },

  workingHours: {
    // Siku saba kwa wiki. Saa za Kiswahili: "saa mbili asubuhi" = 08:00,
    // "saa nne usiku" = 22:00.
    schedule: [
      { day: 1, label: "Jumatatu", open: "08:00", close: "22:00" },
      { day: 2, label: "Jumanne", open: "08:00", close: "22:00" },
      { day: 3, label: "Jumatano", open: "08:00", close: "22:00" },
      { day: 4, label: "Alhamisi", open: "08:00", close: "22:00" },
      { day: 5, label: "Ijumaa", open: "08:00", close: "22:00" },
      { day: 6, label: "Jumamosi", open: "08:00", close: "22:00" },
      { day: 0, label: "Jumapili", open: "08:00", close: "22:00" },
    ],
    appointmentNote: "Kwa miadi",
    overnight: "",
  },

  contact: {
    whatsappNumber: WHATSAPP_NUMBER,
    displayPhone: formatPhone(WHATSAPP_NUMBER),
    email: "khakimediapro@gmail.com",
  },

  social: {
    handle: "khaki_media_pro",
    instagram: "https://www.instagram.com/khaki_media_pro/",
    tiktok: "https://www.tiktok.com/@khaki_media_pro",
    youtube: "https://www.youtube.com/@khakimediapro",
  },

  bookingRules: {
    // Not published on the price list, so nothing is quoted until the team says.
    depositPercentage: 0,
    cancellationNoticeHours: 0,
    freeRevisionCount: 0,
  },

  /*
   * Four, and only four.
   *
   * There were seven — the four services, plus "Bei za Packages", "Picha za
   * Drone" and "Weka Booking" — and on a phone they filled the screen above the
   * composer. Seven choices is not a welcome, it is a decision the customer has
   * to make before they can ask anything. Drone is an add-on inside some
   * packages, not a service; prices are what the assistant is for; and booking
   * arrives on its own once the conversation starts, because the prompt asks for
   * a name and a date.
   *
   * Four matches the price list exactly: three services and the audio work.
   */
  quickActions: [
    {
      id: "wedding",
      label: "Sendoff/Harusi",
      icon: "Heart",
      prompt: "Nataka kujua huduma zenu za sendoff na harusi.",
    },
    {
      id: "video",
      label: "Kushoot Video",
      icon: "Video",
      prompt: "Nataka kushoot video mpaka final. Bei na mchakato ukoje?",
    },
    {
      id: "streaming",
      label: "Live Streaming",
      icon: "Radio",
      prompt: "Live streaming ni bei gani, na masharti yake yakoje?",
    },
    {
      id: "audio",
      label: "Kazi za Audio",
      icon: "Mic",
      prompt: "Nataka kujua kuhusu kazi za audio na bei yake.",
    },
  ],
};

/** Locale-stable currency formatting. Matches the studio's own price lists. */
export function formatTSH(amount: number): string {
  return `TSH ${amount.toLocaleString("en-US")}`;
}

export interface BookingDraft {
  name?: string;
  service?: string;
  date?: string;
  time?: string;
  notes?: string;
}

/**
 * Builds the official WhatsApp booking link, pre-filled with whatever the
 * customer has already told the assistant.
 *
 * `overrideNumber` lets the runtime value from /admin win over the build-time
 * default; pass digits only.
 */
export function buildWhatsAppBookingUrl(
  params: BookingDraft,
  overrideNumber?: string,
): string {
  const source = overrideNumber?.trim() || KHAKI_CONFIG.contact.whatsappNumber;
  const number = source.replace(/[^0-9]/g, "");

  const lines = ["Habari Khaki Media 👋", "Nataka kufanya booking.", ""];
  if (params.name?.trim()) lines.push(`Jina: ${params.name.trim()}`);
  if (params.service?.trim()) lines.push(`Huduma: ${params.service.trim()}`);
  if (params.date?.trim()) lines.push(`Tarehe: ${params.date.trim()}`);
  if (params.time?.trim()) lines.push(`Muda: ${params.time.trim()}`);
  if (params.notes?.trim()) lines.push(`Maelezo: ${params.notes.trim()}`);
  lines.push("", "Nimepata taarifa kupitia Khaki AI.");

  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/** Plain tel: link for customers who prefer a phone call. */
export function buildTelUrl(): string {
  return `tel:+${KHAKI_CONFIG.contact.whatsappNumber.replace(/[^0-9]/g, "")}`;
}

/**
 * sms: link, with the body pre-filled.
 *
 * The third way to reach the studio, and the one most often left out. On a
 * phone the difference matters: `tel:` starts a call the customer may not want
 * to pay for, `sms:` opens a message they can send when they have a moment. The
 * separator after the number differs by platform — iOS wants `&body=`, Android
 * wants `?body=` — so this uses the question mark, which both accept, rather
 * than the ampersand, which iOS ignores on its own.
 */
export function buildSmsUrl(body?: string): string {
  const number = KHAKI_CONFIG.contact.whatsappNumber.replace(/[^0-9]/g, "");
  const text = body?.trim() || `Habari ${KHAKI_CONFIG.brandName}, nataka kujua kuhusu huduma zenu.`;
  return `sms:+${number}?body=${encodeURIComponent(text)}`;
}
