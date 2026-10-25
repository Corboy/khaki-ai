import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { proxyPreviewChat } from "@/lib/preview-chat-proxy";

test("preview chat forwards unchanged requests to the production Worker binding", async () => {
  const payload = JSON.stringify({ messages: [{ role: "user", parts: [{ type: "text", text: "Habari" }] }] });
  const request = new Request("https://ui-chatgpt-style-refresh-khaki-ai.workers.dev/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-test": "preserve-me" },
    body: payload,
  });
  const expected = new Response("stream", { headers: { "x-khaki-provider": "gemini" } });
  let forwarded: Request | undefined;

  const response = await proxyPreviewChat(request, {
    KHAKI_PREVIEW_CHAT_PROXY: "1",
    WORKER_SELF_REFERENCE: {
      fetch: async (upstream) => {
        forwarded = upstream;
        return expected;
      },
    },
  });

  assert.equal(response, expected);
  assert.ok(forwarded);
  assert.equal(forwarded.url, request.url);
  assert.equal(forwarded.method, "POST");
  assert.equal(forwarded.headers.get("x-test"), "preserve-me");
  assert.equal(await forwarded.text(), payload);
});

test("production and local requests do not use the preview proxy", async () => {
  let called = false;
  const response = await proxyPreviewChat(new Request("https://local.test/api/chat"), {
    KHAKI_PREVIEW_CHAT_PROXY: undefined,
    WORKER_SELF_REFERENCE: {
      fetch: async () => {
        called = true;
        return new Response("unexpected");
      },
    },
  });

  assert.equal(response, null);
  assert.equal(called, false);
});

test("preview fails closed when the production binding is missing", async () => {
  const response = await proxyPreviewChat(new Request("https://preview.test/api/chat"), {
    KHAKI_PREVIEW_CHAT_PROXY: "1",
  });
  assert.equal(response?.status, 503);
});

test("Worker Previews use the production chat binding without copying provider secrets", () => {
  const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
  assert.equal(config.previews.vars.KHAKI_PREVIEW_CHAT_PROXY, "1");
  assert.ok(
    config.previews.services.some(
      (binding: { binding: string; service: string }) =>
        binding.binding === "WORKER_SELF_REFERENCE" && binding.service === "khaki-ai",
    ),
  );
});
