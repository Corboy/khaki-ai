import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

/**
 * Tests for runtime settings.
 *
 * Two things matter here and neither is visible in the UI. First: this module
 * holds the API keys, so `getPublicSettings` must never hand the real key to
 * the browser, whatever shape the stored value has. Second: the file layer
 * overrides the environment, and getting that order wrong means an operator
 * edits /admin, sees it save, and nothing changes.
 *
 * `SETTINGS_PATH` is read when the module loads, so the temp path is set first
 * and the module imported afterwards.
 */

const dir = mkdtempSync(join(tmpdir(), "khaki-settings-"));
const settingsFile = join(dir, "runtime-settings.json");

process.env.KHAKI_SETTINGS_PATH = settingsFile;

const settings = await import("@/lib/settings");

/*
 * A synthetic key with the right shape and none of the right characters.
 *
 * The first version of this file used the studio's real key as a fixture, and
 * `pnpm audit:studio` failed the build for it — the check that looks for
 * credential fragments in the source caught the person writing the test. That
 * is the check working: a real key must never be committed, tests included.
 */
const REAL_KEY = "test-key-0123456789abcdefghijklmnopqrstuvwxyz";

function writeSettings(values: Record<string, unknown>) {
  writeFileSync(settingsFile, JSON.stringify(values, null, 2), "utf8");
}

