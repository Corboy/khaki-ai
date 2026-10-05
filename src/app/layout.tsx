import type { Metadata, Viewport } from "next";

import { KHAKI_CONFIG } from "@/config/khaki";
import "./globals.css";

/**
 * No web fonts are loaded.
 *
 * This is deliberate, and it is what Apple's own guidance prescribes: use the
 * platform's system face. On iPhone, iPad and Mac that is SF Pro — the real
 * thing, not a lookalike — and on Android and Windows the system sans is the
 * one those users already read everything in. It also means the production
 * build never depends on reaching a font CDN.
 */

export const metadata: Metadata = {
  // Set NEXT_PUBLIC_SITE_URL on deploy. Left as localhost, every shared link
  // points at a machine nobody else can reach.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Khaki AI — Picha na Video za Sendoff & Harusi",
    template: "%s · Khaki AI",
  },
  description:
    "Msaidizi wa Khaki Media Pro Pictures. Uliza kuhusu packages za sendoff na harusi, bei, drone shots, prewedding photoshoot na booking — upate jibu papo hapo.",
  applicationName: "Khaki AI",
  keywords: [
    "Khaki Media",
    "sendoff",
    "harusi",
    "wedding photography Tanzania",
    "picha za harusi Dar es Salaam",
    "video coverage",
    "Kigamboni",
  ],
  icons: {
    icon: [
      { url: "/images/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/khaki-logo.png", type: "image/png" },
    ],
    /* The size iOS asks for. Pointing it at the 305px source made iOS rescale
       the art itself, which softens it. */
    apple: [{ url: "/images/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Khaki AI",
  },
  openGraph: {
    title: "Khaki AI — Picha na Video za Sendoff & Harusi",
    description: KHAKI_CONFIG.taglineEn,
    type: "website",
    // WhatsApp is the main way links travel here, and a card with no image
    // looks broken in that preview.
    images: [{ url: "/images/khaki-logo.png", width: 305, height: 301, alt: "Khaki Media" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /* Zoom stays available — this app is text-heavy and disabling pinch-zoom
     would fail WCAG 1.4.4. */
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
  /* Shrink the layout when the soft keyboard opens. Without this, `100dvh`
     tracks browser chrome rather than the keyboard and the composer can end up
     hidden behind it. */
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sw">
      <body className="min-h-[100dvh] bg-black text-ink antialiased">{children}</body>
    </html>
  );
}
