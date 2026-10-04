import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = getAppSettings();

    const provider = body.provider || "gemini";
    const apiKey = body.apiKey || (provider === "gemini" ? settings.geminiApiKey : settings.openaiApiKey);

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: `Tafadhali weka API key ya ${provider} kwanza.` },
        { status: 400 }
      );
    }

    if (provider === "gemini") {
      const model = body.model || settings.geminiModel || "gemini-1.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Sema 'Habari kutoka Khaki Media!'" }] }],
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return NextResponse.json({
          ok: false,
          error: errorData.error?.message || `Google Gemini API imeshindwa (Status ${res.status})`,
        });
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Mawasiliano yamefanikiwa!";

      return NextResponse.json({
        ok: true,
        message: "Google Gemini API key inafanya kazi vizuri!",
        reply,
      });
    } else if (provider === "openai") {
      const model = body.model || settings.openaiModel || "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Sema 'Habari kutoka Khaki Media!'" }],
          max_tokens: 30,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return NextResponse.json({
          ok: false,
          error: errorData.error?.message || `OpenAI API imeshindwa (Status ${res.status})`,
        });
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Mawasiliano yamefanikiwa!";

      return NextResponse.json({
        ok: true,
        message: "OpenAI API key inafanya kazi vizuri!",
        reply,
      });
    }

    return NextResponse.json({ ok: false, error: "Provider haijatambuliwa" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
