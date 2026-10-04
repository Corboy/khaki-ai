import { NextRequest } from "next/server";
import { z } from "zod";

import { adminTokenConfigured, checkAdmin, unauthorized } from "@/lib/admin-auth";
import {
  getPublicSettings,
  SettingsWriteError,
  updateSettings,
  type ProviderId,
} from "@/lib/settings";

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

/** Current settings, secrets masked. */
export async function GET(req: NextRequest) {
  const check = checkAdmin(req);
  if (!check.ok) return unauthorized(check);

  return Response.json(
    { settings: getPublicSettings(), tokenRequired: adminTokenConfigured(), via: check.via },
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
