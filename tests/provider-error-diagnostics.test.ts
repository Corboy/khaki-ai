import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sanitizeProviderError } from "@/lib/provider-error-diagnostics";

describe("sanitizeProviderError", () => {
  it("redacts Gemini authorization-key-shaped values", () => {
    const message = "403 PERMISSION_DENIED for AQ.fake_placeholder_key_12345678901234567890";
    const sanitized = sanitizeProviderError(message);
    assert.equal(sanitized.includes("AQ.fake_placeholder_key_12345678901234567890"), false);
    assert.match(sanitized, /\[redacted API key\]/);
    assert.match(sanitized, /403 PERMISSION_DENIED/);
  });

  it("redacts legacy-shaped tokens and key query parameters", () => {
    const legacyKey = `${"AI" + "za"}SyFakePlaceholderKey12345678901234567890`;
    const queryKey = "query_" + "secret_123";
    const message = `${legacyKey} https://example.test/?key=${queryKey}`;
    const sanitized = sanitizeProviderError(message);
    assert.equal(sanitized.includes(legacyKey), false);
    assert.equal(sanitized.includes(queryKey), false);
    assert.match(sanitized, /\[redacted API key\]/);
  });

  it("redacts OpenAI-style secret keys", () => {
    const projectKey = `sk-proj-${"FakePlaceholder".repeat(2)}_1234567890`;
    const sanitized = sanitizeProviderError(`401 Authorization failed: ${projectKey}`);
    assert.equal(sanitized.includes(projectKey), false);
    assert.match(sanitized, /\[redacted API key\]/);
  });

  it("bounds the message length", () => {
    assert.equal(sanitizeProviderError("x".repeat(500)).length, 300);
  });
});
