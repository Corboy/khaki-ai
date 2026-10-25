"use client";

import { AuiIf, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Composer } from "@/components/chat/composer";
import { AssistantMessage, UserMessage } from "@/components/chat/messages";
import { ThreadWelcome } from "@/components/chat/welcome";
import { cn } from "@/lib/utils";

const MESSAGE_COMPONENTS = {
  Message: AssistantMessage,
  UserMessage,
  AssistantMessage,
};

/**
 * ChatThread — viewport, transcript and docked composer.
 *
 * `turnAnchor="top"` keeps the question pinned while the answer streams, which
 * is what makes a long reply readable on a phone instead of chasing the bottom
 * of the page.
 */
export function ChatThread() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const overflowing = useOverflow(viewportRef);
  const atBottom = useAtBottom(viewportRef);
  const unread = useUnreadWhileAway(atBottom);

  return (
    <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
      <ThreadPrimitive.Viewport
        ref={viewportRef}
        turnAnchor="top"
        className="chat-transcript-viewport relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-none"
      >
        <AuiIf condition={(state) => state.thread.isEmpty}>
          {/* `my-auto` centres the welcome when it fits and top-aligns it when
              it does not. `justify-center` would clip the top of the badge on a
              short phone viewport instead. */}
          <div className="flex min-h-full flex-1 flex-col">
            <div className="my-auto w-full">
              <ThreadWelcome />
            </div>
          </div>
        </AuiIf>

        <div className="mx-auto w-full max-w-[48rem] flex-1 px-4 pb-8 pt-4 sm:px-6 sm:pt-8">
          <ThreadPrimitive.Messages components={MESSAGE_COMPONENTS} />
        </div>

        <ThreadPrimitive.ViewportFooter
          className={cn(
            "sticky bottom-0 z-20 mt-auto w-full",
            "border-t border-white/[0.07] bg-black",
            "pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-3",
          )}
        >
          {overflowing && (
            <AuiIf condition={(state) => !state.thread.isEmpty}>
              <ScrollToBottom unread={unread} />
            </AuiIf>
          )}
          <div className="mx-auto w-full max-w-[48rem] px-4 sm:px-6">
            <Composer />
            <ComposerHint />
          </div>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

/**
 * Tracks whether the transcript is actually taller than the viewport.
 *
 * The scroll-to-bottom control decides visibility from the viewport's "am I at
 * the bottom?" flag, which reads false the moment a turn is top-anchored even
 * when nothing is hidden. Requiring real overflow keeps it from floating over
 * a thread that already fits.
 */
function useOverflow(ref: React.RefObject<HTMLElement | null>): boolean {
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      setOverflowing(element.scrollHeight - element.clientHeight > 24);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(element);
    for (const child of Array.from(element.children)) resizeObserver.observe(child);

    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(element, { childList: true, subtree: true, characterData: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [ref]);

  return overflowing;
}

/**
 * Whether the reader is at the foot of the transcript.
 *
 * Measured here rather than read from the runtime: `isAtBottom` lives on the
 * thread viewport store, which the package does not export — the primitive that
 * uses it (`ThreadPrimitive.ScrollToBottom`) hides itself with it and exposes
 * nothing. Re-deriving it from scroll position costs one passive listener and
 * is honest about what it is: our own reading of the scroll box.
 *
 * The slack is 32px, not 0. A trackpad or a momentum scroll rarely lands on the
 * exact last pixel, and a control that stays visible when you are at the bottom
 * is worse than one that appears a line early.
 */
function useAtBottom(ref: React.RefObject<HTMLElement | null>): boolean {
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      setAtBottom(element.scrollHeight - element.scrollTop - element.clientHeight <= 32);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    element.addEventListener("scroll", schedule, { passive: true });
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(element);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      element.removeEventListener("scroll", schedule);
      resizeObserver.disconnect();
    };
  }, [ref]);

  return atBottom;
}

