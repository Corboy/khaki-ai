import { NextRequest } from "next/server";

import {
  buildAdminCookie,
  checkAdmin,
  clearAdminCookie,
  unauthorized,
  verifyToken,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports whether the caller may open the settings panel. */
export async function GET(req: NextRequest) {
  const check = checkAdmin(req);
  return Response.json(
    { authorised: check.ok, via: check.via ?? null, reason: check.reason ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Signs in with the admin token by storing it in an HttpOnly cookie. */
export async function POST(req: NextRequest) {
  let token = "";
  try {
    const body = (await req.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token : "";
  } catch {
    return Response.json({ error: "Ombi si sahihi." }, { status: 400 });
  }

  if (!token.trim()) {
    return Response.json({ error: "Weka token kwanza." }, { status: 400 });
  }
  if (!verifyToken(token)) {
    return Response.json({ error: "Token si sahihi." }, { status: 401 });
  }

  return Response.json(
    { authorised: true },
    { headers: { "Set-Cookie": buildAdminCookie(token), "Cache-Control": "no-store" } },
  );
}

/** Signs out. */
export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req).ok && !req.headers.get("cookie")) {
    return unauthorized({ ok: false });
  }
  return Response.json(
    { authorised: false },
    { headers: { "Set-Cookie": clearAdminCookie(), "Cache-Control": "no-store" } },
  );
}
