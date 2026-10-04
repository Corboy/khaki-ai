import { NextRequest, NextResponse } from "next/server";
import { getAppSettings, saveAppSettings, maskApiKey } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = getAppSettings();
    return NextResponse.json({
      activeProvider: settings.activeProvider,
      geminiModel: settings.geminiModel,
      openaiModel: settings.openaiModel,
      whatsappNumber: settings.whatsappNumber,
      studioName: settings.studioName,
      hasGeminiKey: Boolean(settings.geminiApiKey),
      hasOpenaiKey: Boolean(settings.openaiApiKey),
      maskedGeminiKey: maskApiKey(settings.geminiApiKey),
      maskedOpenaiKey: maskApiKey(settings.openaiApiKey),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      activeProvider,
      geminiApiKey,
      geminiModel,
      openaiApiKey,
      openaiModel,
      whatsappNumber,
      studioName,
    } = body;

    const updates: any = {};
    if (activeProvider !== undefined) updates.activeProvider = activeProvider;
    if (geminiModel !== undefined) updates.geminiModel = geminiModel;
    if (openaiModel !== undefined) updates.openaiModel = openaiModel;
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;
    if (studioName !== undefined) updates.studioName = studioName;

    // Only update API keys if provided (and not just masked string)
    if (geminiApiKey !== undefined && !geminiApiKey.includes("••••")) {
      updates.geminiApiKey = geminiApiKey.trim();
    }
    if (openaiApiKey !== undefined && !openaiApiKey.includes("••••")) {
      updates.openaiApiKey = openaiApiKey.trim();
    }

    const updated = saveAppSettings(updates);

    return NextResponse.json({
      success: true,
      message: "Mipangilio imehifadhiwa kikamilifu.",
      activeProvider: updated.activeProvider,
      geminiModel: updated.geminiModel,
      openaiModel: updated.openaiModel,
      whatsappNumber: updated.whatsappNumber,
      hasGeminiKey: Boolean(updated.geminiApiKey),
      hasOpenaiKey: Boolean(updated.openaiApiKey),
      maskedGeminiKey: maskApiKey(updated.geminiApiKey),
      maskedOpenaiKey: maskApiKey(updated.openaiApiKey),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
