"use client";

import React, { useRef, useEffect, useState } from "react";
import { ArrowUp, Mic, MicOff, Square, Sparkles } from "lucide-react";

interface ChatComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isLoading: boolean;
  isStreaming: boolean;
  onStop?: () => void;
  placeholder?: string;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  input,
  setInput,
  onSubmit,
  isLoading,
  isStreaming,
  onStop,
  placeholder = "Uliza kuhusu huduma, bei, studio au booking...",
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasSpeechRecognition, setHasSpeechRecognition] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setHasSpeechRecognition(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "sw-TZ"; // Swahili default with English fallback capability

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join("");
          setInput(transcript);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [setInput]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Speech recognition error:", err);
      }
    }
  };

  // Auto-resize textarea based on scrollHeight
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 180);
      textareaRef.current.style.height = `${Math.max(nextHeight, 44)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading && !isStreaming) {
        onSubmit();
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-2">
      <div
        className={`relative flex flex-col rounded-2xl border bg-surface-card/90 backdrop-blur-xl transition-all duration-300 shadow-card ${
          isFocused
            ? "border-khaki-gold/50 ring-1 ring-khaki-gold/30 shadow-gold"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        {/* Main Textarea Input */}
        <div className="flex items-end px-3.5 py-2.5 gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="flex-1 max-h-44 resize-none bg-transparent text-sm leading-relaxed text-white placeholder-zinc-500 focus:outline-none scrollbar-none"
            style={{ height: "44px" }}
          />

          {/* Controls: Voice + Send / Stop */}
          <div className="flex items-center gap-1.5 pb-0.5 shrink-0">
            {/* Dictation Button (if browser supports it) */}
            {hasSpeechRecognition && (
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? "Simamisha kunasa sauti" : "Ongea kwa sauti"}
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "text-zinc-400 hover:bg-surface-50 hover:text-white"
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}

            {/* Stop Button while streaming */}
            {isStreaming && onStop ? (
              <button
                type="button"
                onClick={onStop}
                title="Sitisha jibu"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              /* Send Button */
              <button
                type="button"
                onClick={() => {
                  if (input.trim() && !isLoading) {
                    onSubmit();
                  }
                }}
                disabled={!input.trim() || isLoading}
                title="Tuma ujumbe (Enter)"
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 ${
                  input.trim() && !isLoading
                    ? "bg-khaki-gold text-black hover:bg-khaki-gold-light active:scale-95 shadow-gold font-semibold"
                    : "bg-surface-50 text-zinc-600 cursor-not-allowed"
                }`}
              >
                <ArrowUp className="h-4 w-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Footer info text */}
        <div className="flex items-center justify-between px-3.5 pb-2 text-[10px] text-zinc-500 border-t border-white/[0.04] pt-1.5">
          <span className="flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 text-khaki-gold" />
            Khaki AI Studio Assistant
          </span>
          <span className="hidden sm:inline">Bonyeza Enter kutuma • Shift + Enter kwa mstari mpya</span>
        </div>
      </div>
    </div>
  );
};
