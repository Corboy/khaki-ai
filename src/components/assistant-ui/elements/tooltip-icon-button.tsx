"use client";

import React, { forwardRef } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export interface TooltipIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?: string;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  asChild?: boolean;
}

export const TooltipIconButton = forwardRef<HTMLButtonElement, TooltipIconButtonProps>(
  ({ children, tooltip, side = "top", sideOffset = 6, className, ...props }, ref) => {
    const button = (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-khaki-gold disabled:pointer-events-none disabled:opacity-40",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );

    if (!tooltip) return button;

    return (
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side={side}
              sideOffset={sideOffset}
              className="z-50 overflow-hidden rounded-lg bg-zinc-900 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white shadow-card animate-fade-in"
            >
              {tooltip}
              <Tooltip.Arrow className="fill-zinc-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }
);

TooltipIconButton.displayName = "TooltipIconButton";
