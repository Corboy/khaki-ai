"use client";

import React from "react";
import { KHAKI_CONFIG } from "@/config/khaki";
import { MessageSquarePlus, MessageCircle, Sparkles, Radio } from "lucide-react";

interface HeaderProps {
  onResetChat: () => void;
  hasMessages: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onResetChat, hasMessages }) => {
  const directWhatsAppUrl = `https://wa.me/${KHAKI_CONFIG.contact.whatsappNumber}?text=${encodeURIComponent(
    "Habari Khaki Media 👋 Naomba kuwasiliana na studio manager."
  )}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-background/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-khaki-gold/20 via-surface-card to-black p-0.5 shadow-gold border border-khaki-gold/30">
            <span className="font-bold text-khaki-gold tracking-wider text-base">K</span>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wide text-white uppercase">
                {KHAKI_CONFIG.brandName}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-khaki-gold/10 px-2 py-0.5 text-[10px] font-medium text-khaki-gold border border-khaki-gold/20">
                <Sparkles className="h-2.5 w-2.5" />
                AI Studio
              </span>
            </div>
            <span className="text-xs text-zinc-400">
              {KHAKI_CONFIG.subtitle}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {hasMessages && (
            <button
              onClick={onResetChat}
              title="Anzisha Mazungumzo Mapya"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-50/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-khaki-gold/40 hover:bg-surface-100 hover:text-white"
            >
              <MessageSquarePlus className="h-3.5 w-3.5 text-khaki-gold" />
              <span className="hidden sm:inline">Mazungumzo Mapya</span>
            </button>
          )}

          <a
            href={directWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Wasiliana Nasi Moja kwa Moja WhatsApp"
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">WhatsApp Studio</span>
          </a>
        </div>
      </div>
    </header>
  );
};
