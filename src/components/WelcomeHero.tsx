"use client";

import React from "react";
import { KHAKI_CONFIG } from "@/config/khaki";
import { Sparkles, Mic, Video, Radio, Camera, Palette, CalendarCheck } from "lucide-react";

interface WelcomeHeroProps {
  userName?: string;
  onSelectQuickAction: (prompt: string) => void;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({
  userName,
  onSelectQuickAction,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Mic":
        return <Mic className="h-3.5 w-3.5" />;
      case "Video":
        return <Video className="h-3.5 w-3.5" />;
      case "Radio":
        return <Radio className="h-3.5 w-3.5" />;
      case "Camera":
        return <Camera className="h-3.5 w-3.5" />;
      case "Palette":
        return <Palette className="h-3.5 w-3.5" />;
      case "CalendarCheck":
        return <CalendarCheck className="h-3.5 w-3.5" />;
      default:
        return <Sparkles className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-8 sm:py-14 animate-fade-in">
      {/* Golden Monogram Mark */}
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-khaki-gold/25 via-surface-card to-black border border-khaki-gold/40 p-1 shadow-gold-lg transition-transform hover:scale-105 duration-300">
        <span className="text-2xl font-bold tracking-widest text-khaki-gold">K</span>
        <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-khaki-gold text-[9px] font-bold text-black shadow">
          ✦
        </div>
      </div>

      {/* Brand & Assistant Name */}
      <div className="space-y-1">
        <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
          {KHAKI_CONFIG.brandName}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
          <span className="text-khaki-gold">✦</span>
          <span>{KHAKI_CONFIG.assistantName}</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          {KHAKI_CONFIG.subtitle}
        </p>
      </div>

      {/* Welcome Greeting Prompt */}
      <div className="mt-8 rounded-2xl border border-white/[0.08] bg-surface-card/60 backdrop-blur-md px-6 py-4 max-w-md shadow-card">
        <p className="text-base sm:text-lg font-medium text-white">
          {userName ? (
            <>
              Karibu tena, <span className="text-khaki-gold">{userName}</span> 👋
            </>
          ) : (
            <>Habari 👋 Unaitwa nani?</>
          )}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          {userName
            ? "Naweza kukusaidia kuhusu huduma, bei, vifurushi au kuweka booking ya studio."
            : "Niambie jina lako au chagua mada yoyote hapa chini kuanza mazungumzo."}
        </p>
      </div>

      {/* Quick Action Pills */}
      <div className="mt-8 w-full max-w-xl">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-3 block">
          Huduma & Maswali ya Haraka
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {KHAKI_CONFIG.quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => onSelectQuickAction(action.prompt)}
              className="group flex items-center gap-2 rounded-full border border-white/[0.08] bg-surface-50/70 px-3.5 py-1.5 text-xs text-zinc-300 transition-all hover:border-khaki-gold/40 hover:bg-surface-subtle hover:text-white active:scale-95 shadow-sm"
            >
              <span className="text-khaki-gold transition-transform group-hover:scale-110">
                {getIcon(action.icon)}
              </span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
