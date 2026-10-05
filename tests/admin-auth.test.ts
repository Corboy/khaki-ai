import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  ADMIN_COOKIE,
  adminTokenConfigured,
  buildAdminCookie,
  checkAdmin,
  clearAdminCookie,
  unauthorized,
  verifyToken,
} from "@/lib/admin-auth";

/**
 * Tests for admin access control.
 *
 * This guards the panel that holds the API keys, and it had no tests at all.
 * The interesting cases are the ones where a mistake opens the door rather
 * than closing it: a proxy header claiming to be loopback, a token compared
 * with `===` instead of constant time, a missing token on a public host
 * falling open because nobody thought about it.
 */

const ORIGINAL = process.env.ADMIN_TOKEN;

beforeEach(() => {
  delete process.env.ADMIN_TOKEN;
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ADMIN_TOKEN;
  else process.env.ADMIN_TOKEN = ORIGINAL;
});

/** A request as an admin route would see it. */
function request(headers: Record<string, string>): Request {
  return new Request("http://example.test/api/admin/settings", { headers });
}

describe("with no token configured (local install)", () => {
  it("trusts loopback", () => {
    for (const host of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000", "LOCALHOST"]) {
      const check = checkAdmin(request({ host }));
      assert.equal(check.ok, true, `${host} should be trusted`);
      assert.equal(check.via, "loopback");
    }
  });

  it("refuses a public host rather than falling open", () => {
    const check = checkAdmin(request({ host: "khaki.example.com" }));
    assert.equal(check.ok, false);
    assert.match(check.reason ?? "", /ADMIN_TOKEN/);
  });

  it("refuses a public host even when the request claims to come from loopback", () => {
    /*
     * The whole point of trusting Host rather than X-Forwarded-For. A proxy in
     * front of a public domain passes the domain through as Host, so a forged
     * forwarding header must not be enough to reach the settings panel.
     */
    const check = checkAdmin(
      request({
        host: "khaki.example.com",
        "x-forwarded-for": "127.0.0.1",
        "x-real-ip": "127.0.0.1",
        "x-forwarded-host": "localhost",
      }),
    );
    assert.equal(check.ok, false);
  });

  it("reports that no token is set", () => {
    assert.equal(adminTokenConfigured(), false);
  });
});

describe("with a token configured (deployed)", () => {
  const TOKEN = "s3cret-studio-token";

  beforeEach(() => {
    process.env.ADMIN_TOKEN = TOKEN;
  });

  it("reports that a token is set", () => {
    assert.equal(adminTokenConfigured(), true);
  });

  it("accepts the token in the header", () => {
    const check = checkAdmin(request({ host: "khaki.example.com", "x-khaki-admin": TOKEN }));
    assert.equal(check.ok, true);
    assert.equal(check.via, "token");
  });

  it("accepts the token in the cookie", () => {
    const check = checkAdmin(
      request({ host: "khaki.example.com", cookie: `${ADMIN_COOKIE}=${TOKEN}` }),
    );
    assert.equal(check.ok, true);
    assert.equal(check.via, "token");
  });

  it("ignores surrounding whitespace", () => {
    assert.equal(checkAdmin(request({ "x-khaki-admin": `  ${TOKEN}  ` })).ok, true);
  });

  it("refuses a wrong token", () => {
    const check = checkAdmin(request({ host: "localhost:3000", "x-khaki-admin": "nope" }));
    assert.equal(check.ok, false);
  });

  it("refuses a token that is merely a prefix", () => {
    assert.equal(checkAdmin(request({ "x-khaki-admin": TOKEN.slice(0, -1) })).ok, false);
    assert.equal(checkAdmin(request({ "x-khaki-admin": `${TOKEN}x` })).ok, false);
  });

  it("refuses an empty token", () => {
    assert.equal(checkAdmin(request({ host: "localhost:3000", "x-khaki-admin": "" })).ok, false);
  });

  it("does not grant loopback access once a token is set", () => {
    // Setting a token is a deliberate act; it applies everywhere, including
    // the studio machine.
    assert.equal(checkAdmin(request({ host: "localhost:3000" })).ok, false);
    assert.equal(checkAdmin(request({ host: "127.0.0.1:3000" })).ok, false);
  });

  it("reports a reason an operator can act on", () => {
    const check = checkAdmin(request({ host: "localhost:3000" }));
    assert.equal(check.ok, false);
    assert.ok((check.reason ?? "").length > 10);
  });

  it("reads a cookie that contains an equals sign", () => {
    const value = "abc=def";
    process.env.ADMIN_TOKEN = value;
    const check = checkAdmin(request({ cookie: `${ADMIN_COOKIE}=${encodeURIComponent(value)}` }));
    assert.equal(check.ok, true);
  });

  it("finds the admin cookie among others", () => {
    const check = checkAdmin(
      request({ cookie: `theme=dark; ${ADMIN_COOKIE}=${TOKEN}; other=1` }),
    );
    assert.equal(check.ok, true);
  });

  it("does not mistake a similarly named cookie for the real one", () => {
    const check = checkAdmin(request({ cookie: `not_${ADMIN_COOKIE}=${TOKEN}` }));
    assert.equal(check.ok, false);
  });
});

describe("verifyToken", () => {
  it("is false when no token is configured", () => {
    assert.equal(verifyToken("anything"), false);
  });

  it("checks against the configured token", () => {
    process.env.ADMIN_TOKEN = "correct";
    assert.equal(verifyToken("correct"), true);
    assert.equal(verifyToken("correct "), true, "trailing whitespace is trimmed");
    assert.equal(verifyToken("wrong"), false);
    assert.equal(verifyToken(""), false);
  });
});

describe("cookies", () => {
  it("sets HttpOnly, SameSite and Path on the admin cookie", () => {
    const cookie = buildAdminCookie("tok");
    assert.ok(cookie.includes(`${ADMIN_COOKIE}=tok`));
    assert.ok(cookie.includes("HttpOnly"), "the token must not be readable from script");
    assert.ok(cookie.includes("SameSite=Lax"), "the cookie must not ride cross-site requests");
    assert.ok(cookie.includes("Path=/"));
    assert.ok(cookie.includes("Max-Age="));
  });

  it("encodes a token that would otherwise break the cookie", () => {
    const cookie = buildAdminCookie("a;b=c");
    assert.ok(!cookie.includes("a;b=c"), "the value must be encoded, not pasted raw");
    assert.ok(cookie.includes(encodeURIComponent("a;b=c")));
  });

  it("clears the cookie by expiring it", () => {
    const cleared = clearAdminCookie();
    assert.ok(cleared.includes(`${ADMIN_COOKIE}=;`));
    assert.ok(cleared.includes("Max-Age=0"));
    assert.ok(cleared.includes("HttpOnly"));
  });
});

describe("unauthorized", () => {
  it("answers 401 and keeps the reason", async () => {
    const response = unauthorized({ ok: false, reason: "Sababu maalum" });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const body = (await response.json()) as { error: string };
    assert.equal(body.error, "Sababu maalum");
  });

  it("falls back to a generic message rather than leaking nothing useful", async () => {
    const body = (await unauthorized({ ok: false }).json()) as { error: string };
    assert.ok(body.error.length > 0);
  });
});
