"use client";

import { ThreadPrimitive } from "@assistant-ui/react";
import {
  CalendarCheck,
  Camera,
  Heart,
  Mic,
  Plane,
  Receipt,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { KhakiMark } from "@/components/brand/khaki-mark";
import { KHAKI_CONFIG } from "@/config/khaki";
import { KHAKI_SERVICES } from "@/data/khakiKnowledge";
import { getStudioStatus, isAppointmentOnly, type StudioStatus } from "@/lib/studio-hours";
import { cn } from "@/lib/utils";

/** Resolves the icon name stored in the quick-action config. */
const ACTION_ICONS: Record<string, LucideIcon> = {
  Receipt,
  Heart,
  Video,
  Mic,
  Plane,
  Camera,
  CalendarCheck,
  Sparkles,
};

const STARTING_PRICE = KHAKI_SERVICES[0]?.pricing.startingAt ?? "";

/**
 * ThreadWelcome — the first thing anyone sees.
 *
 * It has one job: say what this business sells, and offer a way in. The
 * entrance is a CSS stagger driven by `--i`; `globals.css` explains why it is
 * not a GSAP timeline.
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
    <div className="mx-auto flex w-full max-w-[44rem] flex-col items-center px-4 pb-6 pt-3 text-center">
      <div className="welcome-badge">
        <KhakiMark size={56} sweep halo priority className="sm:hidden" />
        <KhakiMark size={72} sweep halo className="hidden sm:block" />
      </div>

      <p className="welcome-item plate-type mt-4 text-gold-300 sm:mt-5" style={{ "--i": 1 } as React.CSSProperties}>
        {KHAKI_CONFIG.wordmark}
      </p>

      <h1
        className="welcome-item mt-2.5 text-balance text-[26px] font-semibold leading-[1.14] tracking-[-0.03em] text-white sm:text-[38px]"
        style={{ "--i": 2 } as React.CSSProperties}
      >
        Picha na video za sendoff na harusi.
      </h1>

      <p
        className="welcome-item mt-3 max-w-[32rem] text-pretty text-[15px] leading-[1.6] text-ink-2 sm:text-[16.5px]"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        Tuambie unahitaji nini — sendoff, harusi, kupiga video au kazi za audio — nitakuonyesha
        bei na hatua zinazofuata.
        {STARTING_PRICE && (
          <>
            {" "}
            Zinaanzia <span className="tnum font-medium text-gold-300">{STARTING_PRICE}</span>.
          </>
        )}
      </p>

      <StudioChip status={status} />

      {/* Ways in — two columns from 380px so all six fit above the fold. */}
      <div className="mt-5 grid w-full grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:mt-7 sm:gap-2.5 lg:grid-cols-3">
        {KHAKI_CONFIG.quickActions.map((action, index) => {
          const Icon = ACTION_ICONS[action.icon] ?? Sparkles;
          return (
            <ThreadPrimitive.Suggestion
              key={action.id}
              prompt={action.prompt}
              send
              clearComposer
              className={cn(
                "welcome-item group/action flex min-h-[54px] items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left",
                "surface-card transition-[transform,border-color,background-color,box-shadow] duration-2 ease-fluid",
                "hover:-translate-y-0.5 hover:border-gold-500/35 hover:shadow-gold",
                "active:translate-y-0 active:scale-[0.985]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/70",
              )}
              style={{ "--i": 5 + index } as React.CSSProperties}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gold-500/10 text-gold-400 ring-1 ring-gold-500/25 transition-colors duration-2 group-hover/action:bg-gold-500/[0.16] group-hover/action:text-gold-300">
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="text-[14px] font-medium leading-snug tracking-[-0.012em] text-ink">
                {action.label}
              </span>
            </ThreadPrimitive.Suggestion>
          );
        })}
      </div>

      <p
        className="welcome-item mt-5 text-[12.5px] leading-relaxed text-ink-4"
        style={{ "--i": 12 } as React.CSSProperties}
      >
        {KHAKI_CONFIG.location.address}, {KHAKI_CONFIG.location.city}
        <span aria-hidden className="mx-2 inline-block h-3 w-px bg-white/15 align-middle" />
        <span className="tnum">{KHAKI_CONFIG.contact.displayPhone}</span>
      </p>
    </div>
  );
}

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
      className="welcome-item mt-4 flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] py-1.5 pl-2.5 pr-4"
      style={{ "--i": 4 } as React.CSSProperties}
    >
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
