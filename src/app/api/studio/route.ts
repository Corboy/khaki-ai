import { formatPhone, KHAKI_CONFIG } from "@/config/khaki";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public studio details the browser needs.
 *
 * The WhatsApp number and studio name are editable in /admin, so the chat has
 * to read them at runtime rather than baking them in at build time — otherwise
 * the settings panel would save values nothing ever uses.
 *
 * The displayed number is formatted from the same value as the link, not from
 * the build-time constant. It used to be the constant, which meant that
 * changing the number in /admin moved every WhatsApp link to the new line and
 * left the number printed beside it on the old one.
 */
export async function GET() {
  const settings = getSettings();

  return Response.json(
    {
      whatsappNumber: settings.whatsappNumber.replace(/[^0-9]/g, ""),
      displayPhone: formatPhone(settings.whatsappNumber) || KHAKI_CONFIG.contact.displayPhone,
      studioName: settings.studioName,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
