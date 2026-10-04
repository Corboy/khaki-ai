"use client";

import { cn } from "@/lib/utils";

/**
 * KhakiMark — the official Khaki Media badge inside a machined brass bezel.
 *
 * A plain `<img>` rather than `next/image`, deliberately. The mark renders
 * between 12px and 80px CSS, so the asset was re-exported at 256px WebP
 * (14 kB, down from an 89 kB PNG) and there is nothing left for an image
 * optimiser to do — while `next/image` alone pulled a 62 kB chunk onto both
 * `/` and `/admin`, 16% of the settings page.
 *
 * The bezel, specular sweep and halo are all vector, so the mark stays sharp
 * and can be animated without touching the artwork.
 */

const LOGO_SRC = "/images/khaki-logo-256.webp";

export interface KhakiMarkProps {
  size?: number;
  className?: string;
  /** Rotating specular sweep around the bezel */
  sweep?: boolean;
  /** Soft golden halo that breathes behind the badge */
  halo?: boolean;
  /** Preload hint for the largest instance on screen */
  priority?: boolean;
  alt?: string;
}

export function KhakiMark({
  size = 40,
  className,
  sweep = false,
  halo = false,
  priority = false,
  alt = "Khaki Media",
}: KhakiMarkProps) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      {halo && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[-45%] rounded-full animate-halo"
          style={{
            background:
              "radial-gradient(circle, rgba(var(--gold-rgb) / 0.42) 0%, rgba(var(--gold-rgb) / 0.14) 42%, transparent 72%)",
          }}
        />
      )}

      {sweep && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[-8%] rounded-full animate-spin"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(var(--gold-rgb) / 0) 210deg, rgba(var(--gold-rgb) / 0.85) 330deg, transparent 360deg)",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2.2px), #000 calc(100% - 1.4px))",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 2.2px), #000 calc(100% - 1.4px))",
          }}
        />
      )}

      <span
        className="relative block h-full w-full overflow-hidden rounded-full"
        style={{
          boxShadow:
            "0 0 0 1px rgba(var(--gold-rgb) / 0.55), 0 0 0 3px rgba(0,0,0,0.9), 0 6px 20px -6px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,244,207,0.22)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_SRC}
          alt={alt}
          width={256}
          height={256}
          decoding="async"
          {...(priority ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
          className="h-full w-full object-cover"
        />
        {/* specular highlight, top-left, like light on a lacquered badge */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(120% 90% at 24% 8%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 34%, transparent 62%)",
          }}
        />
      </span>
    </span>
  );
}
