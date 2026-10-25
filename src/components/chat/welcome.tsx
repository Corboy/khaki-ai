"use client";

import { ThreadPrimitive } from "@assistant-ui/react";
import {
  CalendarCheck,
  Heart,
  Mic,
  Radio,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { KhakiMark } from "@/components/brand/khaki-mark";
import { KHAKI_CONFIG } from "@/config/khaki";
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

/**
 * ThreadWelcome — the compact entry point for an empty conversation.
 *
 * The composer remains in the thread footer, so this surface only establishes
 * context and offers a few safe-to-edit starting points. Secondary contact
 * details belong in the drawer or in assistant answers, not above the first
 * question.
 */
export function ThreadWelcome() {
  const [status, setStatus] = useState<StudioStatus | null>(null);

  // Resolve the live status on the client so server and client markup agree.
  useEffect(() => {
    if (isAppointmentOnly()) return;
    setStatus(getStudioStatus());
    const id = window.setInterval(() => setStatus(getStudioStatus()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[46rem] flex-col items-center px-4 pb-4 pt-4 text-center sm:pb-6 sm:pt-6">
      <KhakiMark size={52} priority alt="Khaki Media" />

      <h1 className="mt-4 text-balance text-[clamp(1.45rem,5vw,2rem)] font-semibold leading-tight tracking-[-0.035em] text-white">
        Karibu Khaki Media
      </h1>

      <p className="mt-2 max-w-[34rem] text-pretty text-[15px] leading-relaxed text-ink-2 sm:text-base">
        Uliza kuhusu huduma, bei au booking — nitakuelekeza hatua inayofuata.
      </p>

      <StudioChip status={status} />

      <div className="mt-5 flex w-full flex-wrap justify-center gap-2 sm:mt-6">
        {KHAKI_CONFIG.quickActions.slice(0, 3).map((action) => {
          const Icon = ACTION_ICONS[action.icon] ?? Sparkles;
          return <PromptStarter key={action.id} action={action} Icon={Icon} />;
        })}
      </div>
    </div>
  );
}

/**
 * A compact starter replaces the composer text instead of sending immediately.
 * This keeps a touch mis-tap from starting a request before the visitor can edit.
 */
function PromptStarter({
  action,
  Icon,
}: {
  action: (typeof KHAKI_CONFIG.quickActions)[number];
  Icon: LucideIcon;
}) {
  return (
    <ThreadPrimitive.Suggestion
      prompt={action.prompt}
      send={false}
      clearComposer
      aria-label={`Andika kuhusu ${action.label.toLowerCase()}`}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border border-white/[0.1] px-3.5 py-2 text-left",
        "bg-white/[0.035] text-ink-2 transition-colors duration-1 ease-fluid",
        "hover:bg-white/[0.075] hover:text-ink",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/70",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-gold-400" strokeWidth={1.8} aria-hidden />
      <span className="text-[13px] font-medium leading-none">{action.label}</span>
    </ThreadPrimitive.Suggestion>
  );
}

/** Keeps availability useful without competing with the first question. */
function StudioChip({ status }: { status: StudioStatus | null }) {
  if (!status) return null;

  return (
    <div
      className={cn(
        "mt-3 flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[12px] font-medium",
        status.isOpen ? "text-emerald-300/85" : "text-gold-300/85",
      )}
    >
      <span
        aria-hidden
        className={cn("h-1.5 w-1.5 rounded-full", status.isOpen ? "bg-emerald-400" : "bg-gold-400")}
      />
      <span>{status.label}</span>
      <span className="text-ink-4">·</span>
      <span className="text-ink-4">{status.detail}</span>
    </div>
  );
}
