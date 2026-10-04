/**
 * Central Configuration for Khaki Media & Khaki AI
 * Edit contact details, WhatsApp number, and business profile here.
 */

export interface KhakiConfig {
  brandName: string;
  tagline: string;
  subtitle: string;
  assistantName: string;
  location: {
    address: string;
    city: string;
    landmarks: string;
    studioFloor: string;
  };
  workingHours: {
    weekdays: string;
    saturdays: string;
    sundays: string;
    overnight: string;
  };
  contact: {
    whatsappNumber: string; // International format without + or spaces (e.g. 255712345678 or 254...)
    displayPhone: string;
    email: string;
    instagram: string;
    youtube: string;
  };
  bookingRules: {
    depositPercentage: number;
    cancellationNoticeHours: number;
    freeRevisionCount: number;
  };
  quickActions: Array<{
    id: string;
    label: string;
    icon: string;
    prompt: string;
  }>;
}

export const KHAKI_CONFIG: KhakiConfig = {
  brandName: "Khaki Media",
  tagline: "Creative Media & Sound Production Studio",
  subtitle: "Your AI Studio Assistant",
  assistantName: "Khaki AI",
  location: {
    address: "Plot 42, Studio Creative Hub, Kinondoni / Victoria",
    city: "Dar es Salaam, Tanzania",
    landmarks: "Opposite creative plaza, 2 minutes from the main road. Dedicated secure parking available.",
    studioFloor: "1st Floor, Sound Suite A & Visual Bay 2",
  },
  workingHours: {
    weekdays: "Jumatatu – Ijumaa: 08:30 Asubuhi – 09:00 Usiku",
    saturdays: "Jumamosi: 09:00 Asubuhi – 08:00 Usiku",
    sundays: "Jumapili: Kwa appointment / Special session tu",
    overnight: "Overnight Sessions (10:00 Usiku – 06:00 Alfajiri) zipo kwa booking ya mapema",
  },
  contact: {
    // Easily change the studio WhatsApp number here or override via NEXT_PUBLIC_WHATSAPP_NUMBER
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "255744000111",
    displayPhone: "+255 744 000 111",
    email: "info@khakimedia.com",
    instagram: "@khakimedia",
    youtube: "Khaki Media Official",
  },
  bookingRules: {
    depositPercentage: 50,
    cancellationNoticeHours: 24,
    freeRevisionCount: 2,
  },
  quickActions: [
    {
      id: "recording",
      label: "Studio Recording",
      icon: "Mic",
      prompt: "Niambie kuhusu huduma za Studio Recording na package zake.",
    },
    {
      id: "video",
      label: "Video Production",
      icon: "Video",
      prompt: "Mnafanya video gani (music, commercial au events) na pricing ikoje?",
    },
    {
      id: "livestream",
      label: "Livestream & Podcast",
      icon: "Radio",
      prompt: "Nina podcast / event ninataka kulivestream, mnatoa huduma gani na vifaa gani?",
    },
    {
      id: "photography",
      label: "Photography",
      icon: "Camera",
      prompt: "Nataka kufanya photoshoot (studio au outdoor). Packages ni zipi?",
    },
    {
      id: "design",
      label: "Graphics & Branding",
      icon: "Palette",
      prompt: "Mnatoa huduma za graphic design, cover art au company branding?",
    },
    {
      id: "booking",
      label: "Book Studio",
      icon: "CalendarCheck",
      prompt: "Nataka kuweka booking ya studio. Utaratibu ukoje?",
    },
  ],
};

/**
 * Builds the official Khaki Media WhatsApp booking URL
 * Automatically includes caller info and clean formatting
 */
export function buildWhatsAppBookingUrl(params: {
  name?: string;
  service?: string;
  date?: string;
  time?: string;
  notes?: string;
}): string {
  const number = KHAKI_CONFIG.contact.whatsappNumber.replace(/[^0-9]/g, "");

  const parts = ["Habari Khaki Media 👋\n", "Nataka kufanya booking.\n"];

  if (params.name && params.name.trim()) {
    parts.push(`Jina: ${params.name.trim()}`);
  }
  if (params.service && params.service.trim()) {
    parts.push(`Huduma: ${params.service.trim()}`);
  }
  if (params.date && params.date.trim()) {
    parts.push(`Tarehe: ${params.date.trim()}`);
  }
  if (params.time && params.time.trim()) {
    parts.push(`Muda: ${params.time.trim()}`);
  }
  if (params.notes && params.notes.trim()) {
    parts.push(`Maelezo: ${params.notes.trim()}`);
  }

  parts.push("\nNimepata taarifa kupitia Khaki AI.");

  const messageText = parts.join("\n");
  const encodedText = encodeURIComponent(messageText);

  return `https://wa.me/${number}?text=${encodedText}`;
}
