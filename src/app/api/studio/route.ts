import { KHAKI_CONFIG } from "@/config/khaki";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public studio details the browser needs.
 *
 * The WhatsApp number and studio name are editable in /admin, so the chat has
 * to read them at runtime rather than baking them in at build time — otherwise
 * the settings panel would save values nothing ever uses.
 */
export async function GET() {
  const settings = getSettings();

  return Response.json(
    {
      whatsappNumber: settings.whatsappNumber.replace(/[^0-9]/g, ""),
      displayPhone: KHAKI_CONFIG.contact.displayPhone,
      studioName: settings.studioName,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
