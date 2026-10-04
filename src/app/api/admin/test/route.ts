import { NextRequest } from "next/server";
import { z } from "zod";

import { checkAdmin, unauthorized } from "@/lib/admin-auth";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const testSchema = z.object({
  provider: z.enum(["gemini", "openai"]),
  /** Omit to test the stored key; supply to test one before saving it. */
  apiKey: z.string().max(400).optional(),
  model: z.string().max(120).optional(),
});

/**
 * Proves a key works by making one small live call.
 *
 * The key is never echoed back. If the panel sends the masked placeholder —
 * which happens whenever the field is untouched — the stored key is used
 * instead, because testing a mask can only ever fail.
 */
export async function POST(req: NextRequest) {
  const check = checkAdmin(req);
  if (!check.ok) return unauthorized(check);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Ombi si sahihi." }, { status: 400 });
  }

  const parsed = testSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Taarifa si sahihi." }, { status: 400 });
  }

  const settings = getSettings();
  const supplied = parsed.data.apiKey?.trim();
  const usable = supplied && !supplied.includes("••") ? supplied : "";

  const apiKey = usable || (parsed.data.provider === "gemini" ? settings.geminiApiKey : settings.openaiApiKey);
  const model =
    parsed.data.model?.trim() ||
    (parsed.data.provider === "gemini" ? settings.geminiModel : settings.openaiModel);

  if (!apiKey) {
    return Response.json(
      { ok: false, error: "Hakuna API key ya kumpima. Weka key kwanza." },
      { status: 200 },
    );
  }

  const started = Date.now();

  try {
    const reply =
      parsed.data.provider === "gemini"
        ? await testGemini(apiKey, model)
        : await testOpenAI(apiKey, model);

    return Response.json(
      {
        ok: true,
        model,
        ms: Date.now() - started,
        reply: reply.slice(0, 400),
        usingStoredKey: !usable,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        model,
        ms: Date.now() - started,
        error: error instanceof Error ? error.message : "Imeshindwa kumpima key.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

async function testGemini(apiKey: string, model: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Sema kwa Kiswahili: 'Habari kutoka Khaki Media!'" }] }],
        generationConfig: { maxOutputTokens: 64, temperature: 0.4 },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    },
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Google (${response.status}): ${describeGoogleError(text)}`);
  }

  const payload = JSON.parse(text) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return (
    payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ||
    "(jibu tupu)"
  );
}

async function testOpenAI(apiKey: string, model: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Sema kwa Kiswahili: 'Habari kutoka Khaki Media!'" }],
      max_tokens: 64,
      temperature: 0.4,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI (${response.status}): ${text.slice(0, 200)}`);
  }

  const payload = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content?.trim() || "(jibu tupu)";
}

function describeGoogleError(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return parsed.error?.message ?? body.slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
}
