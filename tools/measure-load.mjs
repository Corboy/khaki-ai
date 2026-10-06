/**
 * Load timing on a phone connection.
 *
 * The customers this is built for are on phones in Tanzania, not on a desktop
 * with fibre. 345 kB of JavaScript is fine on WiFi and is not obviously fine on
 * a congested cell, so measure rather than assume.
 *
 * It answered a question worth answering. On a realistic profile the app is
 * interactive in about two seconds, so the chat runtime does not need to be
 * split out of the first load — and that conclusion is only trustworthy
 * because it came from a measurement rather than a guess.
 *
 *   4G         (4 Mbps, 60ms)     first paint  404ms   interactive 1.28s
 *   fast 3G    (1.6 Mbps, 150ms)  first paint  644ms   interactive 2.20s
 *   slow 3G    (400 kbps, 400ms)  first paint 2056ms   interactive 7.94s
 *
 * Needs a running server and a Chrome with remote debugging:
 *
 *   pnpm build && pnpm start
 *   pnpm measure:load fast3g
 */

const PORT = process.env.CDP_PORT || "9222";
const APP = process.env.APP_URL || "http://127.0.0.1:3100";

const PROFILES = {
  // Roughly Chrome DevTools' "Slow 3G": 400 ms RTT, 400 kbps down.
  slow3g: { latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 },
  fast3g: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
  "4g": { latency: 60, downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 },
};

const profileName = process.argv[2] || "fast3g";
const profile = PROFILES[profileName];
if (!profile) {
  console.error(`profile si sahihi: ${profileName}. Tumia: ${Object.keys(PROFILES).join(", ")}`);
  process.exit(2);
}

const page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(
  (t) => t.type === "page",
);
if (!page) {
  console.error(`Hakuna ukurasa kwenye Chrome (port ${PORT}).`);
  process.exit(2);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

let nextId = 1;
const pending = new Map();

/*
 * Per-file transfer sizes, so "346 kB" can be traced to something.
 *
 * The number on its own invites the wrong reading. Looking at the build
 * directory, the largest chunk is 555 kB on disk and looks alarming; what the
 * browser actually receives for it is 173 kB, because Next serves it
 * compressed. Reading the file size instead of the transfer size is how a
 * non-issue becomes an afternoon.
 */
const scripts = [];
const scriptUrls = new Map();

ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    return;
  }
  if (m.method === "Network.responseReceived" && m.params.type === "Script") {
    scriptUrls.set(m.params.requestId, m.params.response.url);
  }
  if (m.method === "Network.loadingFinished" && scriptUrls.has(m.params.requestId)) {
    scripts.push({ url: scriptUrls.get(m.params.requestId), bytes: m.params.encodedDataLength });
    scriptUrls.delete(m.params.requestId);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
  return r.result.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setDeviceMetricsOverride", {
  width: 393,
  height: 852,
  deviceScaleFactor: 3,
  mobile: true,
});
await send("Network.emulateNetworkConditions", {
  offline: false,
  latency: profile.latency,
  downloadThroughput: profile.downloadThroughput,
  uploadThroughput: profile.uploadThroughput,
});

console.log(`Khaki AI — kupakia kwenye ${profileName}\n`);

await send("Page.navigate", { url: `${APP}/?load=${Date.now()}` });

const samples = [];
const started = Date.now();
let ready = false;

while (!ready && Date.now() - started < 90_000) {
  const state = JSON.parse(
    await evaluate(`(() => {
      const nav = performance.getEntriesByType("navigation")[0] || {};
      const res = performance.getEntriesByType("resource");
      const paint = performance.getEntriesByType("paint").find(p => p.name === "first-contentful-paint");
      return JSON.stringify({
        transferred: res.reduce((sum, r) => sum + (r.transferSize || 0), 0),
        resources: res.length,
        fcp: paint ? Math.round(paint.startTime) : null,
        interactive: !!document.querySelector("textarea[aria-label='Andika ujumbe']"),
        header: !!document.querySelector("header"),
        heading: !!document.querySelector("h1"),
      });
    })()`),
  );
  samples.push({ at: Date.now() - started, ...state });
  if (state.interactive) ready = true;
  else await new Promise((r) => setTimeout(r, 250));
}

const first = (predicate) => samples.find(predicate);
const final = samples[samples.length - 1];

const row = (label, value) => console.log(`  ${label.padEnd(34)} ${value ?? "—"}`);
row("kichwa (header) kinaonekana", first((s) => s.header) ? `${first((s) => s.header).at}ms` : null);
row("first contentful paint", first((s) => s.fcp !== null)?.fcp ? `${first((s) => s.fcp !== null).fcp}ms` : null);
row("maandishi ya kwanza (h1)", first((s) => s.heading) ? `${first((s) => s.heading).at}ms` : null);
row("composer inaandika", first((s) => s.interactive) ? `${first((s) => s.interactive).at}ms` : "haikufika");
console.log("");
console.log(`  data iliyopakuliwa                    ${(final.transferred / 1024).toFixed(0)} kB  (maombi ${final.resources})`);

const biggest = [...scripts].filter((s) => s.url.startsWith(APP)).sort((a, b) => b.bytes - a.bytes).slice(0, 5);
if (biggest.length) {
  console.log("");
  console.log("  scripts kubwa zaidi (kama zinavyosafiri):");
  for (const script of biggest) {
    console.log(`    ${(script.bytes / 1024).toFixed(1).padStart(7)} kB  ${script.url.replace(APP, "")}`);
  }
}

if (!ready) {
  console.log("\n✗ composer haikuwa tayari ndani ya sekunde 90");
  process.exitCode = 1;
}

await send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 0,
  downloadThroughput: -1,
  uploadThroughput: -1,
});

ws.close();
process.exit(process.exitCode ?? 0);
