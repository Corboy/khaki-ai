"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * LiveRoomIndicator — the "thinking" state, shown only before the first token.
 *
 * Once words start arriving the speaker badge stays lit instead (see
 * `messages.tsx`), so this component has one job and one honest caption: the
 * assistant is working and nothing has come back yet.
 *
 * An earlier version rotated three invented stage captions on a 2.1s timer. The
 * client cannot actually observe "reading your request" versus "checking
 * prices", so it was decoration pretending to be status — and inside a live
 * region it re-announced itself to screen readers every 2.1 seconds, forever.
 */

export interface LiveRoomIndicatorProps {
  /** Overrides the default caption */
  label?: string;
  /** Streaming mode: the meter runs faster */
  streaming?: boolean;
  compact?: boolean;
  className?: string;
}

const DEFAULT_LABEL = "Inafikiria";

export function LiveRoomIndicator({
  label,
  streaming = false,
  compact = false,
  className,
}: LiveRoomIndicatorProps) {
  const caption = label ?? DEFAULT_LABEL;
  const bars = compact ? 4 : 5;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/*
        Console level meter — desktop only.

        Below `sm` the speaker badge sits on this same line, so a five-bar meter
        would put two same-sized gold graphics side by side; the badge is the
        indicator there. Hiding it with CSS rather than rendering two variants
        matters for more than tidiness: two instances would mean two live
        regions, and a screen reader would announce the wait twice.
      */}
      <span aria-hidden className="hidden h-5 items-end gap-[3px] sm:flex">
        {Array.from({ length: bars }).map((_, i) => (
          <span
            key={i}
            className="w-[3px] origin-bottom rounded-full metal-fill animate-vu"
            style={{
              height: `${[11, 18, 20, 15, 9][i % 5]}px`,
              animationDelay: `${i * 0.14}s`,
              animationDuration: streaming ? "0.72s" : "1.4s",
            }}
          />
        ))}
      </span>

      {/*
        Announced once, politely.

        An earlier version rotated three invented stage captions on a 2.1s timer
        inside a live region, so a screen reader re-announced itself forever —
        and the stages were decoration, not real pipeline state. Making the
        caption fixed is what allows it to be announced at all: one honest
        message, once, when the wait starts.
      */}
      <span role="status" aria-live="polite" className="relative isolate overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 -z-10 w-1/3 animate-shimmer"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(var(--gold-rgb) / 0.22), transparent)",
          }}
        />
        <span className="block text-[13.5px] font-medium tracking-[-0.01em] text-ink-2">
          {caption}
          <span className="text-ink-3">…</span>
        </span>
      </span>
    </div>
  );
}
