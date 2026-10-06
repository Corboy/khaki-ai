/**
 * The shell's geometry, measured rather than photographed.
 *
 * `Page.captureScreenshot` has produced a convincing false result twice in this
 * project. Once on a masked animated layer, where it showed a rotating wedge
 * that the computed style said was a thin ring -- and once on the mobile shell,
 * where it showed a second brand row at the bottom of the page and sent me
 * looking for a duplicated header. The header count was one, the drawer was
 * parked at x = -258, and the body height was exactly the viewport, at four
 * widths. There was nothing to fix.
 *
 * Both times the picture was believed and the geometry would have settled it in
 * one step. This is the geometry, in one step:
 *
 *   · the page does not scroll -- the shell is exactly one viewport tall
 *   · there is one header, and the brand appears on screen once
 *   · the closed drawer is off screen, not merely transparent
 *   · the composer appears once the transcript exists
 *
 * A regression in any of those is a real layout fault, and none of them can be
 * faked by a stale compositor layer.
 *
 * Needs a running server and a Chrome with remote debugging:
 *
 *   pnpm build && pnpm start &
 *   pnpm audit:layout
 */

const PORT = process.env.CDP_PORT || "9222";
const APP = process.env.APP_URL || "http://127.0.0.1:3100";

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
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
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
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 0,
  downloadThroughput: -1,
  uploadThroughput: -1,
});

const VIEWPORTS = [
  { name: "simu ndogo 360x640", width: 360, height: 640, mobile: true },
  { name: "simu 393x852", width: 393, height: 852, mobile: true },
  { name: "kibao 768x1024", width: 768, height: 1024, mobile: true },
  { name: "desktop 1440x900", width: 1440, height: 900, mobile: false },
];

/*
 * Read in the page: everything this check asserts, as numbers.
 */
const PROBE = [
  "(() => {",
  "  const vw = window.innerWidth, vh = window.innerHeight;",
  "  const boxes = (sel) => [...document.querySelectorAll(sel)].map((el) => el.getBoundingClientRect());",
  "  const onScreen = (b) => b.width > 0 && b.height > 0 && b.right > 0 && b.left < vw && b.bottom > 0 && b.top < vh;",
  "  const brandLines = [...document.querySelectorAll('span,p,a,div')]",
  "    .filter((el) => !el.children.length && ['Khaki AI', 'Khaki Media'].includes((el.textContent || '').trim()))",
  "    .filter((el) => onScreen(el.getBoundingClientRect())).length;",
  "  const drawer = document.getElementById('khaki-drawer');",
  "  const drawerBox = drawer ? drawer.getBoundingClientRect() : null;",
  "  return JSON.stringify({",
  "    vw, vh,",
  "    bodyHeight: document.body.scrollHeight,",
  "    headers: document.querySelectorAll('header').length,",
  "    main: document.querySelectorAll('main').length,",
  "    brandLines,",
  "    drawerOffScreen: drawerBox ? drawerBox.right <= 1 : null,",
  "    composer: !!document.querySelector(\"textarea[aria-label='Andika ujumbe']\"),",
  "  });",
  "})()",
].join("\n");

let failures = 0;
const report = (ok, message) => {
  console.log(`  ${ok ? "✓" : "✗"} ${message}`);
  if (!ok) failures += 1;
};

console.log("Khaki AI — jiometri ya shell\n");

for (const viewport of VIEWPORTS) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });

  /*
   * Clear the stored history first: a returning customer sees a transcript
   * instead of the welcome screen, and both have to hold.
   */
  await send("Page.navigate", { url: APP });
  await wait(2500);
  await evaluate("localStorage.clear()");
  await send("Page.navigate", { url: APP });
  await wait(3000);

  const state = JSON.parse(await evaluate(PROBE));
  console.log(`\n${viewport.name}`);

  report(
    state.bodyHeight <= state.vh + 2,
    `haiscrolli — bodyHeight ${state.bodyHeight} vs viewport ${state.vh}`,
  );
  report(state.headers === 1, `kichwa kimoja (${state.headers})`);
  report(state.main === 1, `<main> mmoja (${state.main})`);
  report(
    state.brandLines <= 2,
    `brand inaonekana mara moja kwenye skrini — mistari ${state.brandLines} (kichwa kina mistari miwili)`,
  );
  report(state.drawerOffScreen !== false, `drawer imefungwa iko nje ya skrini (${state.drawerOffScreen})`);
  report(state.composer, "composer inaandika");

  // And with a conversation, which is what a returning customer sees.
  await evaluate(`(() => {
    const now = Date.now();
    localStorage.setItem('khaki:conversations', JSON.stringify({
      conversations: [{
        id: 'seed', title: 'Bei za packages zikoje?', createdAt: now, updatedAt: now,
        messages: [
          { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Bei za packages zikoje?' }] },
          { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: '**Mango** — TSH 170,000/=' }] },
        ],
      }],
      activeId: 'seed',
    }));
  })()`);
  await send("Page.navigate", { url: APP });
  await wait(3000);

  const withHistory = JSON.parse(await evaluate(PROBE));
  report(
    withHistory.bodyHeight <= withHistory.vh + 2,
    `haiscrolli pia na mazungumzo — bodyHeight ${withHistory.bodyHeight}`,
  );
  report(withHistory.headers === 1, `kichwa kimoja na mazungumzo (${withHistory.headers})`);
  report(withHistory.composer, "composer inaandika na mazungumzo");
}

console.log(
  failures === 0
    ? "\nPASS — jiometri ya shell ni sahihi kwenye kila kipimo"
    : `\nFAIL — matatizo ${failures}`,
);
ws.close();
process.exit(failures === 0 ? 0 : 1);
