# Khaki AI Mobile-First Chat Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Khaki AI a calm, chat-first experience for mostly-mobile iOS and Android visitors, while preserving Khaki's Swahili voice, local conversation persistence, safe areas, and desktop history rail.

**Architecture:** Extend the existing `AppShell` + `ChatThread` + `KhakiChatRuntime` boundaries. Do not rewrite the conversation store or replace assistant-ui. Add a small visual-viewport layout layer for keyboard-safe mobile composition, simplify the welcome and drawer surfaces, then verify the result at phone and desktop breakpoints.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, assistant-ui, existing Node test runner, Chrome DevTools MCP for rendered verification.

**Spec:** `docs/superpowers/specs/2026-10-24-mobile-first-chat-shell-design.md`

## Global Constraints

- Mobile is the source of truth; verify 320px, 375px, 390px, 414px, and 430px widths before desktop polish.
- Preserve the existing Swahili-first copy, Khaki obsidian/brass identity, per-conversation drafts, local persistence, safe-area insets, focus trap, Escape handling, inert drawer behavior, and reduced-motion support.
- Do not add OmniVoice, a new voice provider, model selection, visibility selection, artifacts, file attachments, authentication, server conversation sync, or new business behavior.
- Do not copy Vercel Chatbot branding or exact layout. Borrow only its chat-shell, bounded viewport, guarded scroll, compact suggestions, and close-on-navigation patterns.
- Do not run `pnpm build` while any `next dev` process is serving the same `.next` directory. Stop the dev server first, then run production verification.
- Use TDD for new pure logic: write a failing test, observe the expected failure, implement the minimum behavior, then run the focused and full suites.
- Keep each implementation slice independently buildable and commit after its verification checkpoint.

---

## Task 1: Add keyboard-safe visual viewport layout primitives

**Files:**
- Create: `src/lib/mobile-layout.ts`
- Create: `tests/mobile-layout.test.ts`
- Create: `src/components/chat/visual-viewport-layout.tsx`
- Modify: `src/app/page.tsx:28-62`
- Modify: `src/components/layout/app-shell.tsx:174-175,223-296`
- Modify: `src/components/chat/thread.tsx:26-72,207-242`
- Modify: `src/components/chat/composer.tsx:101-115`
- Modify: `src/app/globals.css` near the safe-area/layout utilities

**Interfaces:**
- `src/lib/mobile-layout.ts` exports:
  - `clampComposerHeight(availableHeight: number, minHeight?: number, maxHeight?: number): number`
  - `visualViewportOffset(viewportHeight: number, layoutHeight: number, pageTop: number): number`
- `VisualViewportLayout` renders children around the existing shell and writes `--khaki-viewport-height` and `--khaki-keyboard-offset` to the document root.
- `useComposerLayoutStyle()` returns `{ ref }` for the composer root; the hook updates `--khaki-composer-height` through `ResizeObserver` without putting every keystroke into React state.

- [ ] **Step 1: Write the failing pure-layout tests.**

Add tests in `tests/mobile-layout.test.ts` for:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampComposerHeight, visualViewportOffset } from "@/lib/mobile-layout";

