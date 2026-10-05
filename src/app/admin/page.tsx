"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  CircleDot,
  KeyRound,
  Loader2,
  Plug,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  SecretField,
  SegmentedField,
  SelectField,
  SettingsGroup,
  SettingsRow,
  SliderField,
  TextAreaField,
  TextField,
} from "@/components/admin/fields";
import { AmbientBackdrop } from "@/components/brand/ambient-backdrop";
import { KhakiMark } from "@/components/brand/khaki-mark";
import { IconButton } from "@/components/ui/icon-button";
import { KHAKI_CONFIG } from "@/config/khaki";
import type { PromptCost } from "@/lib/system-prompt";
import type { ProviderId, PublicSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface GeminiModel {
  id: string;
  label: string;
}

/** Option shape the settings controls expect. */
interface ModelOption {
  value: string;
  label: string;
}

interface TestResult {
  ok: boolean;
  model?: string;
  ms?: number;
  reply?: string;
  error?: string;
}

interface FormState {
  activeProvider: ProviderId;
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  temperature: number;
  maxOutputTokens: number;
  customInstructions: string;
  whatsappNumber: string;
  studioName: string;
}

const EMPTY_FORM: FormState = {
  activeProvider: "gemini",
  geminiApiKey: "",
  geminiModel: "gemini-3.5-flash",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  temperature: 0.7,
  maxOutputTokens: 2048,
  customInstructions: "",
  whatsappNumber: KHAKI_CONFIG.contact.whatsappNumber,
  studioName: KHAKI_CONFIG.brandName,
};

function toForm(settings: PublicSettings): FormState {
  return {
    activeProvider: settings.activeProvider,
    geminiApiKey: settings.geminiKey.configured ? settings.geminiKey.masked : "",
    geminiModel: settings.geminiModel,
    openaiApiKey: settings.openaiKey.configured ? settings.openaiKey.masked : "",
    openaiModel: settings.openaiModel,
    temperature: settings.temperature,
    maxOutputTokens: settings.maxOutputTokens,
    customInstructions: settings.customInstructions,
    whatsappNumber: settings.whatsappNumber,
    studioName: settings.studioName,
  };
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminPage() {
  const [authState, setAuthState] = useState<"checking" | "denied" | "granted">("checking");
  const [authReason, setAuthReason] = useState<string | null>(null);
  const [tokenRequired, setTokenRequired] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);
  /** The prompt as the server renders it, without the custom-instruction block. */
  const [promptBase, setPromptBase] = useState("");
  const [promptCost, setPromptCost] = useState<PromptCost | null>(null);

  const [models, setModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testing, setTesting] = useState<ProviderId | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);

  /* ---- auth ------------------------------------------------------ */

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/session", { cache: "no-store" });
      const data = (await response.json()) as { authorised: boolean; reason?: string };
      setAuthReason(data.reason ?? null);
      setAuthState(data.authorised ? "granted" : "denied");
      return data.authorised;
    } catch {
      setAuthState("denied");
      setAuthReason("Imeshindwa kuwasiliana na server.");
      return false;
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  /* ---- load ------------------------------------------------------ */

  const loadSettings = useCallback(async () => {
    const response = await fetch("/api/admin/settings", { cache: "no-store" });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setNotice({ tone: "warn", text: data.error ?? "Imeshindwa kupakua mipangilio." });
      return;
    }
    const data = (await response.json()) as {
      settings: PublicSettings;
      tokenRequired: boolean;
      prompt?: { text: string; cost: PromptCost };
    };
    setSettings(data.settings);
    setForm(toForm(data.settings));
    setTokenRequired(data.tokenRequired);
    if (data.prompt) {
      setPromptBase(data.prompt.text);
      setPromptCost(data.prompt.cost);
    }
    setDirty(false);
  }, []);

  useEffect(() => {
    if (authState === "granted") void loadSettings();
  }, [authState, loadSettings]);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const response = await fetch("/api/admin/models", { cache: "no-store" });
      const data = (await response.json()) as { models?: GeminiModel[]; error?: string };
      if (data.models?.length) {
        setModels(
          data.models.map((model) => ({
            value: model.id,
            label: `${model.id} — ${model.label}`,
          })),
        );
      } else if (data.error) {
        setNotice({ tone: "warn", text: data.error });
      }
    } catch {
      setNotice({ tone: "warn", text: "Imeshindwa kupakua orodha ya models." });
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    if (authState === "granted") void loadModels();
  }, [authState, loadModels]);

  /* ---- mutations ------------------------------------------------- */

  const patch = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setNotice(null);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as {
        settings?: PublicSettings;
        saved?: boolean;
        error?: string;
      };

      if (!response.ok || !data.settings) {
        setNotice({ tone: "warn", text: data.error ?? "Imeshindwa kuhifadhi." });
        return;
      }

      setSettings(data.settings);
      setForm(toForm(data.settings));
      setDirty(false);
      setNotice({ tone: "ok", text: "Mipangilio imehifadhiwa." });
    } catch {
      setNotice({ tone: "warn", text: "Imeshindwa kuhifadhi mipangilio." });
    } finally {
      setSaving(false);
    }
  }, [form]);

  const runTest = useCallback(
    async (provider: "gemini" | "openai") => {
      setTesting(provider);
      setTestResult(null);
      try {
        const response = await fetch("/api/admin/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            apiKey: provider === "gemini" ? form.geminiApiKey : form.openaiApiKey,
            model: provider === "gemini" ? form.geminiModel : form.openaiModel,
          }),
        });
        setTestResult((await response.json()) as TestResult);
      } catch {
        setTestResult({ ok: false, error: "Imeshindwa kuwasiliana na server." });
      } finally {
        setTesting(null);
      }
    },
    [form.geminiApiKey, form.geminiModel, form.openaiApiKey, form.openaiModel],
  );

  const signIn = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput }),
      });
      if (response.ok) {
        setTokenInput("");
        const granted = await checkSession();
        if (granted) setNotice({ tone: "ok", text: "Umeingia." });
      } else {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setAuthReason(data.error ?? "Token si sahihi.");
      }
    },
    [tokenInput, checkSession],
  );

  /**
   * The server renders the price list and rules; the panel appends the live
   * value of the instructions textarea. That keeps the preview responsive while
   * the knowledge base itself never reaches the browser.
   */
  const previewPrompt = useMemo(() => {
    const custom = form.customInstructions.trim();
    if (!custom) return promptBase;
    return `${promptBase}\n\n---\n\n# MAELEKEZO YA ZIADA KUTOKA KWA TIMU\n\n${custom}`;
  }, [promptBase, form.customInstructions]);

  /* ---- render ---------------------------------------------------- */

  if (authState === "checking") {
    return (
      <CenteredShell>
        <Loader2 className="h-5 w-5 animate-spin text-gold-500" />
      </CenteredShell>
    );
  }

  if (authState === "denied") {
    return (
      <CenteredShell>
        <div className="material-regular w-full max-w-sm rounded-2xl p-6">
          <ShieldCheck className="h-6 w-6 text-gold-400" />
          <h1 className="mt-4 text-[19px] font-semibold tracking-[-0.02em] text-white">
            Mipangilio imelindwa
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
            {authReason ?? "Weka token ya admin ili kuendelea."}
          </p>
          <form onSubmit={signIn} className="mt-5 flex gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="ADMIN_TOKEN"
              aria-label="ADMIN_TOKEN"
              autoComplete="current-password"
              className="h-11 flex-1 rounded-xl border border-white/[0.09] bg-white/[0.05] px-3.5 font-mono text-[14px] text-ink outline-none focus:border-gold-500/45"
            />
            <button
              type="submit"
              className="h-11 shrink-0 rounded-xl brass-fill metal-sweep px-4 text-[14px] font-semibold text-black active:scale-95"
            >
              Ingia
            </button>
          </form>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-ink-3 transition-colors hover:text-gold-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Rudi kwenye chat
          </Link>
        </div>
      </CenteredShell>
    );
  }

  const geminiModels: ModelOption[] = models;

  return (
    <div className="relative min-h-[100dvh] pb-28">
      <AmbientBackdrop intensity="quiet" />

      {/* Header */}
      <header className="safe-top sticky top-0 z-30 border-b border-white/[0.055] bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            aria-label="Rudi kwenye chat"
            className="grid h-9 w-9 place-items-center rounded-[10px] text-ink-3 transition duration-1 ease-fluid hover:bg-white/[0.07] hover:text-ink active:scale-90"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
          <KhakiMark size={30} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-semibold leading-tight tracking-[-0.02em] text-white">
              Mipangilio
            </h1>
            <p className="text-[12.5px] leading-tight text-ink-3">
              Khaki AI · {form.studioName}
            </p>
          </div>
          {tokenRequired && (
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11.5px] font-medium text-emerald-300 sm:inline-flex">
              <ShieldCheck className="h-3 w-3" /> Imelindwa
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-7 px-4 py-6">
        <StatusCard settings={settings} form={form} />

        {!settings?.writable && (
          <Notice
            tone="warn"
            icon={<AlertTriangle className="h-4 w-4" />}
            text="Server hii hairuhusu kuandika faili, kwa hiyo mabadiliko hayatahifadhiwa. Weka GEMINI_API_KEY na ADMIN_TOKEN kwenye environment variables badala yake."
          />
        )}

        <SettingsGroup
          title="Mtoa huduma"
          description="Ni model gani inayojibu maswali ya wateja."
        >
          <SegmentedField<ProviderId>
            label="Inayotumika"
            value={form.activeProvider}
            onChange={(value) => patch("activeProvider", value)}
            options={[
              { value: "gemini", label: "Google Gemini", description: "Inapendekezwa" },
              { value: "openai", label: "OpenAI", description: "Kama unatumia GPT" },
              { value: "builtin", label: "Bila AI", description: "Majibu ya msingi tu" },
            ]}
          />
        </SettingsGroup>

        <SettingsGroup
          title="Google Gemini"
          description="Key inasomwa kutoka data/runtime-settings.json au GEMINI_API_KEY."
        >
          <SecretField
            label="API key"
            hint={
              settings?.geminiKey.source === "env"
                ? "Inatoka kwenye environment variable."
                : settings?.geminiKey.source === "file"
                  ? "Imehifadhiwa kwenye panel hii."
                  : "Hakuna key iliyowekwa."
            }
            value={form.geminiApiKey}
            onChange={(value) => patch("geminiApiKey", value)}
            placeholder="AQ.Ab8…"
            configured={Boolean(settings?.geminiKey.configured)}
            onClear={() => patch("geminiApiKey", "")}
          />
          <SelectField
            label="Model"
            hint="Orodha inasomwa moja kwa moja kutoka Google."
            value={form.geminiModel}
            onChange={(value) => patch("geminiModel", value)}
            options={geminiModels}
            loading={loadingModels}
            action={
              <IconButton
                label="Sasisha orodha ya models"
                size="lg"
                onClick={() => void loadModels()}
                className="border border-white/[0.08]"
              >
                <RefreshCw className={cn("h-4 w-4", loadingModels && "animate-spin")} />
              </IconButton>
            }
          />
          <TestRow
            label="Pima muunganisho"
            hint="Inatuma swali dogo moja kwa moja kwa Google."
            busy={testing === "gemini"}
            onTest={() => void runTest("gemini")}
          />
          {testResult && <TestOutput result={testResult} />}
        </SettingsGroup>

        <SettingsGroup
          title="OpenAI"
          description="Hiari. Tumia tu kama unataka kulinganisha majibu."
        >
          <SecretField
            label="API key"
            hint={
              settings?.openaiKey.source === "env"
                ? "Inatoka kwenye environment variable."
                : settings?.openaiKey.source === "file"
                  ? "Imehifadhiwa kwenye panel hii."
                  : "Hakuna key iliyowekwa."
            }
            value={form.openaiApiKey}
            onChange={(value) => patch("openaiApiKey", value)}
            placeholder="sk-…"
            configured={Boolean(settings?.openaiKey.configured)}
            onClear={() => patch("openaiApiKey", "")}
          />
          <TextField
            label="Model"
            value={form.openaiModel}
            onChange={(value) => patch("openaiModel", value)}
            placeholder="gpt-4o-mini"
          />
          <TestRow
            label="Pima muunganisho"
            hint="Inathibitisha key kabla ya kuitumia."
            busy={testing === "openai"}
            onTest={() => void runTest("openai")}
          />
        </SettingsGroup>

        <SettingsGroup
          title="Tabia ya AI"
          description="Inabadilisha jinsi Khaki AI inavyojibu — kasi, urefu, na maelekezo ya ziada."
        >
          <SliderField
            label="Ubunifu (temperature)"
            hint="Chini = makini na sahihi. Juu = mazungumzo huru."
            value={form.temperature}
            onChange={(value) => patch("temperature", value)}
            min={0}
            max={1.5}
            step={0.05}
            format={(value) => value.toFixed(2)}
          />
          <SliderField
            label="Urefu wa jibu"
            hint="Kiwango cha juu cha tokens kwa jibu moja."
            value={form.maxOutputTokens}
            onChange={(value) => patch("maxOutputTokens", value)}
            min={512}
            max={8192}
            step={256}
          />
          <TextAreaField
            label="Maelekezo ya ziada"
            hint="Yanaongezwa juu ya maelekezo ya msingi ya studio. Mfano: ofa za mwezi huu, au kitu kingine cha kuzingatia."
            value={form.customInstructions}
            onChange={(value) => patch("customInstructions", value)}
            placeholder="Mfano: Mwezi huu kuna punguzo la 10% kwa session za Jumatatu hadi Jumatano."
            rows={4}
            maxLength={4000}
          />
        </SettingsGroup>

        <SettingsGroup title="Studio" description="Taarifa hizi zinaonekana kwenye chat na kwenye kadi ya booking.">
          <TextField
            label="Namba ya WhatsApp"
            hint="Namba kamili ya kimataifa bila + au nafasi. Mfano 255744000111."
            value={form.whatsappNumber}
            onChange={(value) => patch("whatsappNumber", value)}
            inputMode="tel"
            placeholder="255744000111"
          />
          <TextField
            label="Jina la studio"
            value={form.studioName}
            onChange={(value) => patch("studioName", value)}
            placeholder="Khaki Media"
          />
        </SettingsGroup>

        <PromptPreview prompt={previewPrompt} cost={promptCost} />
      </main>

      {/*
        A <footer>, not a <div>.

        This is the save bar and its status line, pinned to the bottom of the
        page. Nothing else in the document covers it, so as a plain div its
        contents sat outside every landmark -- axe flagged the status text with
        "all page content should be contained by landmarks", which is exactly
        what it is for: a screen reader's landmark list is how someone skips
        around a page, and this was the one thing they could not skip to.
      */}
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-black/72 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4">
          <div className="min-w-0 flex-1">
            {notice ? (
              <p
                className={cn(
                  "flex items-center gap-1.5 truncate text-[13px]",
                  notice.tone === "ok" ? "text-emerald-300" : "text-amber-300",
                )}
                role="status"
              >
                {notice.tone === "ok" ? (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                )}
                {notice.text}
              </p>
            ) : (
              <p
                className={cn(
                  "truncate text-[13px]",
                  settings?.writable ? "text-ink-3" : "text-amber-300",
                )}
              >
                {/*
                 * On a read-only host the honesty has to reach the footer too.
                 *
                 * This said "Kila kitu kimehifadhiwa" — everything is saved —
                 * while the notice directly above it said changes would not be
                 * saved. Both were on screen at once, in the panel whose entire
                 * job is telling an operator what happened. The condition now
                 * matches the warning rather than ignoring it.
                 */}
                {dirty
                  ? "Kuna mabadiliko ambayo hayajahifadhiwa."
                  : settings?.writable
                    ? "Kila kitu kimehifadhiwa."
                    : "Hakuna kinachohifadhiwa kwenye server hii."}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void save()}
            /*
             * No button on a host that cannot save. Offering one that is
             * guaranteed to fail teaches the operator to distrust the panel --
             * and the warning above already explains why there is nothing to
             * press. Same reasoning as the thumbs buttons that were removed.
             */
            disabled={saving || !dirty || !settings?.writable}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5",
              "text-[14.5px] font-semibold transition duration-2 ease-fluid active:scale-[0.97]",
              dirty && settings?.writable
                ? "brass-fill metal-sweep text-black shadow-gold"
                : "cursor-not-allowed bg-white/[0.06] text-ink-4",
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Hifadhi
          </button>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function CenteredShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-[100dvh] place-items-center px-4">
      <AmbientBackdrop intensity="quiet" />
      {children}
    </div>
  );
}

/** Tells the operator, at a glance, whether the assistant can actually think. */
function StatusCard({
  settings,
  form,
}: {
  settings: PublicSettings | null;
  form: FormState;
}) {
  const keyConfigured =
    form.activeProvider === "gemini"
      ? Boolean(settings?.geminiKey.configured)
      : form.activeProvider === "openai"
        ? Boolean(settings?.openaiKey.configured)
        : true;

  const live = form.activeProvider !== "builtin" && keyConfigured;
  const model =
    form.activeProvider === "openai" ? form.openaiModel : form.geminiModel;

  return (
    <div
      className={cn(
        "anim-rise flex items-center gap-3 rounded-2xl px-4 py-3.5",
        live ? "material-gold" : "surface-card",
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full",
          live ? "bg-gold-500/14 text-gold-300" : "bg-amber-400/12 text-amber-300",
        )}
      >
        {live ? <Sparkles className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
          <CircleDot className={cn("h-3 w-3", live ? "text-emerald-400" : "text-amber-400")} />
          {live ? "AI inafanya kazi" : "AI haijaunganishwa"}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
          {live
            ? `${form.activeProvider === "openai" ? "OpenAI" : "Gemini"} · ${model}`
            : "Weka API key hapa chini ili Khaki AI ijibu kwa akili kamili."}
        </p>
      </div>
    </div>
  );
}

function TestRow({
  label,
  hint,
  busy,
  onTest,
}: {
  label: string;
  hint: string;
  busy: boolean;
  onTest: () => void;
}) {
  return (
    <SettingsRow label={label} hint={hint}>
      <button
        type="button"
        onClick={onTest}
        disabled={busy}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-xl px-4",
          "border border-white/[0.09] bg-white/[0.04] text-[14px] font-medium text-ink",
          "transition duration-2 ease-fluid hover:border-gold-500/35 hover:text-gold-200",
          "active:scale-[0.97] disabled:opacity-50",
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
        Pima key
      </button>
    </SettingsRow>
  );
}

function TestOutput({ result }: { result: TestResult }) {
  return (
    <div className="px-4 pb-3.5">
      <div
        className={cn(
          "rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed",
          result.ok
            ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200"
            : "border-red-400/25 bg-red-400/[0.06] text-red-200",
        )}
        role="status"
      >
        {result.ok ? (
          <>
            <p className="font-medium">
              Key inafanya kazi · {result.model}
              {result.ms ? ` · ${result.ms}ms` : ""}
            </p>
            {result.reply && <p className="mt-1 text-ink-2">“{result.reply}”</p>}
          </>
        ) : (
          <p className="whitespace-pre-wrap">{result.error}</p>
        )}
      </div>
    </div>
  );
}

function Notice({
  tone,
  icon,
  text,
}: {
  tone: "ok" | "warn";
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[13px] leading-relaxed",
        tone === "ok"
          ? "border-emerald-400/22 bg-emerald-400/[0.06] text-emerald-200"
          : "border-amber-400/22 bg-amber-400/[0.06] text-amber-200",
      )}
      role="status"
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p>{text}</p>
    </div>
  );
}

