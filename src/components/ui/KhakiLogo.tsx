"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface KhakiLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  isThinking?: boolean;
  isStreaming?: boolean;
  showSoundwaves?: boolean;
  className?: string;
}

export const KhakiLogo: React.FC<KhakiLogoProps> = ({
  size = "md",
  isThinking = false,
  isStreaming = false,
  showSoundwaves = false,
  className,
}) => {
  const [imgError, setImgError] = useState(false);

  // Size specifications matching Apple HIG touch targets & proportions
  const sizeMap = {
    sm: {
      box: "h-8 w-8 min-w-8",
      img: 32,
      text: "text-xs",
      bars: "w-0.5",
    },
    md: {
      box: "h-11 w-11 min-w-11",
      img: 44,
      text: "text-sm",
      bars: "w-1",
    },
    lg: {
      box: "h-20 w-20 min-w-20",
      img: 80,
      text: "text-2xl",
      bars: "w-1",
    },
    xl: {
      box: "h-28 w-28 min-w-28",
      img: 112,
      text: "text-4xl",
      bars: "w-1.5",
    },
  };

  const currentSize = sizeMap[size];
  const isActive = isThinking || isStreaming;

  return (
    <div className={cn("relative inline-flex items-center justify-center select-none", className)}>
      {/* 1. Vercel / Apple Intelligence Generative Radiant Aura */}
      {isActive && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 -m-3 rounded-full bg-[conic-gradient(from_0deg,#D4AF37,#F5D061,#996515,#FFDF73,#D4AF37)] blur-xl opacity-75 animate-[spin_4s_linear_infinite] pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -m-2 rounded-full bg-radial from-[#F5D061]/50 via-[#D4AF37]/30 to-transparent blur-lg animate-pulse pointer-events-none"
          />
        </>
      )}

      {/* 2. Outer Rotating Orbital Particle Ring when thinking */}
      {isThinking && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -m-1.5 rounded-full border border-dashed border-[#F5D061]/80 animate-[spin_5s_linear_infinite] pointer-events-none"
        />
      )}

      {/* 3. Main Circular Emblem */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full overflow-hidden transition-all duration-300",
          "bg-gradient-to-b from-[#1c1c20] via-[#0d0d10] to-[#000000]",
          "border border-[#D4AF37]/40 shadow-2xl",
          currentSize.box,
          isActive
            ? "border-[#F5D061] shadow-[0_0_35px_rgba(212,175,55,0.55)] ring-2 ring-[#D4AF37]/60 scale-105"
            : "hover:border-[#D4AF37]/80 hover:shadow-[0_0_22px_rgba(212,175,55,0.25)] hover:scale-105"
        )}
      >
        {!imgError ? (
          <Image
            src="/images/khaki-logo.png"
            alt="Khaki Media Logo"
            width={currentSize.img}
            height={currentSize.img}
            className={cn(
              "object-contain w-full h-full p-0.5 transition-transform duration-300",
              isActive && "scale-105 filter drop-shadow-[0_0_10px_rgba(212,175,55,0.7)]"
            )}
            onError={() => setImgError(true)}
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#D4AF37]/20 via-black to-[#0d0d0f]">
            <span className={cn("font-bold tracking-widest text-[#D4AF37]", currentSize.text)}>
              K
            </span>
          </div>
        )}

        {/* Specular glass reflection sweep across emblem */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/15 to-transparent",
            isActive ? "opacity-80 animate-[pulse_2s_ease-in-out_infinite]" : "opacity-40"
          )}
        />
      </div>

      {/* 4. Audio Frequency Visualizer (Apple-style 5-bar EQ wave) */}
      {(showSoundwaves || isActive) && (
        <div
          aria-label="Audio Visualizer"
          className="absolute -bottom-1 -right-1 flex items-end gap-0.5 rounded-full bg-black/85 backdrop-blur-md px-1.5 py-1 border border-[#D4AF37]/50 shadow-lg"
        >
          <span
            className={cn(
              "rounded-full bg-[#D4AF37] transition-all",
              currentSize.bars,
              isActive ? "h-2 animate-[soundwave_0.7s_ease-in-out_infinite_alternate]" : "h-1 opacity-50"
            )}
            style={{ animationDelay: "0ms" }}
          />
          <span
            className={cn(
              "rounded-full bg-[#F5D061] transition-all",
              currentSize.bars,
              isActive ? "h-3 animate-[soundwave_0.5s_ease-in-out_infinite_alternate_0.1s]" : "h-1.5 opacity-60"
            )}
            style={{ animationDelay: "100ms" }}
          />
          <span
            className={cn(
              "rounded-full bg-[#FFE58F] transition-all",
              currentSize.bars,
              isActive ? "h-4 animate-[soundwave_0.8s_ease-in-out_infinite_alternate_0.3s]" : "h-2 opacity-75"
            )}
            style={{ animationDelay: "200ms" }}
          />
          <span
            className={cn(
              "rounded-full bg-[#F5D061] transition-all",
              currentSize.bars,
              isActive ? "h-3 animate-[soundwave_0.6s_ease-in-out_infinite_alternate_0.15s]" : "h-1.5 opacity-60"
            )}
            style={{ animationDelay: "300ms" }}
          />
          <span
            className={cn(
              "rounded-full bg-[#D4AF37] transition-all",
              currentSize.bars,
              isActive ? "h-2 animate-[soundwave_0.75s_ease-in-out_infinite_alternate_0.25s]" : "h-1 opacity-50"
            )}
            style={{ animationDelay: "400ms" }}
          />
        </div>
      )}
    </div>
  );
};
