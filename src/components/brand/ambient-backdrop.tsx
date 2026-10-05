"use client";

import { cn } from "@/lib/utils";

/**
 * AmbientBackdrop — the room tone of the interface.
 *
 * Three drifting gold light sources over pure black, plus a vignette and film
 * grain. `intensity="active"` swells the light while the assistant is working,
 * which is the "thinking background" effect: the studio lights come up.
 *
 * Kept under 12% opacity so body text always clears WCAG AA on black.
 */

export interface AmbientBackdropProps {
  intensity?: "quiet" | "active";
  className?: string;
}

export function AmbientBackdrop({ intensity = "quiet", className }: AmbientBackdropProps) {
  const active = intensity === "active";

  return (
    <div
      aria-hidden
      className={cn(
        "ambient-layer pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black",
        className,
      )}
      style={{ transition: "opacity 700ms var(--ease-fluid)" }}
    >
      {/* Key light — top centre, behind the header */}
      <div
        className="ambient-light absolute left-1/2 top-[-22vh] h-[54vh] w-[120vw] -translate-x-1/2 animate-drift-a rounded-[50%]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(var(--gold-rgb) / 0.13) 0%, rgba(var(--gold-rgb) / 0.04) 46%, transparent 78%)",
          opacity: active ? 1 : 0.62,
          transition: "opacity 900ms var(--ease-fluid)",
          filter: "blur(28px)",
        }}
      />

      {/* Fill light — lower right, cool */}
      <div
        className="ambient-light absolute bottom-[-30vh] right-[-18vw] h-[62vh] w-[62vw] animate-drift-b rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(122, 148, 255, 0.075) 0%, transparent 72%)",
          opacity: active ? 0.9 : 0.5,
          transition: "opacity 900ms var(--ease-fluid)",
          filter: "blur(36px)",
        }}
      />

      {/* Rim light — lower left gold */}
      <div
        className="ambient-light absolute bottom-[-24vh] left-[-16vw] h-[52vh] w-[56vw] animate-drift-a rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(var(--gold-rgb) / 0.1) 0%, transparent 70%)",
          opacity: active ? 1 : 0.55,
          transition: "opacity 900ms var(--ease-fluid)",
          filter: "blur(34px)",
          animationDelay: "-9s",
        }}
      />

      {/* Thinking sweep: a wide soft band that rises from the composer */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38vh]"
        style={{
          background:
            "linear-gradient(to top, rgba(var(--gold-rgb) / 0.075) 0%, rgba(var(--gold-rgb) / 0.02) 38%, transparent 100%)",
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 800ms var(--ease-fluid), transform 800ms var(--ease-fluid)",
        }}
      />

      {/* Vignette: pulls focus to the centre column */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 78% at 50% 42%, transparent 42%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <div className="grain absolute inset-0" />
    </div>
  );
}
