"use client";

import { ComposerPrimitive, useAuiState } from "@assistant-ui/react";
import { ArrowUp, Square } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Composer — the bottom-docked input surface.
 *
 * Behaviours that matter on a phone:
 *  · 16px text so iOS never zooms on focus
 *  · the send button grows to a full 44px target
 *  · `env(safe-area-inset-bottom)` keeps it clear of the home indicator
 *  · Enter sends on desktop, Shift+Enter breaks the line
 */

export function Composer() {
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const isEmpty = useAuiState((state) => state.composer.isEmpty);
  const canSend = useAuiState((state) => state.composer.canSend);

  return (
    <ComposerPrimitive.Root
      className={cn(
        "group/composer relative isolate w-full",
        "material-regular rounded-[26px]",
        "transition-[box-shadow,border-color] duration-3 ease-fluid",
        "focus-within:border-gold-500/60",
        "focus-within:shadow-[0_0_0_1px_rgba(var(--gold-rgb)/0.35),0_22px_60px_-28px_rgba(var(--gold-rgb)/0.45),inset_0_1px_0_rgba(255,255,255,0.10)]",
      )}
    >
      {/* Specular sweep along the top edge when focused */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 -top-px h-px opacity-0 transition-opacity duration-3 group-focus-within/composer:opacity-100"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(var(--gold-rgb) / 0.85), transparent)",
        }}
      />

      <div className="flex items-end gap-2 p-2 pl-4">
        <ComposerPrimitive.Input
          placeholder="Uliza kuhusu packages, bei au booking…"
          submitMode="enter"
          enterKeyHint="send"
          cancelOnEscape
          rows={1}
          aria-label="Andika ujumbe"
          className={cn(
            "max-h-[42vh] min-h-[44px] w-full resize-none bg-transparent py-3",
            "text-[16px] leading-[1.5] tracking-[-0.008em] text-ink",
            "placeholder:text-ink-4",
            "focus:outline-none",
            "scrollbar-none",
          )}
        />

        {/* Send / Stop */}
        <div className="flex shrink-0 items-center pb-0.5">
          {isRunning ? (
            <ComposerPrimitive.Cancel asChild>
              <button
                type="button"
                aria-label="Sitisha jibu"
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full",
                  "border border-white/15 bg-white/[0.08] text-ink",
                  "transition duration-1 ease-fluid active:scale-90 hover:bg-white/[0.14]",
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
                  "transition-[transform,background,box-shadow,opacity] duration-2 ease-spring",
                  "active:scale-90",
                  "disabled:cursor-not-allowed disabled:bg-white/[0.055] disabled:text-ink-4 disabled:shadow-none",
                  !isEmpty && canSend
                    ? "brass-fill metal-sweep text-black shadow-[0_6px_20px_-6px_rgba(var(--gold-rgb)/0.7)] hover:brightness-110"
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
