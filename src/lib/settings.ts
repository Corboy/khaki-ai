import fs from "node:fs";
import path from "node:path";

import { KHAKI_CONFIG } from "@/config/khaki";

/**
 * Runtime settings for Khaki AI.
 *
 * Priority order for every value:
 *   1. `data/runtime-settings.json` (written by the admin panel)
 *   2. environment variable (.env.local / Vercel project settings)
 *   3. built-in default
 *
 * The file is the editable layer; env vars are the deploy-time layer. On a
 * read-only host (Vercel) the admin panel detects the failure and tells the
 * operator to use environment variables instead of silently losing the value.
 */

export type ProviderId = "gemini" | "openai" | "builtin";

export interface AppSettings {
  activeProvider: ProviderId;
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  temperature: number;
  maxOutputTokens: number;
  /** Appended to the generated system prompt by the admin panel */
  customInstructions: string;
  whatsappNumber: string;
  studioName: string;
}

/** The shape sent to the browser — secrets are never included. */
export interface PublicSettings {
  activeProvider: ProviderId;
  geminiModel: string;
  openaiModel: string;
  temperature: number;
  maxOutputTokens: number;
  customInstructions: string;
  whatsappNumber: string;
  studioName: string;
  geminiKey: KeyStatus;
  openaiKey: KeyStatus;
  /** True when the JSON file can be written on this host */
  writable: boolean;
}

export interface KeyStatus {
  configured: boolean;
  /** e.g. "AQ.Ab8••••••••Qo5g" */
  masked: string;
  /** Where the value came from */
  source: "file" | "env" | "none";
}

/**
 * Default model.
 *
 * Chosen on measured latency for a real studio enquiry: 4.6s end to end with a
 * tool call, against 39s for the newest model's default thinking budget. The
 * chat route still offers the whole chain as fallbacks, so this only sets which
 * one is tried first.
 */
export const DEFAULT_MODEL = "gemini-3.5-flash";

const DEFAULTS: AppSettings = {
  activeProvider: "gemini",
  geminiApiKey: "",
  geminiModel: DEFAULT_MODEL,
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  temperature: 0.7,
  maxOutputTokens: 2048,
  customInstructions: "",
  // Derived from the one config file, so the studio number is not written twice.
  whatsappNumber: KHAKI_CONFIG.contact.whatsappNumber,
  studioName: KHAKI_CONFIG.brandName,
};

export const SETTINGS_PATH =
  process.env.KHAKI_SETTINGS_PATH || path.join(process.cwd(), "data", "runtime-settings.json");

const ENV_GEMINI = () =>
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const ENV_OPENAI = () => process.env.OPENAI_API_KEY || "";

function readFileLayer(): Partial<AppSettings> {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return {};
    const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch (error) {
    console.error("[khaki] could not read runtime settings:", error);
    return {};
  }
}

/** Full settings, secrets included. Never send this to the browser. */
export function getSettings(): AppSettings {
  const file = readFileLayer();

  return {
    ...DEFAULTS,
    ...file,
    geminiApiKey: file.geminiApiKey?.trim() || ENV_GEMINI(),
    openaiApiKey: file.openaiApiKey?.trim() || ENV_OPENAI(),
    whatsappNumber:
      file.whatsappNumber?.trim() ||
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
      DEFAULTS.whatsappNumber,
    studioName: file.studioName?.trim() || DEFAULTS.studioName,
  };
}

function keySource(fileValue: string | undefined): KeyStatus["source"] {
  if (fileValue?.trim()) return "file";
  return "none";
}

export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 10) return `${trimmed.slice(0, 2)}••••`;
  return `${trimmed.slice(0, 5)}••••••••••••${trimmed.slice(-4)}`;
}

function statusOf(
  value: string,
  fileValue: string | undefined,
  envValue: string,
): KeyStatus {
  if (fileValue?.trim()) {
    return { configured: true, masked: maskKey(fileValue), source: "file" };
  }
  if (envValue.trim()) {
    return { configured: true, masked: maskKey(envValue), source: "env" };
  }
  return { configured: Boolean(value.trim()), masked: maskKey(value), source: "none" };
}

