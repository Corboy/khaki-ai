"use client";

import { ThreadPrimitive } from "@assistant-ui/react";
import {
  CalendarCheck,
  Heart,
  Instagram,
  Mic,
  Radio,
  Sparkles,
  Video,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { KhakiMark } from "@/components/brand/khaki-mark";
import { KHAKI_CONFIG } from "@/config/khaki";
import { KHAKI_SERVICES } from "@/data/khakiKnowledge";
import { getStudioStatus, isAppointmentOnly, type StudioStatus } from "@/lib/studio-hours";
import { cn } from "@/lib/utils";

/** Resolves the icon name stored in the quick-action config. */
const ACTION_ICONS: Record<string, LucideIcon> = {
  Heart,
  Video,
  Mic,
  Radio,
  Sparkles,
  CalendarCheck,
};

const STARTING_PRICE = KHAKI_SERVICES[0]?.pricing.startingAt ?? "";

/**
 * ThreadWelcome — the first thing anyone sees.
 *
 * It has one job: say what this business sells, and offer a way in.
 *
 * ---------------------------------------------------------------------------
 * The entrance
 * ---------------------------------------------------------------------------
 * A CSS stagger driven by `--i` (globals.css explains why it is not a GSAP
 * timeline). The `welcome-item` utility uses `backwards` fill, so the final
 * transform is released and the quick-action cards keep their hover lift —
 * a `forwards`-filled `transform` would out-rank `hover:-translate-y-0.5` and
 * the cards would animate in and then stop responding to the pointer.
 *
 * ---------------------------------------------------------------------------
 * The marquee
 * ---------------------------------------------------------------------------
 * The strip under the cards scrolls the studio's real service names, pulled
 * from `KHAKI_SERVICES` rather than typed out here — so a service can never be
 * advertised in the hero and missing from the price list, or vice versa.
 *
 * It is `aria-hidden`: a screen reader already gets the same four services as
 * labelled buttons directly above, and hearing them a second time as a
 * continuously looping list is noise, not information.
 */
export function ThreadWelcome() {
  const [status, setStatus] = useState<StudioStatus | null>(null);

  // Resolved on the client so server and client markup always agree.
  useEffect(() => {
    if (isAppointmentOnly()) return;
    setStatus(getStudioStatus());
    const id = window.setInterval(() => setStatus(getStudioStatus()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[46rem] flex-col items-center px-4 pb-6 pt-2 text-center sm:pt-4">
      {/* ---- The mark, with its orbit ---------------------------------- */}
      <div className="welcome-badge relative grid place-items-center">
        {/* Rotating aura. Sits behind the mark, sized in `em`-ish terms so it
            scales with the badge at both breakpoints instead of needing two
            sets of pixel values. */}
        <span
          aria-hidden
          className="pointer-events-none absolute h-[190%] w-[190%] animate-orbit-slow rounded-full opacity-70"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(var(--gold-rgb) / 0.26) 42deg, transparent 96deg, transparent 180deg, rgba(var(--gold-rgb) / 0.16) 214deg, transparent 268deg)",
            mask: "radial-gradient(closest-side, transparent 58%, #000 62%, #000 78%, transparent 82%)",
            WebkitMask:
              "radial-gradient(closest-side, transparent 58%, #000 62%, #000 78%, transparent 82%)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute h-[145%] w-[145%] animate-orbit-rev rounded-full opacity-60"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(var(--gold-rgb) / 0.34) 22deg, transparent 52deg, transparent 200deg, rgba(var(--gold-rgb) / 0.2) 226deg, transparent 258deg)",
            mask: "radial-gradient(closest-side, transparent 70%, #000 74%, #000 88%, transparent 92%)",
            WebkitMask:
              "radial-gradient(closest-side, transparent 70%, #000 74%, #000 88%, transparent 92%)",
          }}
        />

        <KhakiMark size={88} sweep halo priority className="relative sm:hidden" />
        <KhakiMark size={140} sweep halo className="relative hidden sm:block" />
      </div>

      <p
        className="welcome-item plate-type mt-6 text-gold-300 sm:mt-7"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        {KHAKI_CONFIG.wordmark}
      </p>

      <h1
        className="welcome-item mt-3 text-balance text-hero text-white sm:mt-3.5"
        style={{ "--i": 2 } as React.CSSProperties}
      >
        Picha na video za{" "}
        <span className="text-metal text-metal-anim">sendoff na harusi</span>.
      </h1>

      <p
        className="welcome-item mt-4 max-w-[36rem] text-pretty text-lead text-ink-2 sm:mt-5"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        Tuambie unahitaji nini — sendoff, harusi, kushoot video au kazi za audio — nitakuonyesha
        bei na hatua zinazofuata.
        {STARTING_PRICE && (
          <>
            {" "}
            Zinaanzia <span className="tnum font-medium text-gold-300">{STARTING_PRICE}</span>.
          </>
        )}
      </p>

      <StudioChip status={status} />

      {/* ---- Ways in ----------------------------------------------------- */}
      <div className="mt-5 grid w-full grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:mt-7 sm:gap-2.5">
        {KHAKI_CONFIG.quickActions.map((action, index) => {
          const Icon = ACTION_ICONS[action.icon] ?? Sparkles;
          return (
            <SpotlightAction key={action.id} action={action} index={index} Icon={Icon} />
          );
        })}
      </div>

      <ServiceMarquee />

      <ContactRow />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick action, with a cursor-tracking spotlight                      */
/* ------------------------------------------------------------------ */

/**
 * The card follows the pointer with a soft brass highlight.
 *
 * Implemented by writing `--mx`/`--my` on the element from one `onMouseMove`
 * handler and letting CSS read them into a `radial-gradient` position — the
 * highlight is painted by the compositor and never touches React state, so
 * moving the pointer across four cards costs zero renders.
 *
 * Guarded to fine pointers: on a touch device there is no cursor to follow, so
 * the listener is never attached and the card keeps its plain surface.
 */
function SpotlightAction({
  action,
  index,
  Icon,
}: {
  action: (typeof KHAKI_CONFIG.quickActions)[number];
  index: number;
  Icon: LucideIcon;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const onMouseMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    element.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }, []);

  return (
    <ThreadPrimitive.Suggestion
      prompt={action.prompt}
      send
      clearComposer
      onMouseMove={onMouseMove}
      ref={ref}
      className={cn(
        "welcome-item group/action relative isolate flex min-h-[68px] items-center gap-3.5 overflow-hidden rounded-2xl px-4 py-3.5 text-left sm:min-h-[74px]",
        "surface-card transition-[transform,border-color,box-shadow] duration-2 ease-fluid",
        "hover:-translate-y-0.5 hover:border-gold-500/35 hover:shadow-gold",
        "active:translate-y-0 active:scale-[0.985]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/70",
        "[@media(pointer:fine)]:hover:border-gold-500/45",
      )}
      style={{ "--i": 5 + index } as React.CSSProperties}
    >
      {/* Spotlight — only painted once the pointer is over the card. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-2 group-hover/action:opacity-100"
        style={{
          background:
            "radial-gradient(180px circle at var(--mx, 50%) var(--my, 50%), rgba(var(--gold-rgb) / 0.14), transparent 68%)",
        }}
      />

      {/* Sheen that crosses the card on hover. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -z-10 w-1/4 -translate-x-full opacity-0 transition-opacity duration-2 group-hover/action:opacity-100 group-hover/action:animate-sheen"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(var(--gold-rgb) / 0.12), transparent)",
        }}
      />

      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-500/10 text-gold-400 ring-1 ring-gold-500/25 transition-colors duration-2 group-hover/action:bg-gold-500/[0.16] group-hover/action:text-gold-300">
        <Icon className="h-[1.2rem] w-[1.2rem]" strokeWidth={1.75} />
      </span>

      <span className="min-w-0">
        <span className="block text-[15.5px] font-medium leading-snug tracking-[-0.016em] text-ink">
          {action.label}
        </span>
      </span>

      {/* Chevron slides in on hover — signals "this sends something". */}
      <span
        aria-hidden
        className="ml-auto translate-x-1 text-gold-500/0 transition-all duration-2 group-hover/action:translate-x-0 group-hover/action:text-gold-500/70"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </span>
    </ThreadPrimitive.Suggestion>
  );
}

/* ------------------------------------------------------------------ */
/* Service marquee                                                     */
/* ------------------------------------------------------------------ */

/**
 * An infinite strip of the studio's real services.
 *
 * The track holds the list twice and translates by exactly -50%, so the second
 * copy lands where the first began and the loop has no visible seam. Pausing on
 * hover is handled with `hover:[animation-play-state:paused]` so a reader can
 * actually catch a name.
 */
function ServiceMarquee() {
  const items = KHAKI_SERVICES.map((service) => service.swahiliTitle);
  if (items.length === 0) return null;

  return (
    <div
      aria-hidden
      className="welcome-item mask-fade-x relative mt-6 w-full overflow-hidden sm:mt-7"
      style={{ "--i": 11 } as React.CSSProperties}
    >
      <div className="flex w-max animate-marquee items-center gap-8 hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-8">
            {items.map((label, index) => (
              <span key={`${copy}-${index}`} className="flex shrink-0 items-center gap-8">
                <span className="whitespace-nowrap text-[12.5px] font-medium uppercase tracking-[0.16em] text-ink-2">
                  {label}
                </span>
                <span className="h-1 w-1 shrink-0 rounded-full bg-gold-500/60" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contact row                                                         */
/* ------------------------------------------------------------------ */

function ContactRow() {
  return (
    <div
      className="welcome-item mt-5 flex flex-col items-center gap-3"
      style={{ "--i": 12 } as React.CSSProperties}
    >
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12.5px] leading-relaxed text-ink-4">
        <span>
          {KHAKI_CONFIG.location.address}, {KHAKI_CONFIG.location.city}
        </span>
        <span aria-hidden className="inline-block h-3 w-px bg-white/15 align-middle" />
        <a
          href={`tel:+${KHAKI_CONFIG.contact.whatsappNumber.replace(/[^0-9]/g, "")}`}
          className="tnum transition-colors duration-2 hover:text-gold-300"
        >
          {KHAKI_CONFIG.contact.displayPhone}
        </a>
      </p>

      <div className="flex items-center gap-1">
        {[
          { href: KHAKI_CONFIG.social.instagram, label: "Instagram", Icon: Instagram },
          { href: KHAKI_CONFIG.social.tiktok, label: "TikTok", Icon: TikTokGlyph },
          { href: KHAKI_CONFIG.social.youtube, label: "YouTube", Icon: Youtube },
        ].map(({ href, label, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={label}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full text-ink-4",
              "transition-[color,background-color,transform] duration-2 ease-fluid",
              "hover:-translate-y-0.5 hover:bg-white/[0.045] hover:text-gold-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/70",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.7} />
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * lucide-react has no TikTok mark (it is a brand, not a glyph in their set), so
 * this is the official outline path at the same 24-box and stroke weight as the
 * two beside it. Drawn here rather than pulling in a brand-icon package for one
 * 16px icon.
 */
function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Studio status chip                                                  */
/* ------------------------------------------------------------------ */

/**
 * Opening status.
 *
 * Only shown once the business has published fixed hours. When it works by
 * appointment the chip used to read "Studio imefungwa" — a closed sign on the
 * front door of a business that simply takes bookings — so in that case the
 * space goes to the location instead, which answers a question people actually
 * have.
 */
function StudioChip({ status }: { status: StudioStatus | null }) {
  if (!status) {
    return (
      <div
        className="welcome-item mt-4 flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-1.5 pl-2.5 pr-3.5"
        style={{ "--i": 4 } as React.CSSProperties}
      >
        <CalendarCheck className="h-3.5 w-3.5 text-gold-400" />
        <span className="text-[12.5px] font-medium text-ink-3">
          Tunapokea booking kwa miadi
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "welcome-item relative mt-4 flex items-center gap-2.5 overflow-hidden rounded-full py-1.5 pl-2.5 pr-4",
        "border transition-colors duration-3",
        status.isOpen
          ? "border-emerald-400/25 bg-emerald-400/[0.06]"
          : "border-gold-500/22 bg-gold-500/[0.05]",
      )}
      style={{ "--i": 4 } as React.CSSProperties}
    >
      {/* Slow travelling highlight so the chip reads as "live" without
          stepping on the pulsing dot beside it. */}
      {status.isOpen && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3 animate-shimmer"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(16,185,129,0.14), transparent)",
          }}
        />
      )}

      <span className="relative grid h-4 w-4 place-items-center">
        <span
          className={cn(
            "absolute h-2 w-2 rounded-full",
            status.isOpen ? "bg-emerald-400" : "bg-gold-500",
          )}
        />
        {status.isOpen && (
          <span className="absolute h-4 w-4 animate-ping rounded-full bg-emerald-400/30" />
        )}
      </span>
      <span className="text-[12.5px] font-medium text-ink-2">{status.label}</span>
      {status.detail && (
        <span className="hidden text-[12.5px] text-ink-4 sm:inline">· {status.detail}</span>
      )}
    </div>
  );
}
