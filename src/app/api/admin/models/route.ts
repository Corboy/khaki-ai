import { NextRequest } from "next/server";

import { checkAdmin, unauthorized } from "@/lib/admin-auth";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GoogleModel {
  name?: string;
  displayName?: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
}

/**
 * Lists the Gemini models the stored key can actually call.
 *
 * The admin panel offers this live list instead of a hardcoded dropdown, so a
 * model rename upstream never leaves the panel pointing at something the API
 * has retired.
 */
export async function GET(req: NextRequest) {
  const check = checkAdmin(req);
  if (!check.ok) return unauthorized(check);

  const settings = getSettings();
  if (!settings.geminiApiKey) {
    return Response.json({ models: [], error: "Hakuna Gemini API key." }, { status: 200 });
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
      {
        headers: { "x-goog-api-key": settings.geminiApiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      return Response.json(
        { models: [], error: `Google imekataa ombi (${response.status}): ${detail.slice(0, 200)}` },
        { status: 200 },
      );
    }

    const payload = (await response.json()) as { models?: GoogleModel[] };
    const models = (payload.models ?? [])
      .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
      .map((model) => ({
        id: (model.name ?? "").replace("models/", ""),
        label: model.displayName ?? model.name ?? "",
        description: model.description ?? "",
        inputLimit: model.inputTokenLimit ?? 0,
        outputLimit: model.outputTokenLimit ?? 0,
      }))
      .filter(
        (model) =>
          model.id &&
          // Chat models only — skip image, TTS, robotics and agent previews.
          !/(image|tts|robotics|computer-use|antigravity|deep-research|lyria|gemma|transcribe|omni)/i.test(
            model.id,
          ),
      )
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    return Response.json({ models }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[khaki] model list failed:", error);
    return Response.json(
      { models: [], error: "Imeshindwa kuwasiliana na Google." },
      { status: 200 },
    );
  }
}