export function isWritable(): boolean {
  try {
    const dir = path.dirname(SETTINGS_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/** Safe projection for the admin UI. */
export function getPublicSettings(): PublicSettings {
  const file = readFileLayer();
  const settings = getSettings();

  return {
    activeProvider: settings.activeProvider,
    geminiModel: settings.geminiModel,
    openaiModel: settings.openaiModel,
    temperature: settings.temperature,
    maxOutputTokens: settings.maxOutputTokens,
    customInstructions: settings.customInstructions,
    whatsappNumber: settings.whatsappNumber,
    studioName: settings.studioName,
    geminiKey: statusOf(settings.geminiApiKey, file.geminiApiKey, ENV_GEMINI()),
    openaiKey: statusOf(settings.openaiApiKey, file.openaiApiKey, ENV_OPENAI()),
    writable: isWritable(),
  };
}

export class SettingsWriteError extends Error {}

/**
 * Merges a patch into the settings file.
 *
 * An empty string for a key field means "remove the file override and fall back
 * to the environment", which is what the admin panel's Clear button sends.
 */
export function updateSettings(patch: Partial<AppSettings>): PublicSettings {
  const current = getSettings();
  const file = readFileLayer();

  const next: AppSettings = {
    ...current,
    ...patch,
    temperature: clamp(patch.temperature ?? current.temperature, 0, 2),
    maxOutputTokens: Math.round(
      clamp(patch.maxOutputTokens ?? current.maxOutputTokens, 256, 8192),
    ),
  };

  const nextFile: Record<string, unknown> = { ...file };

  if (patch.geminiApiKey !== undefined) {
    if (patch.geminiApiKey.trim()) nextFile.geminiApiKey = patch.geminiApiKey.trim();
    else delete nextFile.geminiApiKey;
  }
  if (patch.openaiApiKey !== undefined) {
    if (patch.openaiApiKey.trim()) nextFile.openaiApiKey = patch.openaiApiKey.trim();
    else delete nextFile.openaiApiKey;
  }

  nextFile.activeProvider = next.activeProvider;
  nextFile.geminiModel = next.geminiModel;
  nextFile.openaiModel = next.openaiModel;
  nextFile.temperature = next.temperature;
  nextFile.maxOutputTokens = next.maxOutputTokens;
  nextFile.customInstructions = next.customInstructions;
  nextFile.whatsappNumber = next.whatsappNumber;
  nextFile.studioName = next.studioName;

  try {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, `${JSON.stringify(nextFile, null, 2)}\n`, "utf8");
  } catch (error) {
    throw new SettingsWriteError(
      "Mipangilio haiwezi kuhifadhiwa kwenye server hii (filesystem ni read-only). " +
        "Weka GEMINI_API_KEY kwenye environment variables badala yake.",
      { cause: error },
    );
  }

  return getPublicSettings();
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Which provider actually answers, after resolving what is configured. */
export function resolveProvider(settings: AppSettings): {
  provider: ProviderId;
  apiKey: string;
  model: string;
  /** Set when the requested provider has no key and we degraded */
  fallbackReason?: string;
} {
  const wants = settings.activeProvider;

  if (wants === "gemini" && settings.geminiApiKey.trim()) {
    return { provider: "gemini", apiKey: settings.geminiApiKey.trim(), model: settings.geminiModel };
  }
  if (wants === "openai" && settings.openaiApiKey.trim()) {
    return { provider: "openai", apiKey: settings.openaiApiKey.trim(), model: settings.openaiModel };
  }
  if (wants === "builtin") {
    return { provider: "builtin", apiKey: "", model: "builtin" };
  }

  // Requested provider is unusable — degrade in a predictable order.
  if (settings.geminiApiKey.trim()) {
    return {
      provider: "gemini",
      apiKey: settings.geminiApiKey.trim(),
      model: settings.geminiModel,
      fallbackReason: `${wants} haina API key, tumetumia Gemini.`,
    };
  }
  if (settings.openaiApiKey.trim()) {
    return {
      provider: "openai",
      apiKey: settings.openaiApiKey.trim(),
      model: settings.openaiModel,
      fallbackReason: `${wants} haina API key, tumetumia OpenAI.`,
    };
  }
  return { provider: "builtin", apiKey: "", model: "builtin" };
}
