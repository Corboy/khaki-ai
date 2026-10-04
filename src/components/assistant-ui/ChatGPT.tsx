"use client";

import React, { FC, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TooltipIconButton } from "./elements/tooltip-icon-button";
import {
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  Download,
  Mic,
  MicOff,
  PlusIcon,
  RefreshCwIcon,
  Volume2,
  VolumeX,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquarePlus,
  Settings,
  MessageCircle,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { KHAKI_CONFIG } from "@/config/khaki";
import { BookingCard } from "@/components/BookingCard";
import { ChatMessage, BookingDetails } from "@/types/chat";
import { extractNameFromInput } from "@/lib/khakiEngine";
import { KhakiLogo } from "@/components/ui/KhakiLogo";

interface ChatGPTProps {
  onResetChat?: () => void;
}

export const ChatGPT: FC<ChatGPTProps> = ({ onResetChat }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [userName, setUserName] = useState("");
  const [bookingState, setBookingState] = useState<BookingDetails>({});
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isEmpty = messages.length === 0;

  // Responsive sidebar initial check on desktop
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  // Auto scroll to bottom smoothly
  const scrollToBottom = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, isLoading]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  // Speech Recognition setup (Voice Dictation)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "sw-TZ";

        recognition.onresult = (e: any) => {
          const transcript = Array.from(e.results)
            .map((r: any) => r[0].transcript)
            .join("");
          setInput(transcript);
        };
        recognition.onend = () => setIsDictating(false);
        recognition.onerror = () => setIsDictating(false);

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleDictation = () => {
    if (!recognitionRef.current) return;
    if (isDictating) {
      recognitionRef.current.stop();
      setIsDictating(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsDictating(true);
      } catch (err) {
        console.error("Speech recognition error:", err);
      }
    }
  };

  // Text-to-Speech (Audio playback)
  const toggleSpeak = (id: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingMessageId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "sw";
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Copy error:", err);
    }
  };

  const handleExportMarkdown = (text: string) => {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `khaki-ai-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setIsStreaming(false);
    setUserName("");
    setBookingState({});
    if (onResetChat) onResetChat();
  };

  const handleSend = async (overridePrompt?: string) => {
    const prompt = (overridePrompt || input).trim();
    if (!prompt || isLoading || isStreaming) return;

    setInput("");

    // Detect user name if not already saved
    let currentName = userName;
    if (!currentName) {
      const detected = extractNameFromInput(prompt);
      if (detected) {
        currentName = detected;
        setUserName(detected);
        setBookingState((prev) => ({ ...prev, name: detected }));
      }
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
      createdAt: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    // First visit friendly introduction check
    const isFirstIntro =
      messages.length === 0 &&
      currentName &&
      (prompt.toLowerCase() === currentName.toLowerCase() ||
        prompt.toLowerCase().includes("naitwa") ||
        prompt.toLowerCase().includes("jina"));

    if (isFirstIntro) {
      setTimeout(() => {
        const welcomeMessage: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: `Nice to meet you, **${currentName}** 👋\n\nKaribu sana Khaki Media. Naweza kukusaidia kuhusu:\n- 🎙️ **Studio Recording & Production** (Kurekodi nyimbo, beats na vocal tracking)\n- 🎚️ **Mixing & Mastering** (Kiwango cha ushindani cha redio na streaming)\n- 🎬 **Video Production** (Music videos 4K, matangazo & documentaries)\n- 📸 **Studio Photography** (Portraits, fashion lookbooks & branding)\n- 📻 **Podcast & Livestreaming** (Seti ya kisasa ya kamera 3 na mic 4)\n- 📅 **Booking & Ratiba za Studio**\n\nUngependa tuanzie wapi leo?`,
          createdAt: Date.now(),
          bookingDetails: { name: currentName },
        };
        setMessages((prev) => [...prev, welcomeMessage]);
        setIsLoading(false);
      }, 400);
      return;
    }

    // Call streaming API
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const assistantMessageId = `asst-${Date.now()}`;
      const placeholder: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, placeholder]);
      setIsStreaming(true);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          userName: currentName,
          bookingState,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      // Check booking header from AI engine
      const bookingHeader = response.headers.get("X-Khaki-Booking");
      let extractedBooking: BookingDetails = { ...bookingState };
      if (bookingHeader) {
        try {
          const parsed = JSON.parse(decodeURIComponent(bookingHeader));
          extractedBooking = { ...bookingState, ...parsed };
          setBookingState(extractedBooking);
        } catch (e) {
          console.error("Booking parse error:", e);
        }
      }

      if (!response.body) {
        throw new Error("No response stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: accumulated,
                  bookingDetails: extractedBooking,
                }
              : msg
          )
        );
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Chat streaming error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content:
              "Samahani, kumetokea hitilafu ya mtandao. Unaweza pia kuwasiliana na studio moja kwa moja kupitia kitufe cha WhatsApp.",
            createdAt: Date.now(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleUpdateBooking = (updated: BookingDetails) => {
    setBookingState(updated);
    setMessages((prev) =>
      prev.map((m) =>
        m.bookingDetails ? { ...m, bookingDetails: { ...m.bookingDetails, ...updated } } : m
      )
    );
  };

  return (
    <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-black text-[#f5f5f7]">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* 1. Apple-Style Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0a0a0c]/95 lg:bg-[#0c0c0e]/80 backdrop-blur-2xl border-r border-white/[0.08] transition-all duration-300 ease-in-out shrink-0",
          sidebarOpen
            ? "w-72 translate-x-0 lg:static lg:w-68"
            : "-translate-x-full lg:w-0 lg:border-r-0 overflow-hidden"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/[0.06] safe-top">
          <div className="flex items-center gap-3">
            <KhakiLogo size="sm" />
            <div>
              <span className="text-xs font-bold text-white tracking-widest uppercase block">
                Khaki Media
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">Studio Assistant</span>
            </div>
          </div>

          <TooltipIconButton
            tooltip="Funga Menyu"
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </TooltipIconButton>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              handleReset();
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white transition-all hover:border-[#D4AF37]/50 hover:bg-white/[0.08] active:scale-98 shadow-sm"
          >
            <PlusIcon className="h-4 w-4 text-[#D4AF37]" />
            <span>Mazungumzo Mapya</span>
          </button>
        </div>

        {/* Topics / Navigation Quick Links */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 text-xs">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold px-2 block py-2">
            Huduma za Studio
          </span>

          {[
            { label: "Studio Recording", prompt: "Niambie kuhusu huduma za Studio Recording na bei zake." },
            { label: "Music & Commercial Video", prompt: "Mnafanya video gani za muziki au matangazo na bei ikoje?" },
            { label: "Mixing & Mastering", prompt: "Je, mnafanya mixing & mastering na packages zake ni zipi?" },
            { label: "Studio Photography", prompt: "Nataka kufanya photoshoot ya studio. Packages ni zipi?" },
            { label: "Podcast & Livestream", prompt: "Nina podcast ninataka kurekodi studio, vifaa na bei zikoje?" },
            { label: "Graphic Design & Branding", prompt: "Mnatoa huduma za cover art, posters na branding?" },
            { label: "Book Studio Sasa", prompt: "Nataka kufanya booking ya studio ya Khaki Media." },
          ].map((topic, i) => (
            <button
              key={i}
              onClick={() => {
                handleSend(topic.prompt);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className="flex w-full text-left truncate rounded-xl px-3 py-2 text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-all active:scale-98"
            >
              <span className="truncate">{topic.label}</span>
            </button>
          ))}
        </div>

        {/* Sidebar Footer: Admin & WhatsApp */}
        <div className="p-3 border-t border-white/[0.08] space-y-2 safe-bottom">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4 text-[#D4AF37]" />
            <span>Admin / API Settings</span>
          </Link>

          <a
            href={`https://wa.me/${KHAKI_CONFIG.contact.whatsappNumber}?text=${encodeURIComponent(
              "Habari Khaki Media 👋 Naomba kuwasiliana na studio manager."
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp Studio</span>
          </a>
        </div>
      </aside>

      {/* 2. Main Chat Canvas */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between px-4 z-20 apple-glass border-b border-white/[0.06] safe-top">
          <div className="flex items-center gap-2.5">
            <TooltipIconButton
              tooltip={sidebarOpen ? "Funga Sidebar" : "Fungua Sidebar"}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </TooltipIconButton>

            <div className="flex items-center gap-2">
              <KhakiLogo size="sm" isThinking={isLoading} isStreaming={isStreaming} />
              <div>
                <span className="text-sm font-semibold tracking-tight text-white block leading-tight">
                  {KHAKI_CONFIG.assistantName}
                </span>
                <span className="text-[10px] text-zinc-400 hidden sm:block">
                  Khaki Media Official Assistant
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-medium text-[#F5D061] border border-[#D4AF37]/25 ml-1">
                <Sparkles className="h-2.5 w-2.5" />
                Studio AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEmpty && (
              <button
                onClick={handleReset}
                title="Mazungumzo Mapya"
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all active:scale-95"
              >
                <MessageSquarePlus className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span className="hidden sm:inline">Mazungumzo Mapya</span>
              </button>
            )}

            <Link
              href="/admin"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white hover:border-[#D4AF37]/50 transition-colors"
              title="Admin Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* 3. Messages Viewport or Empty State */}
        <div
          ref={viewportRef}
          className="flex-1 overflow-y-auto px-4 pt-3 pb-6 flex flex-col scroll-smooth"
        >
          {isEmpty ? (
            /* Centered Welcome Empty State (Apple HIG Style) */
            <div className="flex flex-1 flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto my-auto animate-fade-in pb-12">
              {/* Official Khaki Media Logo with Generative Aura */}
              <div className="mb-6 relative group">
                <KhakiLogo
                  size="xl"
                  isThinking={false}
                  showSoundwaves={true}
                  className="transition-transform duration-500 hover:scale-105"
                />
              </div>

              {/* Title & Branding */}
              <div className="space-y-2 mb-8">
                <span className="text-[11px] font-bold tracking-[0.25em] text-[#D4AF37] uppercase">
                  {KHAKI_CONFIG.brandName}
                </span>
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                  <span>{userName ? `Karibu tena, ${userName}` : "Ungependa kutengeneza nini leo?"}</span>
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                  {userName
                    ? "Naweza kukusaidia kuhusu huduma, bei, studio specs, au kuweka booking ya haraka."
                    : "Msaidizi wako rasmi wa studio ya kurekodi muziki, kutengeneza video za 4K, podcasts na picha."}
                </p>
              </div>

              {/* Quick Action Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-xl">
                {KHAKI_CONFIG.quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleSend(action.prompt)}
                    className="flex items-center gap-2 rounded-full apple-glass px-4 py-2 text-xs font-medium text-zinc-300 transition-all hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/15 hover:text-white active:scale-95 shadow-sm"
                  >
                    <span className="text-[#D4AF37]">✦</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Conversation Thread */
            <div className="mx-auto w-full max-w-3xl space-y-6 pt-2 pb-8">
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                const isLast = index === messages.length - 1;

                if (isUser) {
                  return (
                    <div
                      key={message.id}
                      className="group relative flex w-full flex-col items-end gap-1.5 animate-slide-up"
                    >
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-[24px] bg-[#1f1f23] px-5 py-3 text-[15px] leading-relaxed text-[#f5f5f7] border border-white/[0.08] shadow-apple-glass select-text">
                        {message.content}
                      </div>

                      {/* User Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipIconButton
                          tooltip="Nakili"
                          onClick={() => handleCopy(message.id, message.content)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                        >
                          {copiedId === message.id ? (
                            <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <CopyIcon className="h-3.5 w-3.5" />
                          )}
                        </TooltipIconButton>
                      </div>
                    </div>
                  );
                }

                // Assistant Message
                return (
                  <div
                    key={message.id}
                    className="relative flex w-full gap-3.5 animate-slide-up group"
                  >
                    {/* Official Khaki Logo Avatar */}
                    <div className="shrink-0 mt-0.5">
                      <KhakiLogo
                        size="sm"
                        isThinking={isLast && isLoading}
                        isStreaming={isLast && isStreaming}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Markdown Text */}
                      <div className="prose prose-invert max-w-none text-[15px] leading-7 text-zinc-100 prose-p:my-2 prose-headings:text-white prose-strong:text-[#F5D061] prose-code:rounded-lg prose-code:bg-white/10 prose-code:px-2 prose-code:py-0.5 prose-code:text-xs prose-code:text-[#D4AF37] prose-ul:my-2 prose-li:my-0.5">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>

                        {/* Blinking Typing Cursor like ChatGPT / Gemini */}
                        {isLast && isStreaming && (
                          <span className="inline-block h-4 w-2 translate-y-0.5 ml-1 animate-pulse bg-[#D4AF37] rounded-xs" />
                        )}
                      </div>

                      {/* Embedded Interactive Booking Card if intent detected */}
                      {message.bookingDetails?.isReadyForBooking && (
                        <BookingCard
                          booking={message.bookingDetails}
                          onUpdateBooking={handleUpdateBooking}
                        />
                      )}

                      {/* ChatGPT / Apple Assistant Action Bar */}
                      <div className="flex items-center gap-1 pt-2 text-zinc-400">
                        <TooltipIconButton
                          tooltip="Nakili ujumbe"
                          onClick={() => handleCopy(message.id, message.content)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                        >
                          {copiedId === message.id ? (
                            <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <CopyIcon className="h-3.5 w-3.5" />
                          )}
                        </TooltipIconButton>

                        <TooltipIconButton
                          tooltip="Jibu zuri"
                          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </TooltipIconButton>

                        <TooltipIconButton
                          tooltip="Jibu lisiloridhisha"
                          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </TooltipIconButton>

                        <TooltipIconButton
                          tooltip={speakingMessageId === message.id ? "Sitisha kusoma" : "Soma kwa sauti"}
                          onClick={() => toggleSpeak(message.id, message.content)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                        >
                          {speakingMessageId === message.id ? (
                            <VolumeX className="h-3.5 w-3.5 text-[#D4AF37] animate-pulse" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                        </TooltipIconButton>

                        <TooltipIconButton
                          tooltip="Hamisha kama Markdown"
                          onClick={() => handleExportMarkdown(message.content)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </TooltipIconButton>

                        <TooltipIconButton
                          tooltip="Rudia kutengeneza jibu"
                          onClick={() => {
                            const lastUser = [...messages]
                              .reverse()
                              .find((m) => m.role === "user");
                            if (lastUser) handleSend(lastUser.content);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <RefreshCwIcon className="h-3.5 w-3.5" />
                        </TooltipIconButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Apple Liquid Glass Floating Composer */}
        <div className="shrink-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-2 px-4 safe-pb-composer">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2">
            {/* Pill Container */}
            <div className="group flex w-full flex-col rounded-[32px] apple-glass-composer px-3 py-2 transition-all duration-300 focus-within:border-[#D4AF37]/60 focus-within:ring-2 focus-within:ring-[#D4AF37]/25 shadow-card">
              <div className="flex items-end gap-1.5">
                {/* Plus Attachment */}
                <TooltipIconButton
                  tooltip="Ongeza faili au maelezo"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                </TooltipIconButton>

                {/* Auto-growing Textarea */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    isEmpty && !userName
                      ? "Andika jina lako kuanza au uliza chochote kuhusu Khaki Media..."
                      : "Uliza kuhusu huduma, bei, studio au weka booking..."
                  }
                  className="max-h-48 min-h-10 flex-1 resize-none bg-transparent py-2 px-1 text-[15px] text-[#f5f5f7] outline-none placeholder:text-zinc-500 scrollbar-none"
                  style={{ height: "40px" }}
                />

                {/* Right actions: Mic + 24K Gold Send Button */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {/* Mic Dictation */}
                  <TooltipIconButton
                    tooltip={isDictating ? "Sitisha kurekodi" : "Ongea kwa sauti"}
                    onClick={toggleDictation}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                      isDictating
                        ? "bg-red-500 text-white animate-pulse"
                        : "text-zinc-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {isDictating ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </TooltipIconButton>

                  {/* Send or Stop */}
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={() => abortControllerRef.current?.abort()}
                      title="Sitisha jibu"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-white hover:bg-zinc-600 transition-all active:scale-95"
                    >
                      <div className="h-3 w-3 rounded-xs bg-current" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!input.trim() || isLoading}
                      onClick={() => handleSend()}
                      title="Tuma ujumbe (Enter)"
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                        input.trim() && !isLoading
                          ? "bg-gradient-to-tr from-[#D4AF37] to-[#F5D061] text-black shadow-gold hover:brightness-110 active:scale-90 font-bold"
                          : "bg-white/10 text-zinc-600 cursor-not-allowed"
                      }`}
                    >
                      <ArrowUpIcon className="h-5 w-5 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Apple Minimal Disclaimer */}
            <p className="text-center text-[11px] text-zinc-500 leading-none py-1">
              Khaki AI inaweza kufanya makosa. Thibitisha taarifa zote na studio kupitia WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
