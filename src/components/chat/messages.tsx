"use client";

import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  MessagePrimitive,
  MessagePartPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import dynamic from "next/dynamic";

import { KhakiGlyph } from "@/components/brand/khaki-glyph";
import { LiveRoomIndicator } from "@/components/brand/live-room-indicator";
import { BookingDraftCard, PricingCard, ToolFallback } from "@/components/chat/tool-cards";
import { IconButton } from "@/components/ui/icon-button";
import { KHAKI_CONFIG } from "@/config/khaki";
import { cn } from "@/lib/utils";

/**
 * The markdown parser is ~53 kB of the first load, and the first paint renders
 * no markdown at all — only the welcome screen does. Loading it on demand means
 * a visitor who never sends a message never downloads it, and one who does gets
 * plain text for the first few hundred milliseconds while it arrives, which is
 * exactly what a streaming answer looks like anyway.
 */
const MarkdownText = dynamic(() => import("@/components/chat/markdown-text").then((m) => m.MarkdownText), {
  ssr: false,
  loading: () => (
    <p className="k-prose whitespace-pre-wrap">
      <MessagePartPrimitive.Text />
    </p>
  ),
});

/* ------------------------------------------------------------------ */
/* Streaming caret                                                     */
/* ------------------------------------------------------------------ */

/** The blinking gold caret that trails the text while tokens arrive. */
function StreamingCaret() {
  return (
    <span
      aria-hidden
      className="ml-[3px] inline-block h-[1.05em] w-[2.5px] translate-y-[0.14em] rounded-full metal-fill metal-sweep animate-caret align-baseline"
    />
  );
}

function AssistantText() {
  return (
    <>
      <MarkdownText />
      <MessagePartPrimitive.InProgress>
        <StreamingCaret />
      </MessagePartPrimitive.InProgress>
    </>
  );
}

/**
 * Three tiny bars under the badge while words arrive.
 *
 * The caret shows *where* the text is being written; this shows *that* the
 * assistant is still writing, on the mark the eye already tracks. Deliberately
 * three bars and not five — the five-bar meter belongs to the louder thinking
 * state, and reusing it here would make streaming look like a second wait.
 */
