/**
 * Accessibility and control-behaviour audit.
 *
 * Runs axe-core against the app in a real browser, then presses and clicks the
 * things axe cannot judge. Everything else in `tools/` is static analysis; this
 * is the only check that sees the page the way an assistive technology does --
 * and the only one that can tell a control that is correct from a control that
 * merely looks correct.
 *
 * That distinction earned its place. The admin panel's radio group carried
 * `role="radiogroup"` and `role="radio"` on plain buttons, so axe passed it for
 * sixty rounds while the arrow keys did nothing. Roles are checkable by a static
 * ruleset; behaviour is not.
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

/*
 * The same page at laptop size, where the owner actually uses it.
 *
 * Responsive hiding means the two widths are different documents: everything
 * behind a `hidden sm:block` is invisible to axe at 393 and present at 1280, so
 * auditing one width and calling the page covered is not a claim worth making.
 */
await viewport(1280, 900, false);
await send("Page.navigate", { url: `${APP}/admin` });
await new Promise((r) => setTimeout(r, 4000));
await loadAxe();
total += await run("mipangilio /admin (desktop 1280x900)");

/*
 * The not-found page, which is what an old WhatsApp link lands on.
 *
 * It is a real page with a heading and two buttons, and it had never been
 * audited either -- a 404 is still a page someone reads.
 */
await viewport(393, 852, true);
await send("Page.navigate", { url: `${APP}/ukurasa-haupo` });
await new Promise((r) => setTimeout(r, 3500));
await loadAxe();
total += await run("ukurasa haupo 404 (simu 393x852)");

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
  /*
   * Every key this file presses has to be listed.
   *
   * It was not: the radio check below called key("ArrowDown") and the map had
   * only Tab, Escape and Enter, so dispatchKeyEvent went out with no key at all
   * and nothing happened. The audit then reported that the product ignores the
   * arrow keys -- about a group that answers them -- and the report was wrong
   * in the direction that wastes the most time: it sends someone to fix working
   * code. Unknown keys now fail loudly instead.
   */
  const map = {
    Tab: { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 },
    Escape: { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 },
    Enter: { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" },
    ArrowDown: { key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 },
    ArrowUp: { key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38 },
    ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 },
    ArrowRight: { key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 },
    Home: { key: "Home", code: "Home", windowsVirtualKeyCode: 36 },
    End: { key: "End", code: "End", windowsVirtualKeyCode: 35 },
  };
  if (!map[name]) {
    console.log(`✗ the audit tried to press "${name}", which it does not know how to send`);
    total += 1;
    return;
  }
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

/*
 * A radio group has to answer the arrow keys.
 *
 * axe cannot see this: the roles are correct, so it passes, while a screen
 * reader announces "radio button, 1 of 3" and then ignores the arrows it
 * invites. The admin panel's provider selector was exactly that until it was
 * measured -- ArrowDown and ArrowRight both left the selection where it was,
 * because the radios were plain buttons with radio roles bolted on.
 *
 * Also checks the roving tabindex, which is the other half of the pattern: a
 * radio group is one Tab stop, not three.
 */
console.log("\n=== radio group (mishale) ===");

await viewport(1280, 900, false);
await send("Page.navigate", { url: `${APP}/admin` });
await new Promise((r) => setTimeout(r, 4000));

const radioState = `(() => {
  const group = document.querySelector('[role="radiogroup"]');
  if (!group) return JSON.stringify({ found: false });
  const radios = [...group.querySelectorAll('[role="radio"]')];
  return JSON.stringify({
    found: true,
    label: group.getAttribute("aria-label") || "",
    count: radios.length,
    checked: radios.findIndex((r) => r.getAttribute("aria-checked") === "true"),
    tabbable: radios.filter((r) => r.getAttribute("tabindex") !== "-1").length,
  });
})()`;

const before = JSON.parse(await evaluate(radioState));
if (!before.found) {
  console.log("✗ no radio group on /admin to check");
  total += 1;
} else {
  await evaluate(`(() => {
    const group = document.querySelector('[role="radiogroup"]');
    const radios = [...group.querySelectorAll('[role="radio"]')];
    radios[Math.max(0, radios.findIndex((r) => r.getAttribute("aria-checked") === "true"))].focus();
  })()`);

  await key("ArrowDown");
  await new Promise((r) => setTimeout(r, 200));
  const down = JSON.parse(await evaluate(radioState));

  if (down.checked === before.checked) {
    console.log(`✗ ArrowDown did not move "${before.label}" (still on ${down.checked})`);
    total += 1;
  } else if (down.tabbable !== 1) {
    console.log(`✗ the arrows move, but ${down.tabbable} radios are Tab stops instead of 1`);
    total += 1;
  } else {
    console.log(`✓ "${before.label}": arrows move the selection, and it is one Tab stop`);
  }
}

/*
 * The appearance panel's three axes are mutually exclusive, and the choice has
 * to reach the document.
 *
 * Same shape of hole as the radio group below: `aria-pressed` is valid on every
 * button, so axe is satisfied whether one option is pressed or all three are.
 * The panel is correct today -- measured, three pressed at rest and exactly
 * three after each press, with data-motion following -- and this is what keeps
 * it that way.
 */
