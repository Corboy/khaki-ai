"use client";

import { ComposerPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";

import { useConversations } from "@/components/chat/conversations-provider";
import { readDraft, writeDraft } from "@/lib/conversations";
import { cn } from "@/lib/utils";

/**
 * Composer — the bottom-docked input surface.
 *
 * Behaviours that matter on a phone:
 *  · 16px text so iOS never zooms on focus
 *  · the send button grows to a full 44px target
 *  · `env(safe-area-inset-bottom)` keeps it clear of the home indicator
 *  · Enter sends on desktop, Shift+Enter breaks the line
 *
 * ---------------------------------------------------------------------------
 * Drafts
 * ---------------------------------------------------------------------------
 * The text is mirrored to `localStorage` per conversation and restored when the
 * thread is reopened. The runtime holding it is remounted on every conversation
 * switch — that is what makes switching deterministic — so without this, half a
 * typed question is destroyed by one tap on the sidebar.
 *
 * The restore runs **once per mount**, deliberately. The runtime is keyed by
 * conversation id, so a mount is a conversation; re-running it would fight the
 * user for the caret on every keystroke.
 */
export function Composer() {
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const isEmpty = useAuiState((state) => state.composer.isEmpty);
  const canSend = useAuiState((state) => state.composer.canSend);
  const text = useAuiState((state) => state.composer.text);

  const aui = useAui();
  const { active } = useConversations();
  const conversationId = active?.id;
  const { ref } = useComposerLayoutStyle();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Use a native textarea as the primitive's child: react-textarea-autosize
  // inserts an unlabelled hidden measurement field into <body>, which Chrome
  // reports as a form-field issue. The primitive still owns input/submit events.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  }, [text]);

  /* Bring back what was typed here before, once. */
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !conversationId) return;
    restored.current = true;
    const saved = readDraft(conversationId);
    if (saved) aui.composer.setText(saved);
  }, [aui, conversationId]);

  /* Keep the mirror current. Empty text removes the key rather than storing "". */
  useEffect(() => {
    if (!conversationId) return;
    writeDraft(conversationId, text);
  }, [conversationId, text]);

  return (
    <ComposerPrimitive.Root
      ref={ref}
      className={cn(
        "group/composer relative isolate w-full",
        "rounded-[26px] border border-white/[0.12] bg-[#202020]",
        "transition-colors duration-1 ease-fluid focus-within:border-white/[0.24]",
      )}
    >
      <div className="flex items-end gap-2 p-2 pl-4">
        <ComposerPrimitive.Input asChild submitMode="enter" cancelOnEscape>
          <textarea
            ref={inputRef}
            id="khaki-message"
            name="message"
            placeholder="Uliza kuhusu packages, bei au booking…"
            enterKeyHint="send"
            rows={1}
            aria-label="Andika ujumbe"
            className={cn(
              "khaki-composer-input min-h-[44px] w-full resize-none bg-transparent py-3",
              "text-[16px] leading-[1.5] tracking-[-0.008em] text-ink",
              "placeholder:text-ink-4",
              "focus:outline-none",
              "scrollbar-none",
            )}
          />
        </ComposerPrimitive.Input>

        {/* Send / Stop */}
        <div className="flex shrink-0 items-center pb-0.5">
          {isRunning ? (
            <ComposerPrimitive.Cancel asChild>
              <button
                type="button"
                aria-label="Sitisha jibu"
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full",
                  "bg-white/[0.12] text-ink",
                  "transition-colors duration-1 ease-fluid hover:bg-white/[0.18]",
                )}
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            </ComposerPrimitive.Cancel>
          ) : (
            <ComposerPrimitive.Send asChild>
              <button
                type="button"
                aria-label="Tuma ujumbe"
                disabled={isEmpty || !canSend}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full",
                  "transition-[background-color,opacity] duration-1 ease-fluid",
                  "active:opacity-80",
                  "disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-ink-4",
                  !isEmpty && canSend
                    ? "bg-gold-500 text-black hover:bg-gold-400"
                    : "bg-white/[0.055] text-ink-4",
                )}
              >
                <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.4} />
              </button>
            </ComposerPrimitive.Send>
          )}
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

/** Keep transcript padding in sync without putting every resize into React. */
export function useComposerLayoutStyle(): { ref: RefObject<HTMLFormElement | null> } {
  const ref = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--khaki-composer-height", `${element.offsetHeight}px`);
    };
    const observer = new ResizeObserver(update);

    observer.observe(element);
    update();

    return () => {
      observer.disconnect();
      root.style.removeProperty("--khaki-composer-height");
    };
  }, []);

  return { ref };
}
