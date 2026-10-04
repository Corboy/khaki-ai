"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * IconButton — every icon-only control in Khaki AI.
 *
 * One definition means the 44px touch target, focus ring, press feedback and
 * disabled treatment are identical everywhere, which is what makes a UI feel
 * considered rather than assembled.
 */

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name. Required — icon-only buttons must be labelled. */
  label: string;
  size?: "sm" | "md" | "lg";
  tone?: "ghost" | "solid" | "gold";
  /** Renders a filled circle; used for the primary send action */
  shape?: "square" | "circle";
}

/**
 * Sizes are chosen so the *touch target* clears 44px everywhere. `sm` stays
 * visually compact for dense action bars and reaches 44px through an invisible
 * pseudo-element, which is what a thumb actually hits.
 */
const SIZES: Record<NonNullable<IconButtonProps["size"]>, string> = {
  sm: "h-9 w-9 after:absolute after:-inset-1",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

const TONES: Record<NonNullable<IconButtonProps["tone"]>, string> = {
  ghost: "text-ink-3 hover:bg-white/[0.07] hover:text-ink",
  solid: "bg-white/[0.07] text-ink hover:bg-white/[0.12]",
  gold: "brass-fill metal-sweep text-black shadow-gold hover:brightness-110",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "md", tone = "ghost", shape = "square", className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        "transition-[transform,background-color,color,box-shadow] duration-1 ease-fluid",
        "active:scale-[0.92]",
        "disabled:pointer-events-none disabled:opacity-35",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/70 focus-visible:ring-offset-1 focus-visible:ring-offset-black",
        shape === "circle" ? "rounded-full" : "rounded-[10px]",
        SIZES[size],
        TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
