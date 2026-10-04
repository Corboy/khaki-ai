"use client";

import { AuiIf, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AmbientBackdrop } from "@/components/brand/ambient-backdrop";
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

  return (
    <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
      <ThreadPrimitive.Viewport
        ref={viewportRef}
        turnAnchor="top"
        className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-none"
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

        <div className="mx-auto w-full max-w-[46rem] flex-1 px-3 pb-8 pt-4 sm:px-6 sm:pt-8">
          <ThreadPrimitive.Messages components={MESSAGE_COMPONENTS} />
        </div>

        <ThreadPrimitive.ViewportFooter
          className={cn(
            "sticky bottom-0 z-20 mt-auto w-full",
            "bg-gradient-to-t from-black via-black/92 to-transparent",
            "pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-3",
          )}
        >
          {overflowing && (
            <AuiIf condition={(state) => !state.thread.isEmpty}>
              <ScrollToBottom />
            </AuiIf>
          )}
          <div className="mx-auto w-full max-w-[46rem] px-3 sm:px-6">
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

/** Floating "jump to latest" control; the primitive hides it at the bottom. */
function ScrollToBottom() {
  return (
    <ThreadPrimitive.ScrollToBottom
      behavior="smooth"
      aria-label="Nenda kwenye ujumbe wa mwisho"
      className={cn(
        // Anchored right rather than centred: the transcript column is centred,
        // so a centred button would sit on top of the last line of the answer.
        "absolute -top-14 right-4 grid h-9 w-9 place-items-center sm:right-8",
        // Solid, not translucent: this floats over the last line of a streaming
        // answer, and a see-through button reads as a smudge on the text.
        "rounded-full border border-white/[0.14] bg-[rgb(var(--k-elev-4))] text-ink-2",
        "shadow-[0_8px_24px_-8px_rgba(0,0,0,0.9)]",
        "transition duration-2 ease-fluid hover:border-gold-500/40 hover:text-gold-300",
        "active:scale-90",
      )}
    >
      <ArrowDown className="h-4 w-4" />
    </ThreadPrimitive.ScrollToBottom>
  );
}

/** Keyboard hint (desktop only) and the offline notice when relevant. */
function ComposerHint() {
  const isRunning = useAuiState((state) => state.thread.isRunning);

  return (
    <p
      className={cn(
        "mt-2 hidden text-center text-[11.5px] text-ink-4 transition-opacity duration-3 sm:block",
        isRunning ? "opacity-0" : "opacity-100",
      )}
    >
      Bonyeza <kbd className="font-sans font-medium text-ink-3">Enter</kbd> kutuma ·{" "}
      <kbd className="font-sans font-medium text-ink-3">Shift + Enter</kbd> kwa mstari mpya
    </p>
  );
}

/**
 * Lifts the room lights while the assistant is working.
 * Rendered inside the runtime so it can read the thread's running state.
 */
export function ThinkingAmbient() {
  const isRunning = useAuiState((state) => state.thread.isRunning);
  return <AmbientBackdrop intensity={isRunning ? "active" : "quiet"} />;
}
