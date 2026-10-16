"use client";

import { cn } from "@/lib/utils";

/**
 * LiveRoomIndicator — the "thinking" state, shown only before the first token.
 *
 * Once words start arriving the speaker badge stays lit instead (see
 * `messages.tsx`), so this component has one job: say that work has started and
 * nothing has come back yet.
 *
 * ---------------------------------------------------------------------------
 * Why this is a wide console bar and not a small inline row
 * ---------------------------------------------------------------------------
 * The previous version was a 9-bar waveform beside a caption, and measured
 * **66x21px** in a 1440px viewport. The most important transitional moment in
 * the product — the wait after someone presses send — was smaller than a
 * favicon. Three things were wrong with it:
 *
 * 1. **Scale.** At 21px tall it read as a footnote, not as a state. A loading
 *    indicator has to hold the space it is occupying or the layout looks like
 *    it has stalled, and the user has nothing to look at while they wait.
 *
 * 2. **Identity.** An equaliser of small bars is what every chat product has.
 *    This brand is a photo and video studio — the mark is a condenser mic in a
 *    headphone yoke — so the honest thing to draw is a piece of studio
 *    equipment, not a generic spinner.
 *
 * 3. **Density.** An even earlier version was a bordered pill carrying six
 *    decorative layers inside 168x46px. Six effects in 7,700 square pixels is
 *    not richness, it is noise: every layer too small to read, all of them
 *    overlapping. The rule it broke: decoration multiplies, attention divides.
 *
 * So this is a **studio level meter**: one wide instrument, drawn large, with
 * one line of honest text beneath it. Three visual elements — the gold edge,
 * the meter, the caption — across roughly 520x84px. That is around 8x less
 * element-per-pixel than the pill it replaces, which is what lets it be this
 * loud without becoming clutter.
 *
 * ---------------------------------------------------------------------------
 * Why the meter is horizontal and fills the width
 * ---------------------------------------------------------------------------
 * A level meter reads left to right, the way a signal actually moves, and
 * spanning the full column means the indicator occupies the same width as the
 * reply that is about to appear in its place. The layout does not need to
 * reflow when the text lands — the panel is simply replaced by prose.
 *
 * On a phone the same meter compresses into ~250px and the bars thin out on
 * their own, because they are laid out with `justify-between` rather than at a
 * fixed pitch. One implementation for both, no breakpoint fork.
 *
 * ---------------------------------------------------------------------------
 * What is deliberately NOT here
 * ---------------------------------------------------------------------------
 * No progress. The shape is two overlapping swells with a dip between them —
 * deliberately asymmetric, because a symmetric envelope reads as a progress bar
 * and this is not measuring progress. The model may take 300ms or 30s and the
 * client cannot see which.
 *
 * No invented stages. An earlier version rotated three captions on a 2.1s timer
 * ("reading your request" -> "checking prices"). The client cannot observe those
 * stages — they were decoration pretending to be status, and inside a live
 * region they re-announced themselves to a screen reader forever.
 *
 * No timer. A counting clock implies a known endpoint. There isn't one.
 *
 * The meter is `aria-hidden`, which is what makes it free to be this loud. The
 * caption is the only part a screen reader hears, and it is one honest sentence
 * announced once.
 */

export interface LiveRoomIndicatorProps {
  /** Overrides the default caption */
  label?: string;
  /** Streaming mode: the meter runs faster and tighter */
  streaming?: boolean;
  /** Drops the frame, for use where the indicator sits inside its own surface */
  bare?: boolean;
  className?: string;
}

const DEFAULT_LABEL = "Inafikiria";

/**
 * The bars, generated from a formula rather than typed out.
 *
 * Two reasons. Forty hand-written heights are forty chances to introduce a typo
 * that reads as a design decision; and a formula can express the *envelope*
 * explicitly, which is the part that actually matters. The envelope here is two
 * overlapping swells at different frequencies, so the crest travels across the
 * meter instead of rising and falling in place — at this width, a single global
 * pulse would look like the whole row breathing, which reads as a heartbeat
 * monitor rather than as a signal.
 *
 * The jitter term is a deterministic hash of the index (a sine multiplied out
 * and taken modulo 1), not `Math.random()`. Deterministic matters: this is
 * computed at module scope, so a random term would produce different heights on
 * the server and the client and React would flag a hydration mismatch.
 */
const BAR_COUNT = 40;

const BAR_HEIGHTS: number[] = Array.from({ length: BAR_COUNT }, (_, index) => {
  const t = index / (BAR_COUNT - 1);
  // Two swells of unequal width, so the crest is off-centre.
  const envelope = 0.42 + 0.58 * Math.abs(Math.sin(Math.PI * (t * 1.7 + 0.15)));
  const jitter = Math.abs(Math.sin(index * 12.9898) * 43758.5453) % 1;
  const amplitude = envelope * (0.6 + jitter * 0.4);
  // 6px floor: a bar that animates to near-zero disappears, and a gap in the
  // middle of a meter reads as a rendering fault rather than as a quiet passage.
  return Math.round(6 + amplitude * 30);
});

export function LiveRoomIndicator({
  label,
  streaming = false,
  bare = false,
  className,
}: LiveRoomIndicatorProps) {
  const caption = label ?? DEFAULT_LABEL;

  // Streaming is the busier phase, but not by much — if the quieter wait
  // animated faster than the loud one the two would read as swapped.
  const duration = streaming ? 0.82 : 1.35;

  return (
    <div
      className={cn(
        "relative flex w-full max-w-[560px] flex-col gap-3.5 overflow-hidden rounded-2xl px-5 pb-3.5 pt-4",
        !bare && "surface-card",
        className,
      )}
    >
      {!bare && (
        /* The same gold hairline the cards and the composer carry, so the
           indicator belongs to one family with the rest of the surfaces. */
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(var(--gold-rgb) / 0.40), transparent)",
          }}
        />
      )}

      {/*
        The meter. `scaleY` rather than `height`: height forces a layout pass on
        every frame, and this runs for as long as the model takes to answer.
        `origin-bottom` is what makes a bar grow upward from the baseline — the
        default centre origin scales toward both edges and the bars would appear
        to float apart rather than rise.
      */}
      <span
        aria-hidden
        className="flex h-9 w-full items-end justify-between gap-[2px]"
      >
        {BAR_HEIGHTS.map((height, index) => (
          <span
            key={index}
            className="w-[3px] origin-bottom rounded-full metal-fill animate-wave"
            style={{
              height,
              animationDelay: `${index * 0.045}s`,
              animationDuration: `${duration}s`,
              // Ease the outer bars back so the eye lands on the body of the
              // meter rather than on its two hard edges.
              opacity: index < 2 || index > BAR_COUNT - 3 ? 0.45 : 1,
            }}
          />
        ))}
      </span>

      {/* The status line: the only part a screen reader hears. */}
      <span role="status" aria-live="polite" className="relative isolate overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 -z-10 w-1/3 animate-shimmer"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(var(--gold-rgb) / 0.22), transparent)",
          }}
        />
        <span className="block text-[14.5px] font-medium tracking-[-0.011em] text-ink-2">
          {caption}
          <span className="text-ink-4">…</span>
        </span>
      </span>
    </div>
  );
}
