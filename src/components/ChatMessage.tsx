"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage as ChatMessageType, BookingDetails } from "@/types/chat";
import { KHAKI_CONFIG } from "@/config/khaki";
import { BookingCard } from "./BookingCard";
import { Copy, Check, Sparkles, User as UserIcon } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  onUpdateBooking?: (updated: BookingDetails) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  onUpdateBooking,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  return (
    <div
      className={`group relative flex w-full gap-3.5 py-4 transition-all animate-slide-up ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="relative flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-gradient-to-br from-khaki-gold/25 via-surface-card to-black p-0.5 border border-khaki-gold/30 shadow-gold">
          <span className="text-xs font-bold text-khaki-gold">K</span>
        </div>
      )}

      {/* Message Content Container */}
      <div
        className={`relative max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all ${
          isUser
            ? "bg-surface-subtle text-white border border-white/10 rounded-br-sm shadow-card"
            : "bg-surface-card/70 text-zinc-200 border border-white/[0.06] rounded-tl-sm shadow-card backdrop-blur-sm"
        }`}
      >
        {/* Author Label & Copy Button Header for Assistant */}
        {!isUser && (
          <div className="mb-1.5 flex items-center justify-between gap-4 border-b border-white/[0.06] pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-khaki-gold">
                {KHAKI_CONFIG.assistantName}
              </span>
              <span className="text-[10px] text-zinc-500">Studio Assistant</span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-zinc-400 opacity-60 transition-opacity hover:opacity-100 hover:text-white"
              title="Nakili ujumbe"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Imenakiliwa</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Nakili</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Text / Markdown Body */}
        <div className="prose prose-invert max-w-none prose-p:my-1.5 prose-p:leading-relaxed prose-headings:my-2 prose-headings:text-white prose-ul:my-2 prose-li:my-0.5 prose-strong:text-khaki-gold-light prose-code:rounded prose-code:bg-black/40 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:text-khaki-gold">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>

          {/* Streaming Cursor */}
          {isStreaming && (
            <span className="inline-block h-4 w-1.5 translate-y-0.5 ml-1 animate-pulse bg-khaki-gold rounded-sm" />
          )}
        </div>

        {/* Embedded Booking Card if details exist and ready for booking */}
        {!isUser && message.bookingDetails?.isReadyForBooking && (
          <BookingCard
            booking={message.bookingDetails}
            onUpdateBooking={onUpdateBooking}
          />
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-surface-50 text-zinc-300 border border-white/10">
          <UserIcon className="h-4 w-4 text-zinc-400" />
        </div>
      )}
    </div>
  );
};
