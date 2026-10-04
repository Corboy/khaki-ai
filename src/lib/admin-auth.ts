import { timingSafeEqual } from "node:crypto";

/**
 * Access control for the studio settings panel.
 *
 * Khaki AI is deployed in two shapes and both have to be safe by default:
 *
 *  · **Local / self-hosted** — no `ADMIN_TOKEN` set. Requests from loopback
 *    are trusted so the operator can open /admin on the studio machine.
 *  · **Deployed** — set `ADMIN_TOKEN` in the environment. Every admin request
 *    must then present that token, and loopback is no longer special.
 *
 * With no token configured on a public host, admin routes refuse everything
 * rather than falling open.
 */

export const ADMIN_COOKIE = "khaki_admin";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export interface AdminCheck {
  ok: boolean;
  /** Why access was refused — safe to show an operator. */
  reason?: string;
  /** How the caller authenticated, for audit logging. */
  via?: "token" | "loopback";
}

function configuredToken(): string {
  return process.env.ADMIN_TOKEN?.trim() ?? "";
}

/** Constant-time comparison so the token cannot be probed by timing. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * True when the request was addressed to this machine.
 *
 * Only the `Host` header is trusted, and only when it is a loopback name. A
 * proxy that fronts a public domain passes that domain through as `Host`, so
 * this cannot be reached from outside even when `x-forwarded-for` claims
 * 127.0.0.1.
 */
function isLoopback(req: Request): boolean {
  const host = req.headers.get("host") ?? "";
  const hostname = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function checkAdmin(req: Request): AdminCheck {
  const token = configuredToken();

  if (token) {
    const header = req.headers.get("x-khaki-admin")?.trim();
    const cookie = readCookie(req.headers.get("cookie"), ADMIN_COOKIE)?.trim();
    const provided = header || cookie;

    if (provided && safeEqual(provided, token)) return { ok: true, via: "token" };
    return {
      ok: false,
      reason: "Token ya admin si sahihi au haipo. Ingia tena kwenye /admin.",
    };
  }

  if (isLoopback(req)) return { ok: true, via: "loopback" };

  return {
    ok: false,
    reason:
      "Mipangilio imezuiwa. Weka ADMIN_TOKEN kwenye environment variables ili kuiruhusu kwenye server hii.",
  };
}

/** True when the deployment has no token and is therefore local-only. */
export function adminTokenConfigured(): boolean {
  return Boolean(configuredToken());
}

export function verifyToken(candidate: string): boolean {
  const token = configuredToken();
  if (!token) return false;
  return safeEqual(candidate.trim(), token);
}

export function buildAdminCookie(token: string): string {
  const attributes = [
    `${ADMIN_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${COOKIE_MAX_AGE}`,
  ];
  if (process.env.NODE_ENV === "production" && process.env.KHAKI_SECURE_COOKIES !== "false") {
    attributes.push("Secure");
  }
  return attributes.join("; ");
}

export function clearAdminCookie(): string {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Standard 401 body for admin routes. */
export function unauthorized(check: AdminCheck): Response {
  return Response.json(
    { error: check.reason ?? "Hauna ruhusa." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
