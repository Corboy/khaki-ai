/**
 * Time to the first word a customer actually sees.
 *
 * There was already a way to measure the total response time, and it was wrong
 * in a way that produced a plausible number: it did `await response.text()`,
 * waited for the whole body, and only then walked the frames while
 * timestamping them. Every frame therefore looked like it arrived at the end,
 * and a streaming reply appeared to be a 17-second stare at "Inafikiria…".
 *
 * Read the body incrementally or the number means nothing. The measured
 * reality on the current prompt:
 *
 *   price question   first word 11.6s   complete 12.0s
 *   drone question   first word  5.7s   complete  6.1s
 *
 * Both served by gemini-3.5-flash, the first model in the chain — so the
 * failover path was not involved at all. The wait is model latency, not
 * fallback, and it is the number worth watching when the prompt changes.
 *
 * Usage:  pnpm measure:response "Bei zenu zikoje?"
 */

const APP = process.env.APP_URL || "http://127.0.0.1:3100";
const question = process.argv[2] || "Bei zenu zikoje?";

const body = {
  messages: [{ id: "1", role: "user", parts: [{ type: "text", text: question }] }],
};

const started = Date.now();
const response = await fetch(`${APP}/api/chat`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

console.log(`Khaki AI — muda hadi neno la kwanza\n`);
console.log(`  swali                        ${question}`);
console.log(`  modeli                       ${response.headers.get("x-khaki-model") ?? "—"}`);
console.log(`  mtoa huduma                  ${response.headers.get("x-khaki-provider") ?? "—"}\n`);

if (!response.body) {
  console.error("Hakuna mwili wa jibu.");
  process.exit(2);
}

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
let firstStep = 0;
let firstDelta = 0;
let text = "";
let chunks = 0;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks += 1;
  buffer += decoder.decode(value, { stream: true });

  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") continue;
    let frame;
    try {
      frame = JSON.parse(payload);
    } catch {
      continue;
    }
    const now = Date.now() - started;
    if (frame.type === "start-step" && !firstStep) firstStep = now;
    if (frame.type === "text-delta") {
      if (!firstDelta) firstDelta = now;
      text += frame.delta ?? "";
    }
  }
}

const total = Date.now() - started;
const row = (label, value) => console.log(`  ${label.padEnd(30)} ${value}`);
row("jibu linaanza", firstStep ? `${firstStep}ms` : "—");
row("neno la kwanza linaonekana", firstDelta ? `${firstDelta}ms` : "hakuna maandishi");
row("jibu limekamilika", `${total}ms`);
row("chunks za HTTP", chunks);
console.log(`\n  ${text.trim().slice(0, 140)}`);

if (!text.trim()) {
  console.error("\n✗ Hakuna maandishi yaliyofika.");
  process.exitCode = 1;
}