describe("mobile layout math", () => {
  it("keeps the composer inside a reduced keyboard viewport", () => {
    assert.equal(clampComposerHeight(280, 88, 320), 280);
    assert.equal(clampComposerHeight(72, 88, 320), 88);
    assert.equal(clampComposerHeight(600, 88, 320), 320);
  });

  it("reports the keyboard displacement without negative values", () => {
    assert.equal(visualViewportOffset(844, 844, 0), 0);
    assert.equal(visualViewportOffset(390, 844, 0), 454);
    assert.equal(visualViewportOffset(900, 844, -20), 0);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails for the missing module.**

Run:

```bash
pnpm exec tsx --test tests/mobile-layout.test.ts
```

Expected: FAIL because `src/lib/mobile-layout.ts` does not exist yet.

- [ ] **Step 3: Implement the minimum pure helpers.**

`clampComposerHeight` must return `Math.min(Math.max(availableHeight, minHeight), maxHeight)` with defaults `88` and `320`. `visualViewportOffset` must calculate `Math.max(0, layoutHeight - viewportHeight - Math.min(0, pageTop))`, so a smaller visual viewport produces a positive keyboard offset while overscroll never produces a negative value.

- [ ] **Step 4: Run the focused test and verify it passes.**

Run the same command. Expected: both tests pass with no warnings.

- [ ] **Step 5: Add the client visual-viewport provider.**

`VisualViewportLayout` must:

1. Render children unchanged on the server.
2. On mount, subscribe to `window.visualViewport` `resize` and `scroll` events when available.
3. Use `window.innerHeight` as the fallback viewport height.
4. Batch reads/writes with `requestAnimationFrame`.
5. Set the CSS variables on `document.documentElement` and remove the listeners on unmount.
6. Never read cookies, storage, or credentials.

Wrap `AppShell` in `src/app/page.tsx` or place the provider inside `AppShell` so it covers the active chat without changing conversation state ownership.

- [ ] **Step 6: Make the composer and transcript consume the variables.**

Add a ref to `ComposerPrimitive.Root` and use `ResizeObserver` to set `--khaki-composer-height`. Replace the fixed `max-h-[42vh]` with a CSS `max-height` based on `--khaki-viewport-height` and the composer/header safe budget. Add transcript `scroll-padding-bottom: calc(var(--khaki-composer-height, 88px) + env(safe-area-inset-bottom) + 24px)`.

Preserve the current 16px text, 44px send/stop button, `env(safe-area-inset-bottom)`, draft persistence, and cancel behavior.

- [ ] **Step 7: Make the jump-to-latest target 44px without changing its unread semantics.**

Keep `useUnreadWhileAway` and the existing count. Change only the mobile target and spacing so the button is at least 44×44 CSS pixels and remains above the composer.

- [ ] **Step 8: Run focused and existing regression tests.**

Run:

```bash
pnpm exec tsx --test tests/mobile-layout.test.ts
pnpm test
pnpm typecheck
```

Expected: focused tests pass, existing suite remains at least 226 passing, typecheck exits 0.

- [ ] **Step 9: Commit the slice.**

```bash
git add src/lib/mobile-layout.ts tests/mobile-layout.test.ts src/components/chat/visual-viewport-layout.tsx src/components/layout/app-shell.tsx src/components/chat/thread.tsx src/components/chat/composer.tsx src/app/globals.css src/app/page.tsx
git commit -m "feat: make chat layout keyboard safe on mobile"
```

**Acceptance:** With a 390×844 emulated viewport, opening a keyboard-sized visual viewport keeps the composer and send/stop action visible, introduces no page-level horizontal/vertical scroll, and keeps the last streamed message reachable above the composer.

---

## Task 2: Replace the marketing-heavy welcome with a chat-first mobile entry

**Files:**
- Modify: `src/components/chat/welcome.tsx`
- Modify: `src/config/khaki.ts` quick-action labels/prompts only if copy needs to match the new two/three starters
- Modify: `src/app/globals.css` only for any new compact suggestion utility, if an existing utility cannot express it
- Modify: `tests/business-logic.test.ts` only if a pure starter configuration contract is introduced
- Create: `tests/welcome.test.ts` only if a pure starter-selection helper is extracted

**Interfaces:**
- Keep `ThreadWelcome` as the exported empty-thread component consumed by `thread.tsx`.
- Keep `ThreadPrimitive.Suggestion` so assistant-ui owns submission semantics.
- Prompt starter items must be typed from the existing `KHAKI_CONFIG.quickActions` shape; do not create a second service catalogue.

- [ ] **Step 1: Record the current empty-state behavior before changing it.**

Run the existing app at port 3100 and capture a text snapshot at 320px, 390px, and 414px. Record that the current first viewport contains the hero, status, four actions, contact/social content, and composer. This is the baseline for the manual verification log; do not add a screenshot artifact to the repository.

- [ ] **Step 2: Write the failing starter-selection test before extracting a helper.**

Create `tests/welcome.test.ts` only if the component introduces a pure helper. The test must assert that `primaryQuickActions(actions)` returns the first three configured actions in stable order and never mutates the input. Run `pnpm exec tsx --test tests/welcome.test.ts` and verify the expected missing-export failure. If the component can use `KHAKI_CONFIG.quickActions.slice(0, 3)` directly, do not create a test-only helper or file.

- [ ] **Step 3: Replace the hero markup with the compact mobile-first structure.**

Keep a small Khaki mark, one heading, and one short paragraph. Use this copy direction (preserve the business facts, adjust wording only for clarity):

```text
Karibu Khaki Media
Uliza kuhusu huduma, bei au booking — nitakuelekeza hatua inayofuata.
```

Do not render the starting price in the hero; price is requested through chat and already has a canonical answer path.

- [ ] **Step 4: Replace four large auto-send cards with two or three compact starters.**

Use short labels such as `Bei za packages`, `Nataka booking`, and `Huduma tunazotoa`. Render them as compact horizontal chips on mobile and a small inline row on wider screens. The default interaction should fill the composer rather than auto-send: use the assistant-ui suggestion callback without `send`, or the exact supported equivalent already present in this installed version. Preserve keyboard activation and an accessible label.

- [ ] **Step 5: Remove secondary content from the first interaction.**

Do not render the infinite `ServiceMarquee`, address, phone, or social row inside the empty-state primary path. Keep contact paths available in the drawer footer and in assistant answers. Keep the studio open/closed signal only if it fits in one compact line without pushing the composer below the first viewport; otherwise move it into the drawer.

- [ ] **Step 6: Verify the compact state before continuing.**

Run `pnpm typecheck`, then use Chrome DevTools at 320×800, 375×812, 390×844, and 414×896. Acceptance checks:

- Heading, composer, and starters are visible without scrolling through marketing content.
- No text is clipped or horizontally overflows.
- Starters are at least 44px high and do not start a network request until the user submits.
- Reduced-motion mode removes decorative loops.

- [ ] **Step 7: Commit the slice.**

```bash
git add src/components/chat/welcome.tsx src/config/khaki.ts src/app/globals.css tests/business-logic.test.ts
git commit -m "feat: make welcome state chat first"
```

**Acceptance:** At all required narrow-phone widths, the composer is part of the first interaction and the welcome state presents no more than three secondary starters.

---

## Task 3: Simplify the mobile shell, drawer, and action targets

**Files:**
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/studio-controls.tsx`
- Create: `tools/audit-mobile-ui.mjs`
- Modify: `package.json` only if the audit is exposed as a named script
- Modify: `src/components/ui/icon-button.tsx`
- Modify: `src/components/chat/messages.tsx`
- Modify: `src/components/chat/thread.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Preserve `AppShell` props and `useConversations()` API.
- Preserve the current drawer focus/inert implementation unless a targeted fix is required.
- Preserve `ConversationRow` actions and their storage mutations; only simplify placement, semantics, and target sizes.

- [ ] **Step 1: Write a static UI contract test/audit before changing controls.**

Create `tools/audit-mobile-ui.mjs` that reads the specified source files and fails if it finds:

- A mobile social link with `h-9 w-9`.
- A jump-to-latest button with `h-9`.
- A search clear control with `h-6 w-6`.
- More than one rendered `StudioControls` placement in `app-shell.tsx`.

The audit must print each finding with file and line number. Run it before the code change and verify it fails on the current source. Expose it as `pnpm audit:mobile` only if adding the named script makes the existing verification workflow clearer; otherwise run it directly with Node.

- [ ] **Step 2: Simplify the mobile header.**

Keep menu, active conversation identity, new chat, and one secondary action at most. Remove the mobile appearance control from the header. Ensure `ActiveConversationTitle` is visually available on mobile when the active conversation has messages, using `min-w-0` and truncation so it never crowds the menu or new-chat control.

- [ ] **Step 3: Reduce the drawer footer.**

Keep one primary contact CTA and the existing studio settings link. Move or remove duplicated address/social/appearance rows from the mobile drawer. Keep the desktop rail useful, but do not introduce separate mobile-only business navigation.

Search must be available once there is any visible conversation, or through an explicit “Mazungumzo yote” action. Do not wait until four conversations before offering a way to search.

- [ ] **Step 4: Fix drawer focus and hidden-rail semantics.**

Preserve the current focus trap, Escape, backdrop close, inert order, and trigger focus return. Add `inert` to the collapsed desktop rail rather than relying only on `aria-hidden`, so hidden controls cannot remain in the tab order. For row action popovers, either implement focus movement into the first item and Arrow/Home/End navigation or remove `role="menu"` and use a labelled action popover with ordinary buttons.

- [ ] **Step 5: Normalize frequent mobile targets.**

Make these at least 44×44 CSS pixels without changing their visual icon size: menu, close, new chat, row action trigger, search clear, jump-to-latest, copy, regenerate, branch controls, social/contact links, appearance choices, and error recovery CTA. Use padding/min-size rather than oversized icons. Preserve the existing desktop density where it does not harm touch use.

- [ ] **Step 6: Remove duplicated appearance control.**

There must be one desktop appearance entry and one inline mobile drawer disclosure, not a header control plus a second page-level overlay. Keep the preferences implementation only if it remains a secondary user choice; do not add new appearance axes.

- [ ] **Step 7: Run the audit and regressions.**

Run:

```bash
node tools/audit-mobile-ui.mjs
pnpm typecheck
pnpm test
```

Expected: the audit exits 0, all existing tests pass, and no focus/inert or conversation-store regression appears.

- [ ] **Step 8: Commit the slice.**

```bash
git add tools/audit-mobile-ui.mjs src/components/layout/app-shell.tsx src/components/layout/studio-controls.tsx src/components/ui/icon-button.tsx src/components/chat/messages.tsx src/components/chat/thread.tsx src/app/globals.css
 git commit -m "feat: simplify mobile navigation and touch actions"
```

**Acceptance:** The mobile drawer presents conversation navigation first, the current thread identity is visible, frequent controls are comfortably tappable, and no duplicated appearance surface remains.

---

## Task 4: Accessibility, metadata, motion, and production verification

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/chat/composer.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/app/globals.css`
- Modify: `package.json` only if a focused audit script is added to the scripts map
- Modify: `README.md` only if the existing verification command documentation is now stale

**Interfaces:**
- Do not change chat API contracts or provider settings.
- Keep `main` as the conversation landmark and ensure the skip link targets it.
- Keep form submission and assistant-ui event ownership unchanged.

- [ ] **Step 1: Add failing source-level checks for the known console/SEO defects.**

Extend `tools/audit-mobile-ui.mjs` to require:

- A non-empty metadata description in `src/app/layout.tsx`.
- `id` and `name` on the composer textarea or an explicit documented equivalent.
- A skip link targeting the main conversation landmark.
- A `prefers-reduced-motion` rule that disables decorative animation and smooth scrolling.

Run the audit and verify it fails against the current source for at least the metadata, textarea identity, and skip-link checks.

- [ ] **Step 2: Add metadata description and form identity.**

Use a concise, accurate Swahili/English description such as: `Khaki AI — uliza kuhusu huduma, bei na booking ya Khaki Media.` Add stable `id="khaki-message"`, `name="message"`, and preserve `aria-label="Andika ujumbe"` on the composer input. Do not change the visible placeholder unless the new mobile copy requires it.

- [ ] **Step 3: Add a real skip link and preserve focus visibility.**

Add a keyboard-visible skip link before the shell that targets the `<main>` landmark. Give the main element a stable id and a suitable focus target. Keep the existing global focus-visible rule; do not replace it with `outline: none`.

- [ ] **Step 4: Complete motion and overflow rules.**

Ensure reduced motion disables marquee/orbit/shimmer and smooth programmatic scroll. Ensure mobile drawers use `overscroll-behavior: contain`, the chat page does not introduce horizontal overflow, and safe-area padding remains active on notched devices.

- [ ] **Step 5: Run source and runtime checks.**

With the dev server stopped, run:

```bash
pnpm typecheck
pnpm test
node tools/audit-mobile-ui.mjs
```

Then build and serve production:

```bash
pnpm build
pnpm start -- -p 3100
```

Use Chrome DevTools MCP against the production server at:

- 320×800
- 375×812
- 390×844
- 414×896
- 430×932
- 768×1024
- 1024×768
- 1440×900

Run Lighthouse snapshot audits for accessibility and best practices. Confirm the console has no form-field warning, metadata is present in the rendered document, and the accessibility tree contains the skip link, main landmark, labelled composer, labelled drawer, and visible action names.

- [ ] **Step 6: Exercise the manual mobile matrix.**

Check: open keyboard, multiline draft, send, stop, switch conversation with an unsent draft, open/close drawer, select a thread, search, row action, scroll away during streaming, jump to latest, copy, regenerate, error recovery, reduced motion, and 200% zoom. Record failures as code changes; do not claim real iOS/Android success from desktop emulation alone.

- [ ] **Step 7: Update verification docs and commit.**

If the existing README verification command is stale, update it to describe the production-server requirement and mobile audit command. Then:

```bash
git add src/app/layout.tsx src/components/chat/composer.tsx src/components/layout/app-shell.tsx src/app/globals.css tools/audit-mobile-ui.mjs package.json README.md
git commit -m "chore: verify mobile chat accessibility and metadata"
```

**Acceptance:** Typecheck, the full test suite, the mobile source audit, production build, Lighthouse accessibility/best-practices snapshot, and manual responsive matrix all pass. Any real-device-only behavior is explicitly reported as pending rather than guessed.

---

## Checkpoint and handoff

After Task 1, Task 2, and Task 3, stop for a fresh review of the rendered mobile UI before continuing. At the final checkpoint, report:

- Exact commits and changed files.
- Exact commands and exit codes.
- Test count and failures.
- Lighthouse scores and any remaining findings.
- Viewports verified.
- Device-only checks not possible from the current environment.

Do not add image upload, feedback, command palette, voice input, or OmniVoice as part of this redesign. Those remain separate decisions after the core chat-first mobile surface has been verified.