/**
 * The exact prompt the model receives — collapsed by default.
 *
 * The cost readout matters more than it looks: this text is sent on every
 * message a customer sends, so a bloated prompt is a recurring bill, not a
 * one-off. The section list shows which part is responsible.
 */
function PromptPreview({ prompt, cost }: { prompt: string; cost: PromptCost | null }) {
  const [open, setOpen] = useState(false);

  const sections = cost?.sections ?? [];
  const biggest = Math.max(1, ...sections.map((section) => section.characters));

  return (
    <SettingsGroup
      title="Maelekezo ya msingi"
      description="Haya ni maelekezo kamili ambayo Khaki AI anapewa kabla ya kila mazungumzo, pamoja na gharama yake."
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-1 hover:bg-white/[0.025]"
      >
        <Wand2 className="h-4 w-4 shrink-0 text-gold-400" />
        <span className="flex-1 text-[14px] font-medium text-ink">
          {open ? "Funga maelekezo" : "Onyesha maelekezo"}
        </span>
        <span className="tnum text-[12px] text-ink-4">
          {prompt.length.toLocaleString()} herufi
          {cost ? ` · ~${cost.tokens.toLocaleString()} token` : ""}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-ink-3 transition-transform duration-2",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          {sections.length > 0 && (
            <div className="border-t border-white/[0.055] px-4 py-3">
              <p className="mb-2 text-[11.5px] text-ink-4">
                Tokeni hizi zinatumwa kwenye <span className="text-ink-2">kila</span> ujumbe wa
                mteja. Sehemu kubwa zaidi ndiyo ya kupunguza kwanza.
              </p>
              <ul className="flex flex-col gap-1.5">
                {[...sections]
                  .sort((a, b) => b.characters - a.characters)
                  .map((section) => (
                    <li key={section.title} className="flex items-center gap-2.5">
                      <span className="w-[46%] shrink-0 truncate text-[12px] text-ink-2">
                        {section.title}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <span
                          className="block h-full rounded-full brass-fill"
                          style={{ width: `${Math.max(4, (section.characters / biggest) * 100)}%` }}
                        />
                      </span>
                      <span className="tnum w-12 shrink-0 text-right text-[11.5px] text-ink-4">
                        {section.characters.toLocaleString()}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <pre className="max-h-96 overflow-auto border-t border-white/[0.055] bg-black/40 px-4 py-3.5 font-mono text-[12px] leading-relaxed text-ink-2 whitespace-pre-wrap">
            {prompt}
          </pre>
        </>
      )}
    </SettingsGroup>
  );
}
