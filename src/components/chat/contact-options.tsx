"use client";

import { MessageCircle, Phone } from "lucide-react";

import { useStudioInfo } from "@/components/studio-info";
import { buildTelUrl, buildWhatsAppContactUrl } from "@/config/khaki";
import { cn } from "@/lib/utils";

export interface ContactOptionsProps {
  /** A booking card can supply its already-prepared, consent-based draft URL. */
  whatsappHref?: string;
  /** Used when no prebuilt WhatsApp URL is supplied. */
  whatsappMessage?: string;
  whatsappLabel?: string;
  compact?: boolean;
}

/** The customer chooses WhatsApp or a normal phone call; neither happens automatically. */
export function ContactOptions({
  whatsappHref,
  whatsappMessage,
  whatsappLabel = "WhatsApp",
  compact = false,
}: ContactOptionsProps) {
  const { whatsappNumber, displayPhone } = useStudioInfo();
  const whatsappUrl =
    whatsappHref ?? buildWhatsAppContactUrl(whatsappMessage, whatsappNumber);
  const callUrl = buildTelUrl(whatsappNumber);

  return (
    <div
      role="group"
      aria-label="Chagua njia ya kuwasiliana"
      className={cn("grid grid-cols-1 gap-2", !compact && "sm:grid-cols-2")}
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={`${whatsappLabel}; ujumbe utafunguliwa bila kutumwa`}
        className={cn(
          "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2",
          "bg-[#25d366] text-[14px] font-semibold text-[#062b13] shadow-sm shadow-black/20",
          "transition-colors duration-150 hover:bg-[#48e17b] active:translate-y-px",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8df2ad] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f1f1f]",
          "motion-reduce:transition-none motion-reduce:active:translate-y-0",
        )}
      >
        <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span>{whatsappLabel}</span>
      </a>

      <a
        href={callUrl}
        aria-label={`Piga simu ${displayPhone}`}
        className={cn(
          "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2",
          "border border-gold-400/35 bg-gold-500/[0.10] text-[14px] font-semibold text-gold-100",
          "transition-colors duration-150 hover:border-gold-300/65 hover:bg-gold-500/[0.18] active:translate-y-px",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f1f1f]",
          "motion-reduce:transition-none motion-reduce:active:translate-y-0",
        )}
      >
        <Phone aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="flex flex-col items-start leading-tight">
          <span>Piga simu</span>
          <span className="text-[11px] font-normal text-gold-200/75">{displayPhone}</span>
        </span>
      </a>
    </div>
  );
}
