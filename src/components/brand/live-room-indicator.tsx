"use client";

import { KhakiGlyph } from "@/components/brand/khaki-glyph";
import { cn } from "@/lib/utils";

export interface LiveRoomIndicatorProps {
  /** Overrides the default caption. */
  label?: string;
  className?: string;
}

const DEFAULT_LABEL = "Khaki AI inafikiria";

/** A quiet, compact status shown only until the first response token arrives. */
export function LiveRoomIndicator({ label, className }: LiveRoomIndicatorProps) {
  const caption = label ?? DEFAULT_LABEL;

  return (
    <div className={cn("flex min-h-11 items-center gap-2.5 px-1 py-1", className)}>
      <KhakiGlyph size={18} simplified />
      <span
        role="status"
        aria-live="polite"
        className="text-[14px] font-medium tracking-[-0.01em] text-ink-2"
      >
        {caption}
      </span>
      <span aria-hidden="true" className="thinking-status-dots">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="thinking-status-dot"
            style={{ animationDelay: `${dot * 160}ms` }}
          />
        ))}
      </span>
    </div>
  );
}
