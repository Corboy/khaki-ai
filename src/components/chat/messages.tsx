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
import { stripMarkdown } from "@/lib/strip-markdown";
import { cn } from "@/lib/utils";

/**
 * The markdown parser is ~53 kB of the first load, and the first paint renders
 * no markdown at all — only the welcome screen does. Loading it on demand means
 * a visitor who never sends a message never downloads it, and one who does gets
 * plain text for the first few hundred milliseconds while it arrives, which is
 * exactly what a streaming answer looks like anyway.
 */
/**
 * The text as prose, while the markdown renderer is still arriving.
 *
 * The assistant's markdown is a separate chunk (`next/dynamic`), which keeps
 * the parser out of the first bundle. Until it lands, the fallback used to
 * render the message verbatim -- so a returning customer saw their own saved
 * conversation with its asterisks showing and a percent-encoded WhatsApp URL in
 * full. A screenshot caught it; measured on Slow 3G it is on screen for about
 * 200ms.
 *
 * Showing nothing would be worse: the transcript is the customer's own words,
 * and a blank panel where their history was is the "black rectangle" problem
 * again. So the text still appears immediately -- with its syntax taken out, so
 * it reads as prose and then settles into formatting rather than flicking
 * through asterisks first.
 */
function PendingMarkdown() {
  const text = useAuiState(
    (state) => (state as { part?: { text?: string } }).part?.text ?? "",
  );
  return <p className="k-prose whitespace-pre-wrap">{stripMarkdown(text)}</p>;
}

const MarkdownText = dynamic(() => import("@/components/chat/markdown-text").then((m) => m.MarkdownText), {
  ssr: false,
  loading: () => <PendingMarkdown />,
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
 * How the assistant badge reflects the request.
 *
 * `thinking` and `streaming` share the same quiet brass outline; the text status
 * is shown only before the first token, then the streaming caret carries progress.
 */
export type BadgeState = "idle" | "thinking" | "streaming";

function SpeakerBadge({ size, state }: { size: number; state: BadgeState }) {
  const active = state !== "idle";

  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      data-badge={state}
    >
      <span
        className={cn(
          "grid h-full w-full place-items-center rounded-full bg-black ring-1 transition-colors duration-2",
          active ? "ring-gold-500/45" : "ring-gold-500/25",
        )}
      >
        <KhakiGlyph size={Math.round(size * 0.6)} simplified />
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
            "relative isolate overflow-hidden rounded-[20px] rounded-br-[7px] px-4 py-2.5",
            "border border-gold-500/[0.14]",
            "bg-[linear-gradient(180deg,rgba(var(--gold-rgb)/0.10)_0%,rgba(var(--gold-rgb)/0.045)_100%)]",
            "text-[15.5px] leading-[1.6] tracking-[-0.008em] text-ink",
            "shadow-[inset_0_1px_0_rgba(255,244,207,0.10),0_10px_28px_-18px_rgba(0,0,0,0.95)]",
          )}
        >
          {/* A faint brass hairline along the top, brightest at the sender's
              edge. It is what distinguishes "your words" from the assistant's
              prose at a glance, in a thread that is otherwise one column of
              text on one dark surface. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-3 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(var(--gold-rgb) / 0.35), transparent)",
            }}
          />
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
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {badge === "thinking" ? (
          /* One compact status row and one live region until the first token arrives. */
          <div className="py-2">
            <LiveRoomIndicator />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 sm:hidden">
              <SpeakerBadge size={24} state={badge} />
              <span className="plate-type text-ink-4">Khaki AI</span>
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
              className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3.5 text-[12.5px] font-medium text-ink transition duration-2 ease-fluid hover:border-emerald-400/35 hover:bg-emerald-400/[0.09] hover:text-emerald-200"
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
