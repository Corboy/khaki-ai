"use client";

import { cn } from "@/lib/utils";

export interface AmbientBackdropProps {
  className?: string;
}

/** Static obsidian room tone; motion belongs to content, not the page canvas. */
export function AmbientBackdrop({ className }: AmbientBackdropProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black",
        className,
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 56% at 50% 8%, rgba(var(--gold-rgb) / 0.035), transparent 72%)",
        }}
      />
      <div className="grain absolute inset-0" />
    </div>
  );
}
