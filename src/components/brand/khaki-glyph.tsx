"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * KhakiGlyph — the Khaki Media monogram redrawn as resolution-independent
 * vector: condenser microphone inside a headphone yoke, inside the brass ring,
 * with the three "level" dots from the badge below the capsule.
 *
 * Used wherever the 305px raster badge would go muddy (favicons, 20–40px
 * chrome, loaders, animated states).
 */

export interface KhakiGlyphProps {
  size?: number;
  className?: string;
  /** `gold` = metallic gradient (default), `mono` = single ink colour */
  variant?: "gold" | "mono";
  /** Grey out the brass ring so only the microphone reads (favicon-size) */
  simplified?: boolean;
  title?: string;
}

export function KhakiGlyph({
  size = 32,
  className,
  variant = "gold",
  simplified = false,
  title,
}: KhakiGlyphProps) {
  const uid = useId().replace(/[:]/g, "");
  const metalId = `km-metal-${uid}`;
  const arcId = `km-arc-${uid}`;
  const isMono = variant === "mono";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0 overflow-visible", className)}
    >
      <defs>
        <linearGradient id={metalId} x1="10" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isMono ? "currentColor" : "#8d6c17"} />
          <stop offset="18%" stopColor={isMono ? "currentColor" : "#d4af37"} />
          <stop offset="38%" stopColor={isMono ? "currentColor" : "#fff4cf"} />
          <stop offset="56%" stopColor={isMono ? "currentColor" : "#f2d47a"} />
          <stop offset="76%" stopColor={isMono ? "currentColor" : "#b8912a"} />
          <stop offset="100%" stopColor={isMono ? "currentColor" : "#e5be53"} />
        </linearGradient>
        <linearGradient id={arcId} x1="8" y1="52" x2="56" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isMono ? "currentColor" : "#6b4f0c"} />
          <stop offset="50%" stopColor={isMono ? "currentColor" : "#f2d47a"} />
          <stop offset="100%" stopColor={isMono ? "currentColor" : "#b8912a"} />
        </linearGradient>
      </defs>

      {/* Brass ring */}
      {!simplified && (
        <>
          <circle
            cx="32"
            cy="32"
            r="30"
            stroke={`url(#${metalId})`}
            strokeWidth="1.7"
            opacity={isMono ? 0.5 : 1}
          />
          <circle cx="32" cy="32" r="25.6" stroke={`url(#${arcId})`} strokeWidth="0.7" opacity="0.42" />
        </>
      )}

      {/* Headphone yoke sweeping over the capsule */}
      <path
        d="M17.6 34.5V28.2A6.4 6.4 0 0 1 24 21.8h16a6.4 6.4 0 0 1 6.4 6.4v6.3"
        stroke={`url(#${arcId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity={simplified ? 0.9 : 1}
      />
      {/* Ear cups */}
      <rect x="14.2" y="31.4" width="6.6" height="10.4" rx="3.3" fill={`url(#${metalId})`} />
      <rect x="43.2" y="31.4" width="6.6" height="10.4" rx="3.3" fill={`url(#${metalId})`} />

      {/* Condenser capsule */}
      <rect x="26.4" y="15.3" width="11.2" height="20.4" rx="5.6" fill={`url(#${metalId})`} />
      {/* Grille slots */}
      <g stroke="#0a0a0c" strokeWidth="0.9" opacity="0.5" strokeLinecap="round">
        <path d="M28.6 20.2h6.8" />
        <path d="M28.6 23.4h6.8" />
        <path d="M28.6 26.6h6.8" />
        <path d="M28.6 29.8h6.8" />
      </g>

      {/* Suspension arc under the capsule */}
      <path
        d="M22.8 33.2a9.2 9.2 0 0 0 18.4 0"
        stroke={`url(#${arcId})`}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      {/* Stem */}
      <path d="M32 42.4v6.1" stroke={`url(#${metalId})`} strokeWidth="1.9" strokeLinecap="round" />

      {/* Level dots */}
      <g fill={`url(#${metalId})`}>
        <circle cx="32" cy="52.2" r="1.7" />
        <circle cx="32" cy="57" r="1.15" opacity="0.7" />
        <circle cx="32" cy="60.6" r="0.75" opacity="0.45" />
      </g>
    </svg>
  );
}