console.log("\n=== panel ya mwonekano ===");

await viewport(1440, 900, false);
await send("Page.navigate", { url: APP });
await new Promise((r) => setTimeout(r, 3500));

const appearanceState = `(() => {
  const panel = document.querySelector('[role="group"][aria-label="Mipangilio ya mwonekano"]');
  if (!panel) return JSON.stringify({ found: false });
  return JSON.stringify({
    found: true,
    pressed: [...panel.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.textContent.trim()),
    motion: document.documentElement.getAttribute("data-motion"),
  });
})()`;

await evaluate(`(() => {
  const b = document.querySelector('button[aria-label="Mipangilio ya mwonekano"]');
  if (b) b.click();
})()`);
await new Promise((r) => setTimeout(r, 700));

const appearance = JSON.parse(await evaluate(appearanceState));
if (!appearance.found) {
  console.log("✗ the appearance panel did not open");
  total += 1;
} else if (appearance.pressed.length !== 3) {
  console.log(`✗ ${appearance.pressed.length} options are pressed across three axes, expected 3`);
  total += 1;
} else {
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('[role="group"][aria-label="Mipangilio ya mwonekano"] button')]
      .find((x) => x.textContent.trim() === "Sinema");
    if (b) b.click();
  })()`);
  await new Promise((r) => setTimeout(r, 400));
  const afterPress = JSON.parse(await evaluate(appearanceState));

  if (afterPress.pressed.length !== 3) {
    console.log(`✗ pressing one option left ${afterPress.pressed.length} pressed, expected 3`);
    total += 1;
  } else if (!afterPress.pressed.includes("Sinema") || afterPress.motion !== "cinematic") {
    console.log(
      `✗ pressing Sinema did not take over (pressed: ${afterPress.pressed.join(", ")}, data-motion ${afterPress.motion})`,
    );
    total += 1;
  } else {
    console.log("✓ the three axes stay exclusive and the choice reaches the document");
  }
}

/*
 * Deleting a conversation takes two presses.
 *
 * The trash button arms on the first and acts on the second, which is the only
 * thing standing between a mis-tap and a customer's history. Nothing had ever
 * checked it -- a control that deletes on the first press would look identical
 * to axe.
 */
console.log("\n=== kufuta mazungumzo (hatua mbili) ===");

await viewport(1280, 900, false);
await send("Page.navigate", { url: APP });
await new Promise((r) => setTimeout(r, 3000));

await evaluate(`(() => {
  const now = Date.now();
  const mk = (id, title, age) => ({
    id, title, createdAt: now - age, updatedAt: now - age,
    messages: [
      { id: id + "-u", role: "user", parts: [{ type: "text", text: title }] },
      { id: id + "-a", role: "assistant", parts: [{ type: "text", text: "Jibu la " + title }] },
    ],
  });
  localStorage.setItem("khaki:conversations", JSON.stringify({
    conversations: [mk("c1", "Swali la kwanza", 3000), mk("c2", "Swali la pili", 2000), mk("c3", "Swali la tatu", 1000)],
    activeId: "c1",
  }));
})()`);
await send("Page.navigate", { url: APP });
await new Promise((r) => setTimeout(r, 3500));

const stored = `(() => {
  const c = JSON.parse(localStorage.getItem("khaki:conversations") || "{}");
  return JSON.stringify({ ids: (c.conversations || []).map((x) => x.id), active: c.activeId });
})()`;

const pressTrash = `(() => {
  const nav = document.querySelector('nav[aria-label="Mazungumzo"]');
  if (!nav) return "no nav";
  const b = [...nav.querySelectorAll('button')].find((x) => /Futa|Thibitisha/i.test(x.getAttribute("aria-label") || ""));
  if (!b) return "no delete button";
  b.click();
  return b.getAttribute("aria-label");
})()`;

const start = JSON.parse(await evaluate(stored));
if (start.ids.length !== 3) {
  console.log(`✗ could not seed three conversations (${start.ids.length})`);
  total += 1;
} else {
  await evaluate(pressTrash);
  await new Promise((r) => setTimeout(r, 350));
  const armed = JSON.parse(await evaluate(stored));

  if (armed.ids.length !== 3) {
    console.log(`✗ one press deleted a conversation (${armed.ids.length} left) -- the arming step does nothing`);
    total += 1;
  } else {
    await evaluate(pressTrash);
    await new Promise((r) => setTimeout(r, 500));
    const done = JSON.parse(await evaluate(stored));

    if (done.ids.length !== 2 || done.ids.includes("c1")) {
      console.log(`✗ the second press did not delete the armed conversation (${done.ids.join(", ")})`);
      total += 1;
    } else if (done.active === "c1") {
      console.log("✗ the deleted conversation is still the active one");
      total += 1;
    } else {
      console.log("✓ one press arms and does not delete, the second deletes, and the active moves on");
    }
  }
}

console.log(total === 0 ? "\nPASS — hakuna violations" : `\nFAIL — aina ${total} za violations`);
ws.close();
process.exit(total === 0 ? 0 : 1);
