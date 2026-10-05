/**
 * Accessibility audit.
 *
 * Runs axe-core against the app in a real browser. Everything else in
 * `tools/` is static analysis; this is the only check that sees the page the
 * way an assistive technology does.
 *
 * It found the first real problem immediately: the page had a <header>, an
 * <aside> and a <nav>, but the conversation itself sat in a plain <div>. No
 * <main> landmark at all — `landmark-one-main`, plus seven `region` violations
 * for content outside any landmark. A screen reader can jump between
 * landmarks, and there was nowhere to jump to.
 *
 * Requires a running server and a Chrome with remote debugging:
 *
 *   pnpm build && pnpm start &
 *   chrome --headless=new --remote-debugging-port=9222 about:blank
 *   node tools/audit-a11y.mjs
 *
 * axe-core is fetched from a CDN rather than added as a dependency: this is an
 * on-demand check, not part of the build.
 */

const PORT = process.env.CDP_PORT || "9222";
const APP = process.env.APP_URL || "http://127.0.0.1:3100";
const AXE_URL = "https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js";

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
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
  return r.result.value;
};

await send("Page.enable");
await send("Runtime.enable");

const viewport = (width, height, mobile) =>
  send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: mobile ? 3 : 2,
    mobile,
  });

await viewport(393, 852, true);
// Load once so there is an origin to clear storage on.
await send("Page.navigate", { url: `${APP}/?a11y=${Date.now()}` });
await new Promise((r) => setTimeout(r, 1500));

/*
 * Start from a known state.
 *
 * Saved conversations live in localStorage, and whether any exist decides
 * which screen renders — the welcome with its heading, or a conversation
 * without one. This audit was passing or failing depending on whether someone
 * had been chatting in this browser profile, which makes it useless as a gate:
 * a check that reports a different answer for the same code is not checking
 * the code.
 */
await evaluate("localStorage.clear()");

await send("Page.navigate", { url: `${APP}/?a11y=${Date.now()}` });
await new Promise((r) => setTimeout(r, 5000));

/*
 * axe lives in the page, so a navigation throws it away. Every state that
 * reloads has to put it back — the conversation state below navigates, and
 * without this it failed with "cannot read properties of undefined (reading
 * 'run')" rather than reporting a real accessibility result.
 */
async function loadAxe() {
  const injected = await evaluate(`
    (async () => {
      if (window.axe) return "cached";
      if (${JSON.stringify(PORT)} && location.hostname !== "127.0.0.1") return "skipped";
      const src = await (await fetch(${JSON.stringify(AXE_URL)})).text();
      (0, eval)(src);
      return window.axe ? "injected" : "failed";
    })()
  `);

  if (injected !== "injected" && injected !== "cached") {
    console.error(`axe-core haikupakiwa (${injected}). Angalia mtandao.`);
    process.exit(2);
  }
}

await loadAxe();

console.log(`Khaki AI — ukaguzi wa accessibility (axe-core)\n`);

async function run(label) {
  const raw = await evaluate(`
    (async () => {
      const res = await window.axe.run(document, {
        resultTypes: ["violations"],
        runOnly: { type: "tag",
          values: ["wcag2a","wcag2aa","wcag21a","wcag21aa","best-practice"] },
      });
      return JSON.stringify(res.violations.map(v => ({
        id: v.id, impact: v.impact, help: v.help, count: v.nodes.length,
        targets: v.nodes.slice(0, 3).map(n => n.target.join(" ")),
      })));
    })()
  `);
  const violations = JSON.parse(raw);

  if (!violations.length) {
    console.log(`✓ ${label}`);
    return 0;
  }

  console.log(`✗ ${label} — ${violations.length} aina:\n`);
  for (const v of violations) {
    console.log(`   [${v.impact}] ${v.id}  x${v.count}`);
    console.log(`       ${v.help}`);
    for (const t of v.targets) console.log(`       ${t}`);
  }
  console.log("");
  return violations.length;
}

let total = 0;
total += await run("skrini ya kwanza (simu 393x852)");

await evaluate(`document.querySelector('button[aria-label="Fungua menyu"]')?.click()`);
await new Promise((r) => setTimeout(r, 900));
total += await run("menyu ya kando imefunguliwa");

await evaluate(`document.querySelector('button[aria-label="Funga menyu"]')?.click()`);
await new Promise((r) => setTimeout(r, 700));

/*
 * A conversation with messages is a different screen: no welcome, and its
 * heading has to come from somewhere else. It is audited in its own right
 * rather than assumed to behave like the welcome.
 *
 * This state is why the audit was rewritten. It used to inherit whatever
 * localStorage happened to hold, so it silently audited this screen when
 * someone had been chatting in the browser profile and the welcome when they
 * had not — and reported a failure for the second case that looked like a
 * regression in the code.
 */
await evaluate(`(() => {
  const now = Date.now();
  localStorage.setItem("khaki:conversations", JSON.stringify({
    version: 1,
    activeId: "a11y-conversation",
    conversations: [{
      id: "a11y-conversation",
      title: "Bei za sendoff",
      createdAt: now - 60000,
      updatedAt: now,
      messages: [
        { id: "u1", role: "user", parts: [{ type: "text", text: "Bei zenu zikoje?" }] },
        { id: "a1", role: "assistant", parts: [{ type: "text",
          text: "Bei zinaanzia TSH 170,000/= kwa Mango mpaka TSH 2,000,000/= kwa Diamond." }] },
      ],
    }],
  }));
})()`);

await send("Page.navigate", { url: `${APP}/?a11y=${Date.now()}` });
await new Promise((r) => setTimeout(r, 3500));
await loadAxe();
total += await run("mazungumzo yaliyo na ujumbe (simu 393x852)");

await viewport(1440, 900, false);
await new Promise((r) => setTimeout(r, 900));
total += await run("desktop 1440x900 (mazungumzo, h1 inaonekana)");

console.log(total === 0 ? "\nPASS — hakuna violations" : `\nFAIL — aina ${total} za violations`);
ws.close();
process.exit(total === 0 ? 0 : 1);