/**
 * How many messages have arrived since the reader last looked at the bottom.
 *
 * The count is what turns "something is down there" into "there is one more
 * thing to read", which is the difference between a button someone presses and
 * a button someone ignores. ChatGPT's control carries the same number for the
 * same reason.
 *
 * `seen` holds the message count at the moment of last being at the bottom, and
 * only moves while at the bottom. Counting from *the count* rather than from a
 * timestamp matters: a streaming answer does not add messages, so the badge
 * stays at 1 for the whole reply rather than ticking with every token.
 */
function useUnreadWhileAway(atBottom: boolean): number {
  /*
   * Read loosely, like the guards in `messages.tsx`.
   *
   * This selector runs inside `useSyncExternalStore`, so it must never throw —
   * including during the render where the thread is being swapped for another
   * one and `messages` is momentarily absent. The package's own type is exact;
   * narrowing through `unknown` is what keeps the guard honest instead of
   * asserting a shape the state may not have yet.
   */
  const messageCount = useAuiState(
    (state) =>
      (state as unknown as { thread?: { messages?: readonly unknown[] } }).thread?.messages
        ?.length ?? 0,
  );
  const seen = useRef(messageCount);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (atBottom) {
      seen.current = messageCount;
      if (unread !== 0) setUnread(0);
      return;
    }
    const next = Math.max(0, messageCount - seen.current);
    if (next !== unread) setUnread(next);
  }, [atBottom, messageCount, unread]);

  return atBottom ? 0 : unread;
}

/** Floating "jump to latest" control; the primitive hides it at the bottom. */
function ScrollToBottom({ unread }: { unread: number }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  return (
    <ThreadPrimitive.ScrollToBottom
      behavior={reducedMotion ? "instant" : "smooth"}
      aria-label={
        unread > 0
          ? `Nenda kwenye ujumbe wa mwisho — ujumbe ${unread} mpya`
          : "Nenda kwenye ujumbe wa mwisho"
      }
      className={cn(
        // Anchored right rather than centred: the transcript column is centred,
        // so a centred button would sit on top of the last line of the answer.
        "absolute -top-16 right-4 flex min-h-11 min-w-11 items-center gap-1.5 rounded-full px-2.5 sm:right-8",
        unread > 0 ? "" : "w-11 justify-center",
        // Solid, not translucent: this floats over the last line of a streaming
        // answer, and a see-through button reads as a smudge on the text.
        "border border-white/[0.14] bg-[rgb(var(--k-elev-4))] text-ink-2",
        "shadow-[0_8px_24px_-8px_rgba(0,0,0,0.9)]",
        "transition duration-2 ease-fluid hover:border-gold-500/40 hover:text-gold-300",
        "active:opacity-80",
      )}
    >
      <ArrowDown className="h-4 w-4 shrink-0" />

      {/*
        A number, not a dot. The dot says "there is something"; the number says
        "there is one more thing", and only the second is worth a press.
        `tnum` keeps the pill from twitching as the count goes 9 → 10.
      */}
      {unread > 0 && (
        <span className="tnum pr-0.5 text-[12px] font-semibold text-gold-300 tabular-nums">
          {unread}
        </span>
      )}
    </ThreadPrimitive.ScrollToBottom>
  );
}

/** Keyboard hint (desktop only) and the offline notice when relevant. */
function ComposerHint() {
  const isRunning = useAuiState((state) => state.thread.isRunning);

  return (
    <p
      className={cn(
        "mt-2 hidden text-center text-[11.5px] text-ink-4 transition-opacity duration-1 sm:block",
        isRunning ? "opacity-0" : "opacity-100",
      )}
    >
      Bonyeza <kbd className="font-sans font-medium text-ink-3">Enter</kbd> kutuma ·{" "}
      <kbd className="font-sans font-medium text-ink-3">Shift + Enter</kbd> kwa mstari mpya
    </p>
  );
}