function StreamingPips() {
  return (
    <span aria-hidden className="flex h-2.5 items-end gap-[2px]">
      {[6, 9, 5].map((height, index) => (
        <span
          key={index}
          className="w-[2px] origin-bottom rounded-full metal-fill animate-vu"
          style={{
            height,
            // Slower than the thinking meter, not faster: the quieter phase of
            // the work should not read as the more frantic one.
            animationDelay: `${index * 0.16}s`,
            animationDuration: "1.2s",
          }}
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Guarded state selectors — these run inside useSyncExternalStore,    */
/* so they must never throw while the thread switches.                 */
/* ------------------------------------------------------------------ */

type LooseMessage = {
  status?: { type?: string };
  parts?: ReadonlyArray<{ type?: string; text?: string }>;
  speech?: { status?: string };
};

function messageOf(state: unknown): LooseMessage | undefined {
  return (state as { message?: LooseMessage }).message;
}

function useIsMessageRunning(): boolean {
  return useAuiState((state) => messageOf(state)?.status?.type === "running");
}

function useHasVisibleContent(): boolean {
  return useAuiState((state) => {
    const parts = messageOf(state)?.parts;
    if (!Array.isArray(parts)) return false;
    return parts.some(
      (part) =>
        (part?.type === "text" && (part.text?.length ?? 0) > 0) || part?.type === "tool-call",
    );
  });
}

/* ------------------------------------------------------------------ */
/* Speaker badge                                                       */
/* ------------------------------------------------------------------ */

/**
 * How alive the assistant's face is.
 *
 *  · `idle`      — the answer is finished; a quiet brass ring.
 *  · `thinking`  — nothing has arrived yet: full halo, brass specular sweep,
 *                  breathing mark. The loudest state, because there is nothing
 *                  else on screen to look at.
 *  · `streaming` — words are arriving. The badge **stays lit** but softer and
 *                  slower: the sweep continues so the run reads as one
 *                  continuous piece of work instead of switching off the moment
 *                  the first token lands.
 */
export type BadgeState = "idle" | "thinking" | "streaming";

function SpeakerBadge({ size, state }: { size: number; state: BadgeState }) {
  const lit = state !== "idle";
  const thinking = state === "thinking";

  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      data-badge={state}
    >
      {lit && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[-42%] rounded-full animate-halo"
            style={{
              background: `radial-gradient(circle, rgba(var(--gold-rgb) / ${
                thinking ? 0.42 : 0.24
              }) 0%, rgba(var(--gold-rgb) / 0.1) 46%, transparent 72%)`,
              animationDuration: thinking ? "3.6s" : "2.4s",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[-8%] animate-spin"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, rgba(var(--gold-rgb) / 0) 200deg, rgba(var(--gold-rgb) / ${
                thinking ? 0.9 : 0.55
              }) 328deg, transparent 360deg)`,
              mask: "radial-gradient(farthest-side, transparent calc(100% - 2.2px), #000 calc(100% - 1.4px))",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 2.2px), #000 calc(100% - 1.4px))",
              animationDuration: thinking ? "3.6s" : "2.2s",
            }}
          />
        </>
      )}
      <span
        className={cn(
          "grid h-full w-full place-items-center rounded-full bg-black transition-shadow duration-3",
          lit ? "ring-1 ring-gold-500/45" : "ring-1 ring-gold-500/25",
        )}
        style={lit ? { boxShadow: "0 0 14px -4px rgba(var(--gold-rgb) / 0.5)" } : undefined}
      >
        <KhakiGlyph
          size={Math.round(size * 0.6)}
          simplified
          className={lit ? "animate-breathe" : undefined}
        />
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* User message                                                        */
/* ------------------------------------------------------------------ */

export function UserMessage() {
  return (
    <MessagePrimitive.Root
      className="anim-rise group/msg flex w-full justify-end gap-3 px-1"
      data-role="user"
    >
      <div className="flex max-w-[88%] flex-col items-end gap-1 sm:max-w-[76%]">
        <div
          className={cn(
            "rounded-[20px] rounded-br-[7px] px-4 py-2.5",
            "border border-white/[0.075] bg-[rgb(var(--k-elev-4))]",
            "text-[15.5px] leading-[1.6] tracking-[-0.008em] text-ink",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
          )}
        >
          <MessagePrimitive.Parts
            components={{
              Text: ({ text }) => <p className="whitespace-pre-wrap break-words">{text}</p>,
            }}
          />
        </div>

        <div className="flex h-6 items-center gap-1 pr-1 opacity-0 transition-opacity duration-2 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100">
          <ActionBarPrimitive.Root className="flex items-center gap-0.5">
            <ActionBarPrimitive.Copy asChild>
              <IconButton label="Nakili ujumbe" size="sm">
                <Copy className="h-3.5 w-3.5" />
              </IconButton>
            </ActionBarPrimitive.Copy>
          </ActionBarPrimitive.Root>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Assistant message                                                   */
/* ------------------------------------------------------------------ */

export function AssistantMessage() {
  const isRunning = useIsMessageRunning();
  const hasContent = useHasVisibleContent();
  /**
   * The badge is lit for the whole run — `thinking` before the first token,
   * `streaming` while words arrive — so the assistant reads as continuously at
   * work rather than switching off the instant text appears.
   */
  const badge: BadgeState = !isRunning ? "idle" : hasContent ? "streaming" : "thinking";

  return (
    <MessagePrimitive.Root
      className="anim-rise group/msg flex w-full gap-3 px-1"
      data-role="assistant"
      data-state={badge}
    >
      {/* Studio badge — the assistant's face, and the thinking indicator */}
      <div className="mt-0.5 hidden shrink-0 flex-col items-center gap-1.5 sm:flex">
        <SpeakerBadge size={28} state={badge} />
        {badge === "streaming" && <StreamingPips />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {badge === "thinking" ? (
          /*
            One row, one live region.

            On a phone the badge rides inline with the caption and the meter is
            hidden by CSS; on desktop the badge is already in the left gutter, so
            the meter carries the motion instead. Rendering a single instance —
            rather than one per breakpoint — is what keeps the announcement from
            firing twice.
          */
          <div className="flex items-center gap-2.5 py-2">
            <span className="sm:hidden">
              <SpeakerBadge size={22} state="thinking" />
            </span>
            <LiveRoomIndicator />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 sm:hidden">
              <SpeakerBadge size={24} state={badge} />
              <span className="plate-type text-ink-4">Khaki AI</span>
              {badge === "streaming" && <StreamingPips />}
            </div>

            <MessagePrimitive.Parts
              components={{
                Text: AssistantText,
                tools: {
                  by_name: {
                    andaa_booking: BookingDraftCard,
                    onyesha_bei: PricingCard,
                  },
                  Fallback: ToolFallback,
                },
              }}
            />
          </>
        )}

        {/*
          A failed turn is the worst moment to leave someone with only a retry
          button. The assistant may have gone quiet, but the business has not —
          so the same block offers the phone number. Reachable without leaving
          the page, at the exact point of frustration.
        */}
        <MessagePrimitive.Error>
          <div className="mt-1 flex flex-col gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3.5 py-3">
            <p className="flex items-center gap-2 text-[13px] text-red-200/90">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
              Samahani — jibu halikufika vizuri. Jaribu tena.
            </p>
            <a
              href={`https://wa.me/${KHAKI_CONFIG.contact.whatsappNumber.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3.5 text-[12.5px] font-medium text-ink transition duration-2 ease-fluid hover:border-emerald-400/35 hover:bg-emerald-400/[0.09] hover:text-emerald-200"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Au wasiliana nasi WhatsApp
            </a>
          </div>
        </MessagePrimitive.Error>

        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantActionBar() {
  const isLast = useAuiState(
    (state) => (state as { message?: { isLast?: boolean } }).message?.isLast ?? false,
  );

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className={cn(
        "mt-0.5 flex items-center gap-0.5 transition-opacity duration-2",
        // The newest reply keeps its controls on screen; older ones appear on
        // hover or keyboard focus. Touch devices have no hover, so there the
        // controls are always present.
        isLast
          ? "opacity-100"
          : "opacity-0 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 max-sm:opacity-100",
      )}
    >
      <ActionBarPrimitive.Copy asChild>
        <IconButton label="Nakili jibu" size="sm">
          <Copy className="h-3.5 w-3.5" />
        </IconButton>
      </ActionBarPrimitive.Copy>

      <ActionBarPrimitive.Reload asChild>
        <IconButton label="Jibu upya" size="sm">
          <RefreshCw className="h-3.5 w-3.5" />
        </IconButton>
      </ActionBarPrimitive.Reload>

      {/*
       * The thumbs up and thumbs down buttons were removed.
       *
       * They toggled — `aria-pressed` went from false to true, so they looked
       * like they worked — but there is no feedback adapter anywhere in the
       * app. The rating lived in memory, reached nobody, and was gone on
       * reload. A customer tapping "this answer was wrong" would be telling the
       * studio something, and the studio would never hear it.
       *
       * They can come back the day there is somewhere for the rating to go — a
       * WhatsApp hand-off, or a row in a table the owner can read. Until then
       * the honest thing is not to offer the control.
       */}

      <BranchPicker />
    </ActionBarPrimitive.Root>
  );
}

/** Branch navigation for regenerated answers. */
function BranchPicker() {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className="ml-0.5 flex items-center gap-0.5 text-ink-3"
    >
      <BranchPickerPrimitive.Previous asChild>
        <IconButton label="Toleo lililopita" size="sm">
          <ChevronLeft className="h-3.5 w-3.5" />
        </IconButton>
      </BranchPickerPrimitive.Previous>
      <span className="tnum min-w-[34px] text-center text-[12px]">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <IconButton label="Toleo linalofuata" size="sm">
          <ChevronRight className="h-3.5 w-3.5" />
        </IconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
}
