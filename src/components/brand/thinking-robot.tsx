"use client";

import { useEffect, useRef, useState } from "react";
import type { AnimationItem } from "lottie-web";

import { KhakiGlyph } from "@/components/brand/khaki-glyph";
import { cn } from "@/lib/utils";

const ANIMATION_URL = "/animations/khaki-thinking.json";

interface LottieMarker {
  cm: string;
  tm: number;
  dr: number;
}

interface ThinkingAnimationData {
  markers?: LottieMarker[];
}

/**
 * Plays only the supplied robot's named thinking segment. It is fetched and
 * loaded only while this transient status is mounted; reduced-motion users get
 * the static Khaki mark instead.
 */
export function ThinkingRobot({ className }: { className?: string }) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let generation = 0;
    let controller: AbortController | undefined;
    let animation: AnimationItem | undefined;

    const start = () => {
      const currentGeneration = ++generation;
      controller?.abort();
      controller = undefined;
      animation?.destroy();
      animation = undefined;
      setLoaded(false);

      if (motionPreference.matches) return;

      const requestController = new AbortController();
      controller = requestController;

      void (async () => {
        try {
          const [lottieModule, response] = await Promise.all([
            import("lottie-web"),
            fetch(ANIMATION_URL, {
              signal: requestController.signal,
              cache: "no-cache",
            }),
          ]);
          if (!response.ok) throw new Error("Thinking animation unavailable");

          const data = (await response.json()) as ThinkingAnimationData;
          const marker = data.markers?.find(({ cm }) => cm === "thinking");
          if (
            !marker ||
            !Number.isFinite(marker.tm) ||
            !Number.isFinite(marker.dr) ||
            marker.dr <= 0 ||
            requestController.signal.aborted ||
            currentGeneration !== generation ||
            !host.isConnected
          ) {
            return;
          }

          const player = lottieModule.default.loadAnimation({
            container: host,
            renderer: "svg",
            loop: true,
            autoplay: false,
            animationData: data,
            rendererSettings: {
              preserveAspectRatio: "xMidYMid meet",
              progressiveLoad: true,
            },
          });
          animation = player;
          player.setSpeed(0.82);
          player.addEventListener("DOMLoaded", () => {
            if (currentGeneration === generation) setLoaded(true);
          });
          player.playSegments([marker.tm, marker.tm + marker.dr], true);
        } catch {
          // Keep the static Khaki mark visible if loading or parsing fails.
          if (!requestController.signal.aborted && currentGeneration === generation) {
            setLoaded(false);
          }
        }
      })();
    };

    motionPreference.addEventListener("change", start);
    start();

    return () => {
      motionPreference.removeEventListener("change", start);
      generation += 1;
      controller?.abort();
      animation?.destroy();
    };
  }, []);

  return (
    <span
      data-thinking-robot="true"
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 items-center justify-center",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          loaded && "opacity-0",
        )}
      >
        <KhakiGlyph size={30} simplified />
      </span>
      <span ref={hostRef} className="absolute inset-0 overflow-hidden" />
    </span>
  );
}
