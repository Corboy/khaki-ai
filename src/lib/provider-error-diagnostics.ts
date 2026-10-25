const REDACTED = "[redacted API key]";

/** Remove credential-like values before provider diagnostics reach Worker logs. */
export function sanitizeProviderError(input: unknown): string {
  const message = input instanceof Error ? input.message : String(input);
  return message
    .replace(/\bAQ\.[A-Za-z0-9_-]{20,}\b/g, REDACTED)
    .replace(/\bAIza[A-Za-z0-9_-]{20,}\b/g, REDACTED)
    .replace(/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/g, REDACTED)
    .replace(/([?&](?:key|api_key|apikey)=)[^&\s]+/gi, `$1${REDACTED}`)
    .slice(0, 300);
}
