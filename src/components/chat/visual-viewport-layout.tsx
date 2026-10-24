"use client";

import { useEffect, type ReactNode } from "react";

import { visualViewportOffset } from "@/lib/mobile-layout";

export function VisualViewportLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frame = 0;

    const update = () => {
      frame = 0;

      const viewportHeight = viewport?.height ?? window.innerHeight;
      const layoutHeight = window.innerHeight;
      const pageTop = viewport?.pageTop ?? 0;
      const keyboardOffset = visualViewportOffset(viewportHeight, layoutHeight, pageTop);

      root.style.setProperty("--khaki-viewport-height", `${viewportHeight}px`);
      root.style.setProperty("--khaki-keyboard-offset", `${keyboardOffset}px`);
      root.style.setProperty("--khaki-shell-height", `${viewportHeight}px`);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("resize", schedule, { passive: true });
    viewport?.addEventListener("resize", schedule, { passive: true });
    viewport?.addEventListener("scroll", schedule, { passive: true });
    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      root.style.removeProperty("--khaki-viewport-height");
      root.style.removeProperty("--khaki-keyboard-offset");
    };
  }, []);

  return children;
}
