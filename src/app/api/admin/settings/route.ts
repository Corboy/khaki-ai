import { NextRequest } from "next/server";
import { z } from "zod";

import { adminTokenConfigured, checkAdmin, unauthorized } from "@/lib/admin-auth";
import {
  getPublicSettings,
  SettingsWriteError,
  updateSettings,
  type ProviderId,
} from "@/lib/settings";
import { buildSystemPrompt, measurePrompt } from "@/lib/system-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const settingsPatchSchema = z.object({
  activeProvider: z.enum(["gemini", "openai", "builtin"]).optional(),
  geminiApiKey: z.string().max(400).optional(),
  geminiModel: z.string().max(120).optional(),
  openaiApiKey: z.string().max(400).optional(),
  openaiModel: z.string().max(120).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().min(256).max(8192).optional(),
  customInstructions: z.string().max(4000).optional(),
  whatsappNumber: z
    .string()
    .regex(/^[0-9+\s()-]{7,20}$/, "Namba ya WhatsApp si sahihi")
    .optional(),
  studioName: z.string().max(80).optional(),
});

/**
 * Current settings, secrets masked — plus the system prompt.
 *
 * The prompt is rendered here rather than in the browser: the admin panel used
 * to import `buildSystemPrompt` directly, which shipped the entire price list
 * and FAQ set to the client as JavaScript, and regenerated on every keystroke.
 * One render on the server serves both purposes.
 */
export async function GET(req: NextRequest) {
  const check = checkAdmin(req);
  if (!check.ok) return unauthorized(check);

  const settings = getPublicSettings();

  /*
   * The prompt is rendered here, not in the browser. The admin panel used to
   * import `buildSystemPrompt` directly, which shipped the whole price list and
   * FAQ set to the client as JavaScript and re-rendered it on every keystroke.
   *
   * `text` deliberately excludes the custom instructions: the panel appends the
   * textarea's live value itself, so the preview still updates as you type
   * while the price list stays on the server. `cost` measures what is actually
   * sent — base plus custom instructions.
   */
  return Response.json(
    {
      settings,
      tokenRequired: adminTokenConfigured(),
      via: check.via,
      prompt: {
        text: buildSystemPrompt(),
        cost: measurePrompt({ customInstructions: settings.customInstructions }),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Saves a settings patch. */
export async function POST(req: NextRequest) {
  const check = checkAdmin(req);
  if (!check.ok) return unauthorized(check);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Ombi si sahihi." }, { status: 400 });
  }

  const parsed = settingsPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Taarifa si sahihi." },
      { status: 400 },
    );
  }

  // A field that still shows the mask means "leave the stored key alone".
  const patch = { ...parsed.data };
  if (patch.geminiApiKey?.includes("••")) delete patch.geminiApiKey;
  if (patch.openaiApiKey?.includes("••")) delete patch.openaiApiKey;

  try {
    const settings = updateSettings({
      ...patch,
      activeProvider: patch.activeProvider as ProviderId | undefined,
    });
    return Response.json({ settings, saved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SettingsWriteError) {
      return Response.json({ error: error.message, saved: false }, { status: 409 });
    }
    console.error("[khaki] failed to save settings:", error);
    return Response.json({ error: "Imeshindwa kuhifadhi mipangilio." }, { status: 500 });
  }
}
