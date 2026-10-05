"use client";

import type { ReactNode } from "react";
import { MessageCircle, RotateCw } from "lucide-react";

import { KhakiMark } from "@/components/brand/khaki-mark";
import { KHAKI_CONFIG } from "@/config/khaki";
import { cn } from "@/lib/utils";

/**
 * BrandedFallback — the screen shown when the app cannot show itself.
 *
 * Two moments: a render error, and a wrong URL. Both used to fall through to
 * Next.js's default pages — an unstyled English "Application error: a
 * client-side exception has occurred", which is the wrong language, the wrong
 * voice, and no way to reach the business from a page that is already broken.
 *
 * A third moment was listed here for a long time: the first frame, before saved
 * history had been read. That stopped being true when the loading shell was
 * changed to render the real app chrome with the mark, so the comment was
 * describing a caller that no longer exists.
 *
 * The phone number is on both of the remaining ones. If the software is
 * unavailable, the business still is not.
 */

export interface BrandedFallbackProps {
  /** Small all-caps line above the headline */
  eyebrow?: string;
  headline: string;
  body?: string;
  /** Shows a spinner instead of a call to action */
  busy?: boolean;
  onRetry?: () => void;
  /**
   * Extra actions, rendered in the same row as retry and contact.
   *
   * Appending them after this component instead put them below a full-height
   * centred block, which pushed them off the bottom of the screen.
   */
  children?: ReactNode;
  className?: string;
}

export function BrandedFallback({
  eyebrow,
  headline,
  body,
  busy = false,
  onRetry,
  children,
  className,
}: BrandedFallbackProps) {
  return (
    /*
     * A <main>, because this is the whole page.
     *
     * It was a div, so on all three of these screens -- the wrong URL, a render
     * error, the first frame -- the logo, the headline and the buttons sat
     * outside every landmark. axe reports it as "document should have one main
     * landmark", which is the difference between a screen reader user being
     * able to jump to the content and having to read whatever the document
     * order happens to be.
     *
     * Fixed here rather than in each caller: the chat page was given a <main>
     * rounds ago and these two were not, because the fix was applied where the
     * symptom was seen instead of where the component lives.
     */
    <main
      className={cn(
        "flex min-h-[100dvh] w-full flex-col items-center justify-center gap-5 px-6 text-center",
        className,
      )}
    >
      <KhakiMark size={64} halo priority />

      <div className="flex flex-col items-center gap-2.5">
        <p className="plate-type text-gold-300">{eyebrow ?? KHAKI_CONFIG.wordmark}</p>

        <h1 className="max-w-[22rem] text-balance text-[22px] font-semibold leading-[1.2] tracking-[-0.025em] text-white">
          {headline}
        </h1>

        {body && (
          <p className="max-w-[26rem] text-pretty text-[14.5px] leading-[1.6] text-ink-2">{body}</p>
        )}
      </div>

      {busy ? (
        <span className="flex items-center gap-2 text-[13px] text-ink-4" role="status" aria-live="polite">
          <RotateCw className="h-3.5 w-3.5 animate-spin" />
          Inapakia…
        </span>
      ) : (
        <div className="flex flex-col items-center gap-2.5 sm:flex-row">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full brass-fill metal-sweep px-5 text-[14.5px] font-semibold text-black shadow-gold transition active:scale-[0.97] hover:brightness-110"
            >
              <RotateCw className="h-4 w-4" />
              Jaribu tena
            </button>
          )}

          <a
            href={`https://wa.me/${KHAKI_CONFIG.contact.whatsappNumber.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-5 text-[14.5px] font-medium text-ink transition duration-2 ease-fluid hover:border-emerald-400/35 hover:bg-emerald-400/[0.09] hover:text-emerald-200"
          >
            <MessageCircle className="h-4 w-4" />
            Wasiliana nasi
          </a>

          {children}
        </div>
      )}
    </main>
  );
}
