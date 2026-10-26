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
 * The artwork itself remains static; transient state motion belongs on its
 * wrapper so the badge stays unaltered.
 */

const LOGO_SRC = "/images/khaki-logo-256.webp";

export interface KhakiMarkProps {
  size?: number;
  className?: string;
  /** Preload hint for the largest instance on screen */
  priority?: boolean;
  alt?: string;
}

export function KhakiMark({
  size = 40,
  className,
  priority = false,
  alt = "Khaki Media",
}: KhakiMarkProps) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
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