before(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

/* ------------------------------------------------------------------ */

describe("masking", () => {
  it("keeps the shape an operator recognises and nothing else", () => {
    const masked = settings.maskKey(REAL_KEY);
    assert.ok(masked.startsWith("test-"), "the prefix identifies which key it is");
    assert.ok(masked.endsWith("wxyz"));
    assert.ok(masked.includes("•"));
    assert.ok(!masked.includes(REAL_KEY.slice(5, -4)), "the middle must be gone");
  });

  it("masks a short key down to two characters", () => {
    assert.equal(settings.maskKey("abcdefghij"), "ab••••");
    assert.equal(settings.maskKey("ab"), "ab••••");
  });

  it("does not pretend an empty value is a key", () => {
    assert.equal(settings.maskKey(""), "");
    assert.equal(settings.maskKey("   "), "");
  });

  it("never returns the input unchanged", () => {
    for (const key of [REAL_KEY, "short", "a".repeat(200)]) {
      assert.notEqual(settings.maskKey(key), key);
    }
  });
});

describe("what the browser is allowed to see", () => {
  it("never includes the real key", () => {
    writeSettings({ geminiApiKey: REAL_KEY, openaiApiKey: `sk-test-${"x".repeat(40)}` });

    const publicSettings = settings.getPublicSettings();
    const serialised = JSON.stringify(publicSettings);

    assert.ok(!serialised.includes(REAL_KEY), "the Gemini key must not be in the payload");
    assert.ok(!serialised.includes("x".repeat(40)), "the OpenAI key must not be in the payload");
    assert.equal(publicSettings.geminiKey.configured, true);
    assert.equal(publicSettings.geminiKey.source, "file");
  });

  it("reports a key from the environment as coming from the environment", () => {
    rmSync(settingsFile, { force: true });
    process.env.GEMINI_API_KEY = REAL_KEY;
    try {
      const publicSettings = settings.getPublicSettings();
      assert.equal(publicSettings.geminiKey.configured, true);
      assert.equal(publicSettings.geminiKey.source, "env");
      assert.ok(!JSON.stringify(publicSettings).includes(REAL_KEY));
    } finally {
      delete process.env.GEMINI_API_KEY;
    }
  });

  it("reports nothing configured when there is no key anywhere", () => {
    rmSync(settingsFile, { force: true });
    const publicSettings = settings.getPublicSettings();
    assert.equal(publicSettings.geminiKey.configured, false);
    assert.equal(publicSettings.geminiKey.source, "none");
    assert.equal(publicSettings.geminiKey.masked, "");
  });
});

describe("layering", () => {
  it("lets the file override the environment", () => {
    writeSettings({ studioName: "Kutoka Faili", whatsappNumber: "255700000000" });
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "255711111111";
    try {
      const current = settings.getSettings();
      assert.equal(current.studioName, "Kutoka Faili");
      assert.equal(current.whatsappNumber, "255700000000");
    } finally {
      delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    }
  });

  it("falls back to the environment when the file is silent", () => {
    rmSync(settingsFile, { force: true });
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "255711111111";
    try {
      assert.equal(settings.getSettings().whatsappNumber, "255711111111");
    } finally {
      delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    }
  });

  it("falls back to the config file when neither is set", () => {
    rmSync(settingsFile, { force: true });
    const current = settings.getSettings();
    assert.ok(current.whatsappNumber.length > 0);
    assert.equal(current.studioName, "Khaki Media");
  });

  it("survives a corrupt settings file rather than failing to boot", () => {
    writeFileSync(settingsFile, "{ this is not json", "utf8");
    const current = settings.getSettings();
    assert.equal(current.geminiModel, settings.DEFAULT_MODEL);
  });
});

describe("saving", () => {
  it("writes a patch without losing the key that was already stored", () => {
    writeSettings({ geminiApiKey: REAL_KEY, temperature: 0.7 });
    settings.updateSettings({ temperature: 1.2 });

    const onDisk = JSON.parse(readFileSync(settingsFile, "utf8"));
    assert.equal(onDisk.temperature, 1.2);
    assert.equal(onDisk.geminiApiKey, REAL_KEY, "an unrelated edit must not drop the key");
  });

  it("clears the file override when the key is set to empty", () => {
    writeSettings({ geminiApiKey: REAL_KEY });
    settings.updateSettings({ geminiApiKey: "" });
    const onDisk = JSON.parse(readFileSync(settingsFile, "utf8"));
    assert.equal(onDisk.geminiApiKey, undefined, "empty means fall back to the environment");
  });

  it("trims a key before storing it", () => {
    settings.updateSettings({ geminiApiKey: `  ${REAL_KEY}  ` });
    const onDisk = JSON.parse(readFileSync(settingsFile, "utf8"));
    assert.equal(onDisk.geminiApiKey, REAL_KEY);
  });

  it("keeps temperature inside its bounds", () => {
    settings.updateSettings({ temperature: 99 });
    assert.equal(settings.getSettings().temperature, 2);
    settings.updateSettings({ temperature: -5 });
    assert.equal(settings.getSettings().temperature, 0);
  });

  it("keeps the output token cap inside its bounds", () => {
    settings.updateSettings({ maxOutputTokens: 1 });
    assert.equal(settings.getSettings().maxOutputTokens, 256);
    settings.updateSettings({ maxOutputTokens: 999_999 });
    assert.equal(settings.getSettings().maxOutputTokens, 8192);
  });

  it("rounds a fractional token cap", () => {
    settings.updateSettings({ maxOutputTokens: 1000.7 });
    assert.equal(settings.getSettings().maxOutputTokens, 1001);
  });

  it("returns the public projection, still without the key", () => {
    settings.updateSettings({ geminiApiKey: REAL_KEY });
    const returned = settings.updateSettings({ temperature: 0.5 });
    assert.ok(!JSON.stringify(returned).includes(REAL_KEY));
  });
});

describe("which provider answers", () => {
  const base = { ...settings.getSettings() };

  it("uses the requested provider when it has a key", () => {
    const resolved = settings.resolveProvider({ ...base, activeProvider: "gemini", geminiApiKey: "g" });
    assert.equal(resolved.provider, "gemini");
    assert.equal(resolved.apiKey, "g");
    assert.equal(resolved.fallbackReason, undefined);
  });

  it("honours the built-in provider without a key", () => {
    const resolved = settings.resolveProvider({ ...base, activeProvider: "builtin" });
    assert.equal(resolved.provider, "builtin");
    assert.equal(resolved.apiKey, "");
  });

  it("degrades to Gemini when OpenAI is selected but has no key", () => {
    const resolved = settings.resolveProvider({
      ...base,
      activeProvider: "openai",
      openaiApiKey: "",
      geminiApiKey: "g",
    });
    assert.equal(resolved.provider, "gemini");
    assert.ok(resolved.fallbackReason, "the operator should be told why");
    assert.match(resolved.fallbackReason!, /OpenAI/);
  });

  it("degrades to OpenAI when Gemini is selected but has no key", () => {
    const resolved = settings.resolveProvider({
      ...base,
      activeProvider: "gemini",
      geminiApiKey: "",
      openaiApiKey: "o",
    });
    assert.equal(resolved.provider, "openai");
  });

  it("falls back to the built-in responder when nothing has a key", () => {
    const resolved = settings.resolveProvider({
      ...base,
      activeProvider: "gemini",
      geminiApiKey: "",
      openaiApiKey: "",
    });
    assert.equal(resolved.provider, "builtin");
  });

  it("ignores a key that is only whitespace", () => {
    const resolved = settings.resolveProvider({
      ...base,
      activeProvider: "gemini",
      geminiApiKey: "   ",
      openaiApiKey: "o",
    });
    assert.equal(resolved.provider, "openai", "whitespace is not a key");
  });
});
