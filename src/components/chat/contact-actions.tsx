"use client";

import { Phone, MessageSquare } from "lucide-react";

import { buildSmsUrl, buildTelUrl, KHAKI_CONFIG } from "@/config/khaki";
import { cn } from "@/lib/utils";

/**
 * The three ways to reach the studio, as buttons.
 *
 * The number was printed as a link, or written as a bare `tel:`, which left the
 * customer to work out the rest. On a phone that is three different intentions —
 * call now, send a message when I have a moment, or open WhatsApp — and the
 * control should say which is which before it is pressed.
 *
 * Each button carries the mark of the thing it opens, and the destination is the
 * platform's own scheme: `https://wa.me`, `tel:`, `sms:`. Nothing routes through
 * a redirect, so a press opens the app the customer expects.
 *
 * The glow is the studio's gold, on the border and behind the button. It reads
 * as lit rather than coloured, and it is a box-shadow, so it costs no layout and
 * cannot shift the text underneath it. Reduced motion is respected: the glow
 * changes, nothing pulses.
 */

/** The WhatsApp glyph. Lucide has no brand marks, and a speech bubble is not it. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.62-.93-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.46s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35ZM12.04 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.19 4.23-9.41 9.42-9.41 2.52 0 4.88.98 6.66 2.76a9.35 9.35 0 0 1 2.76 6.66c0 5.19-4.23 9.41-9.43 9.41Zm8.02-17.43A11.35 11.35 0 0 0 12.04.75C5.78.75.69 5.84.69 12.09c0 2 .52 3.95 1.52 5.67L.59 23.25l5.62-1.47a11.3 11.3 0 0 0 5.82 1.48h.01c6.25 0 11.34-5.09 11.34-11.34 0-3.03-1.18-5.88-3.32-8.02Z" />
    </svg>
  );
}

interface ContactActionsProps {
  /** Pre-filled message for WhatsApp and SMS. */
  body?: string;
  /** Compact for the sidebar; roomy for the welcome screen. */
  size?: "sm" | "md";
  className?: string;
}

const GOLD = "#d4af37";

const GLOW =
  "shadow-[0_0_0_1px_rgba(212,175,55,0.16),0_0_14px_-4px_rgba(212,175,55,0.30)] hover:shadow-[0_0_0_1px_rgba(212,175,55,0.42),0_0_22px_-2px_rgba(212,175,55,0.55)] focus-visible:shadow-[0_0_0_1px_rgba(212,175,55,0.42),0_0_22px_-2px_rgba(212,175,55,0.55)]";

const BASE =
  "group flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#d4af37]/20 bg-white/[0.03] font-medium text-ink transition duration-2 ease-fluid hover:border-[#d4af37]/45 hover:bg-[#d4af37]/[0.08] hover:text-[#f0d98a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/45";

export function ContactActions({ body, size = "sm", className }: ContactActionsProps) {
  const whatsappNumber = KHAKI_CONFIG.contact.whatsappNumber.replace(/[^0-9]/g, "");
  const whatsapp = body
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(body)}`
    : `https://wa.me/${whatsappNumber}`;

  const height = size === "sm" ? "h-10 text-[12.5px]" : "h-12 text-[13.5px]";
  const icon = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  const items = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: whatsapp,
      external: true,
      icon: <WhatsAppIcon className={icon} />,
      tint: "text-[#25D366]",
    },
    {
      key: "call",
      label: "Piga simu",
      href: buildTelUrl(),
      external: false,
      icon: <Phone className={icon} aria-hidden="true" />,
      tint: "text-[#8fd6a8]",
    },
    {
      key: "sms",
      label: "Tuma SMS",
      href: buildSmsUrl(body),
      external: false,
      icon: <MessageSquare className={icon} aria-hidden="true" />,
      tint: "text-[#9fc4e8]",
    },
  ];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          {...(item.external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
          aria-label={`${item.label} — ${KHAKI_CONFIG.contact.displayPhone}`}
          className={cn(BASE, GLOW, height)}
        >
          <span className={cn("shrink-0 transition duration-2 ease-fluid", item.tint)} aria-hidden="true">
            {item.icon}
          </span>
          <span className="truncate">{item.label}</span>
        </a>
      ))}
      <span className="sr-only" style={{ color: GOLD }}>
        {KHAKI_CONFIG.contact.displayPhone}
      </span>
    </div>
  );
}
