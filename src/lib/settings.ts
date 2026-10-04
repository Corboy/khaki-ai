import fs from "fs";
import path from "path";

export interface KhakiAppSettings {
  activeProvider: "auto" | "gemini" | "openai" | "builtin";
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  whatsappNumber: string;
  studioName: string;
}

const SETTINGS_FILE = path.join(process.cwd(), "src", "config", "runtime-settings.json");

export const DEFAULT_SETTINGS: KhakiAppSettings = {
  activeProvider: "auto",
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
  geminiModel: "gemini-2.5-flash",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: "gpt-4o-mini",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "255744000111",
  studioName: "Khaki Media",
};

export function getAppSettings(): KhakiAppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const fileData = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(fileData);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        // Fall back to env vars if file values are blank
        geminiApiKey: parsed.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
        openaiApiKey: parsed.openaiApiKey || process.env.OPENAI_API_KEY || "",
        whatsappNumber: parsed.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "255744000111",
      };
    }
  } catch (err) {
    console.error("Error reading runtime settings:", err);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveAppSettings(newSettings: Partial<KhakiAppSettings>): KhakiAppSettings {
  const current = getAppSettings();
  const updated: KhakiAppSettings = {
    ...current,
    ...newSettings,
  };

  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");

    // Also update runtime process.env for convenience
    if (updated.geminiApiKey) {
      process.env.GEMINI_API_KEY = updated.geminiApiKey;
    }
    if (updated.openaiApiKey) {
      process.env.OPENAI_API_KEY = updated.openaiApiKey;
    }
  } catch (err) {
    console.error("Error saving runtime settings:", err);
    throw err;
  }

  return updated;
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "";
  const prefix = key.slice(0, 5);
  const suffix = key.slice(-4);
  return `${prefix}••••••••••••${suffix}`;
}
