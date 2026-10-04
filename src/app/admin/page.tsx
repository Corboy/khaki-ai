"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  Key,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Cpu,
  Save,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sliders,
  Check,
} from "lucide-react";
import { KhakiLogo } from "@/components/ui/KhakiLogo";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingOpenai, setTestingOpenai] = useState(false);

  // Form state
  const [activeProvider, setActiveProvider] = useState<"auto" | "gemini" | "openai" | "builtin">("auto");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [whatsappNumber, setWhatsappNumber] = useState("255744000111");
  const [studioName, setStudioName] = useState("Khaki Media");

  // Show/Hide password toggles
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);

  // Status indicators from server
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Test results
  const [testResult, setTestResult] = useState<{ provider: string; ok: boolean; message: string } | null>(null);

  // Load current settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          setActiveProvider(data.activeProvider || "auto");
          setGeminiModel(data.geminiModel || "gemini-2.5-flash");
          setOpenaiModel(data.openaiModel || "gpt-4o-mini");
          setWhatsappNumber(data.whatsappNumber || "255744000111");
          setStudioName(data.studioName || "Khaki Media");
          setHasGeminiKey(data.hasGeminiKey);
          setHasOpenaiKey(data.hasOpenaiKey);
          if (data.maskedGeminiKey) setGeminiApiKey(data.maskedGeminiKey);
          if (data.maskedOpenaiKey) setOpenaiApiKey(data.maskedOpenaiKey);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeProvider,
          geminiApiKey,
          geminiModel,
          openaiApiKey,
          openaiModel,
          whatsappNumber,
          studioName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: "success", text: "Mipangilio imehifadhiwa kikamilifu!" });
        setHasGeminiKey(data.hasGeminiKey);
        setHasOpenaiKey(data.hasOpenaiKey);
      } else {
        setStatusMessage({ type: "error", text: data.error || "Imeshindwa kuhifadhi mipangilio." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Hitilafu ya mtandao." });
    } finally {
      setSaving(false);
    }
  };

  const handleTestKey = async (provider: "gemini" | "openai") => {
    if (provider === "gemini") setTestingGemini(true);
    if (provider === "openai") setTestingOpenai(true);
    setTestResult(null);

    try {
      const apiKey = provider === "gemini" ? geminiApiKey : openaiApiKey;
      const model = provider === "gemini" ? geminiModel : openaiModel;

      const res = await fetch("/api/admin/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, model }),
      });

      const data = await res.json();
      setTestResult({
        provider,
        ok: data.ok,
        message: data.ok ? data.message + ` (${data.reply})` : data.error,
      });
    } catch (err: any) {
      setTestResult({
        provider,
        ok: false,
        message: err.message || "Hitilafu wakati wa kupima API key.",
      });
    } finally {
      if (provider === "gemini") setTestingGemini(false);
      if (provider === "openai") setTestingOpenai(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <RefreshCw className="h-5 w-5 animate-spin text-[#D4AF37]" />
          <span>Inapakia mipangilio ya Khaki AI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7]">
      {/* macOS Style Glass Header */}
      <header className="sticky top-0 z-40 apple-glass border-b border-white/[0.08] safe-top">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-all hover:border-[#D4AF37]/50 hover:text-white active:scale-95"
              title="Rudi kwenye Chat"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <KhakiLogo size="sm" />
              <div>
                <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                  <span>Khaki AI System Settings</span>
                </h1>
                <p className="text-[11px] text-zinc-400">
                  Usimamizi wa API Keys, Model za AI & Nambari ya WhatsApp
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-1.5 text-xs font-medium text-[#F5D061] hover:bg-[#D4AF37]/20 transition-all active:scale-95"
          >
            <span>Fungua Chat</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 safe-bottom">
        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-2xl border p-4 text-xs ${
              statusMessage.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* Test Result Feedback */}
        {testResult && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 text-xs ${
              testResult.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            )}
            <div>
              <span className="font-semibold uppercase tracking-wider block mb-0.5">
                Jaribio la {testResult.provider}: {testResult.ok ? "Limefanikiwa" : "Limeshindwa"}
              </span>
              <span>{testResult.message}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: AI Engine Provider Selection */}
          <div className="rounded-[26px] apple-glass p-5 sm:p-6 shadow-card">
            <div className="flex items-center gap-2.5 mb-2">
              <Cpu className="h-5 w-5 text-[#D4AF37]" />
              <h2 className="text-sm font-semibold text-white">Chagua AI Engine Provider</h2>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Chagua huduma itakayozalisha majibu. Inapendekezwa kutumia Google Gemini au Otomatiki.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {[
                {
                  id: "auto",
                  title: "Otomatiki (Auto)",
                  desc: "Gemini → OpenAI → Built-in",
                },
                {
                  id: "gemini",
                  title: "Google Gemini",
                  desc: "Kasi na ubora wa juu",
                  configured: hasGeminiKey,
                },
                {
                  id: "openai",
                  title: "OpenAI",
                  desc: "GPT-4o & mini",
                  configured: hasOpenaiKey,
                },
                {
                  id: "builtin",
                  title: "Built-in Engine",
                  desc: "Bila API key",
                },
              ].map((p) => {
                const isSelected = activeProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveProvider(p.id as any)}
                    className={`flex flex-col text-left rounded-2xl p-4 border transition-all ${
                      isSelected
                        ? "border-[#D4AF37] bg-[#D4AF37]/10 ring-1 ring-[#D4AF37] shadow-gold text-white"
                        : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`text-xs font-semibold ${isSelected ? "text-[#F5D061]" : "text-white"}`}>
                        {p.title}
                      </span>
                      {isSelected && <span className="h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse" />}
                    </div>
                    <span className="text-[11px] text-zinc-400 leading-snug">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Google Gemini Configuration */}
          <div className="rounded-[26px] apple-glass p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-[#D4AF37]" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Google Gemini API</h3>
                  <p className="text-[11px] text-zinc-400">Model ya kisasa: gemini-2.5-flash / gemini-2.0-flash</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-medium px-3 py-1 rounded-full border ${
                  hasGeminiKey
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {hasGeminiKey ? "Imeunganishwa ✓" : "Haijawekwa"}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-zinc-300 font-medium block mb-1.5">
                  Gemini API Key
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showGemini ? "text" : "password"}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIzaSy... au weka Gemini API key"
                    className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 pr-24 text-white placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                  />
                  <div className="absolute right-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowGemini(!showGemini)}
                      className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                      title={showGemini ? "Ficha" : "Onyesha"}
                    >
                      {showGemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestKey("gemini")}
                      disabled={testingGemini || !geminiApiKey}
                      className="rounded-xl bg-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-[#F5D061] border border-white/10 hover:bg-[#D4AF37]/20 disabled:opacity-40 transition-all active:scale-95"
                    >
                      {testingGemini ? "Inapima..." : "Pima Key"}
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Pata key yako bila gharama kutoka{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#D4AF37] hover:underline"
                  >
                    Google AI Studio
                  </a>
                  .
                </p>
              </div>

              <div>
                <label className="text-zinc-300 font-medium block mb-1.5">Model ya Gemini</label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#161619] px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Inapendekezwa - Kasi na ubora wa juu)</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash (Kasi ya haraka zaidi)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Uchambuzi wa kina)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: OpenAI Configuration */}
          <div className="rounded-[26px] apple-glass p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Key className="h-5 w-5 text-[#D4AF37]" />
                <div>
                  <h3 className="text-sm font-semibold text-white">OpenAI API (Hiari)</h3>
                  <p className="text-[11px] text-zinc-400">Model za GPT-4o & GPT-4o-mini kama mbadala</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-medium px-3 py-1 rounded-full border ${
                  hasOpenaiKey
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {hasOpenaiKey ? "Imeunganishwa ✓" : "Haijawekwa"}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-zinc-300 font-medium block mb-1.5">
                  OpenAI API Key
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showOpenai ? "text" : "password"}
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 pr-24 text-white placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                  />
                  <div className="absolute right-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowOpenai(!showOpenai)}
                      className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                      title={showOpenai ? "Ficha" : "Onyesha"}
                    >
                      {showOpenai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestKey("openai")}
                      disabled={testingOpenai || !openaiApiKey}
                      className="rounded-xl bg-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-[#F5D061] border border-white/10 hover:bg-[#D4AF37]/20 disabled:opacity-40 transition-all active:scale-95"
                    >
                      {testingOpenai ? "Inapima..." : "Pima Key"}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-medium block mb-1.5">Model ya OpenAI</label>
                <select
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#161619] px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Kasi na gharama nafuu)</option>
                  <option value="gpt-4o">gpt-4o (Model kuu)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: WhatsApp & Studio Settings */}
          <div className="rounded-[26px] apple-glass p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-white/[0.06]">
              <Phone className="h-5 w-5 text-[#D4AF37]" />
              <div>
                <h3 className="text-sm font-semibold text-white">Nambari ya Booking ya WhatsApp</h3>
                <p className="text-[11px] text-zinc-400">
                  Nambari inayofunguka moja kwa moja mteja akibonyeza "Book kupitia WhatsApp"
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-zinc-300 font-medium block mb-1.5">
                  Nambari ya WhatsApp (Muundo wa Kimataifa)
                </label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="255744000111"
                  className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Mfano: 255744000111 (bila alama ya + au nafasi).
                </p>
              </div>

              <div>
                <label className="text-zinc-300 font-medium block mb-1.5">Jina Rasmi la Studio</label>
                <input
                  type="text"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  placeholder="Khaki Media"
                  className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all active:scale-95"
            >
              Ghairi
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F5D061] px-7 py-2.5 text-xs font-bold text-black shadow-gold hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Inahifadhi...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Hifadhi Mipangilio</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
