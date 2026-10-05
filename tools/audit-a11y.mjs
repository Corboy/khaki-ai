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

/*
 * The settings panel, which had never been audited at all.
 *
 * Every state above is the chat. /admin is the other page in the app, and it is
 * the one with actual form controls -- selects, text inputs, a password field,
 * a save button -- so it is the one most likely to have a labelling problem.
 * axe costs nothing to point at it.
 */
await viewport(393, 852, true);
await send("Page.navigate", { url: `${APP}/admin` });
await new Promise((r) => setTimeout(r, 4500));
await loadAxe();
total += await run("mipangilio /admin (simu 393x852)");

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */

/*
 * WCAG 2.3.3, and the one guard axe does not cover.
 *
 * This app is deliberately full of movement -- drifting light, a shimmer, a
 * level meter -- and `prefers-reduced-motion` is meant to stop all of it. The
 * CSS rule can be broken without anything looking wrong to whoever breaks it:
 * an animation on a selector the rule does not reach, or one driven from
 * JavaScript, would keep running for exactly the people who asked it not to.
 *
 * Verified by measurement rather than by reading the stylesheet, because the
 * stylesheet looked fine the whole time the dead keyframes were in it.
 */
console.log("\n=== mwendo (prefers-reduced-motion) ===");

const animationsRunning = () =>
  evaluate(`(() => {
    let running = 0;
    const names = new Set();
    document.querySelectorAll("*").forEach((el) => {
      const s = getComputedStyle(el);
      if (!s.animationName || s.animationName === "none") return;
      names.add(s.animationName);
      if (parseFloat(s.animationDuration) > 0.01) running += 1;
    });
    return JSON.stringify({ running, names: [...names] });
  })()`);

await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await send("Page.navigate", { url: `${APP}/?motion=${Date.now()}` });
await new Promise((r) => setTimeout(r, 4000));
const normal = JSON.parse(await animationsRunning());

await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await send("Page.navigate", { url: `${APP}/?motion=${Date.now()}` });
await new Promise((r) => setTimeout(r, 4000));
const reduced = JSON.parse(await animationsRunning());

/*
 * An inconclusive run is a failure, not a warning.
 *
 * The first version of this printed "the check proves nothing" and then passed
 * anyway, because the branch that said so never incremented the total. The red
 * test found it: neutralising the media query left the baseline at zero
 * animations, the check admitted it had established nothing, and the gate went
 * green.
 *
 * A check that cannot establish its own baseline has not verified anything,
 * and reporting that as a pass is worse than not running it.
 */
if (normal.running === 0) {
  console.log("✗ hakuna animation iliyoendesha hata kwa kawaida — baseline haipo");
  console.log("   kipimo hakiwezi kuthibitisha kitu, kwa hiyo kinashindwa");
  total += 1;
} else if (reduced.running === 0) {
  console.log(`✓ ${normal.running} animation zinasimama zote (${normal.names.join(", ")})`);
} else {
  console.log(`✗ ${reduced.running} animation zinaendelea chini ya reduced motion:`);
  console.log(`   ${reduced.names.join(", ")}`);
  total += 1;
}

await send("Emulation.setEmulatedMedia", { features: [] });

/* ------------------------------------------------------------------ */
/* Keyboard                                                            */
/* ------------------------------------------------------------------ */

/*
 * WCAG 2.1.1. axe does not check this, and it failed in three places at once.
 *
 * The drawer is the only dialog in the app and it is opened by a button, so it
 * is also the clearest case: focus has to move in when it opens, stay in while
 * it is open, and come back to the trigger when it closes.
 *
 * Enter needs `text` on the synthetic key event or Chrome dispatches the key
 * without activating the focused button -- without it the drawer never opened
 * and the "Escape closes it" assertion below passed against a drawer that was
 * never open.
 */
console.log("\n=== keyboard ===");

const key = async (name) => {
  const map = {
    Tab: { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 },
    Escape: { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 },
    Enter: { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" },
  };
  await send("Input.dispatchKeyEvent", { type: "keyDown", ...map[name] });
  await send("Input.dispatchKeyEvent", { type: "keyUp", ...map[name] });
  await new Promise((r) => setTimeout(r, 180));
};

const drawerState = () =>
  evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return JSON.stringify({ error: "no dialog" });
    const shell = dialog.closest("[aria-hidden]");
    return JSON.stringify({
      open: shell.getAttribute("aria-hidden") === "false",
      focusInside: !!(document.activeElement && dialog.contains(document.activeElement)),
      focusLabel: (document.activeElement?.getAttribute("aria-label") || "").slice(0, 30),
    });
  })()`);

await viewport(393, 852, true);
await send("Page.navigate", { url: `${APP}/?keys=${Date.now()}` });
await new Promise((r) => setTimeout(r, 4000));
await evaluate("localStorage.clear()");
await send("Page.navigate", { url: `${APP}/?keys=${Date.now()}` });
await new Promise((r) => setTimeout(r, 4000));

await evaluate(`document.querySelector("button[aria-label='Fungua menyu']")?.focus()`);
await key("Enter");
const openedState = JSON.parse(await drawerState());

if (!openedState.open) {
  console.log("✗ the drawer did not open from the keyboard");
  total += 1;
} else if (!openedState.focusInside) {
  console.log("✗ the drawer opened but focus stayed outside it");
  total += 1;
} else {
  await key("Tab");
  const afterTab = JSON.parse(await drawerState());
  if (!afterTab.focusInside) {
    console.log(`✗ focus escaped the open drawer (landed on "${afterTab.focusLabel}")`);
    total += 1;
  } else {
    await key("Escape");
    const closed = JSON.parse(await drawerState());
    if (closed.open) {
      console.log("✗ Escape did not close the drawer");
      total += 1;
    } else if (!/Fungua/.test(closed.focusLabel)) {
      console.log(`✗ Escape closed it but focus went to "${closed.focusLabel}"`);
      total += 1;
    } else {
      console.log("✓ focus enters the drawer, stays in it, and Escape returns it to the trigger");
    }
  }
}

console.log(total === 0 ? "\nPASS — hakuna violations" : `\nFAIL — aina ${total} za violations`);
ws.close();
process.exit(total === 0 ? 0 : 1);
