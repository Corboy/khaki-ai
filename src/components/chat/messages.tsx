"use client";

import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  MessagePrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  RefreshCw,
} from "lucide-react";
import dynamic from "next/dynamic";

import { LiveRoomIndicator } from "@/components/brand/live-room-indicator";
import { ContactOptions } from "@/components/chat/contact-options";
import {
  BookingDraftCard,
  ContactHandoffCard,
  PricingCard,
  ToolFallback,
} from "@/components/chat/tool-cards";
import { IconButton } from "@/components/ui/icon-button";
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

function AssistantText() {
  return <MarkdownText />;
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
/* User message                                                        */
/* ------------------------------------------------------------------ */

export function UserMessage() {
  return (
    <MessagePrimitive.Root
      className="group/msg flex w-full justify-end gap-3 px-1"
      data-role="user"
    >
      <div className="flex max-w-[88%] flex-col items-end gap-1 sm:max-w-[76%]">
        <div
          className={cn(
            "rounded-[20px] rounded-br-[7px] bg-white/[0.08] px-4 py-2.5",
            "text-[15.5px] leading-[1.6] tracking-[-0.008em] text-ink",
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
  const thinking = isRunning && !hasContent;

  return (
    <MessagePrimitive.Root
      className="group/msg flex w-full px-1"
      data-role="assistant"
      data-state={!isRunning ? "idle" : hasContent ? "streaming" : "thinking"}
    >
      <div className="flex min-w-0 w-full flex-col gap-1">
        {thinking ? (
          <div className="py-2">
            <LiveRoomIndicator />
          </div>
        ) : (
          <MessagePrimitive.Parts
            components={{
              Text: AssistantText,
              tools: {
                by_name: {
                  andaa_booking: BookingDraftCard,
                  onyesha_bei: PricingCard,
                  show_contact_options: ContactHandoffCard,
                },
                Fallback: ToolFallback,
              },
            }}
          />
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
            <ContactOptions
              compact
              whatsappMessage="Habari Khaki Media, naomba msaada kuendelea na mazungumzo na Khaki AI."
              whatsappLabel="Wasiliana kwa WhatsApp"
            />
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
