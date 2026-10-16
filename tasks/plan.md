# Implementation Plan: Khaki AI — ChatGPT-Grade UI/UX Upgrade

## Overview

Khaki AI is a studio assistant for Khaki Media Pro Pictures (photo/video, Kigamboni).
The brief: deep-audit the whole project as a senior engineer, fix everything that is
not right, and lift the product to a standard ChatGPT's own team would accept.

**The honest starting point.** This is not a weak codebase that needs rescuing. It has
195 passing tests, a 25-script audit suite, measured contrast values written into the
CSS, `role`/`aria` contracts documented inline, and Lighthouse 100×4 in production. A
rewrite would make it worse. What is missing is **scope**: the app does the hard parts
of a chat product very well and is missing the parts that make a chat product a
*workspace*. ChatGPT's complexity is concentrated almost entirely in conversation
management and message-level interaction — and those are exactly the gaps here.

So the work is: close the specific gaps, fix the specific defects found in the audit,
and leave the foundations alone.

---

## Architecture Decisions

### AD-1 — Extend, do not rewrite
The existing state model (`ConversationsProvider` + `lib/conversations.ts`, one
versioned JSON document in `localStorage`) already supports everything below. Rename,
pin, archive and search are all fields and filters on `StoredConversation`, not a new
architecture. Decision: add fields behind the existing `version: 1` envelope with a
migration that treats absent fields as `false`/`null`. **Do not bump the version** —
old browsers reading new data must degrade, not break.

### AD-2 — Every new control needs a destination, or it does not ship
`messages.tsx` already removed the thumbs-up/down buttons because they toggled in
memory, reached nobody, and vanished on reload. That judgement was correct and it is
the rule for this plan: a control that collects a signal the studio cannot receive is
worse than no control. Feedback returns only as part of Task 12, together with the
place the feedback goes.

### AD-3 — Composer attachments stay client-side
The deployment targets Cloudflare (`cf:build`) and there is no object storage. An
attachment feature that uploads would need new infrastructure and a cost. Decision:
attachments are read to a data URL in the browser, capped hard (1 file, ≤ 2 MB, images
only), and sent as an image part on the next message. No new service, no storage bill.

### AD-4 — Audits get a single bootstrap
The audit suite silently needs three things that are not written down anywhere:
a production build in `.next`, a Chrome with CDP on `:9222`, and a server on `:3100`.
Run without them, six of the twelve audits fail with `ECONNREFUSED` or "Hakuna CSS
iliyojengwa" — which reads like a broken suite rather than a missing prerequisite.
Decision: one script, `tools/audit-env.sh`, that starts what is missing and then runs
everything. The gate must be runnable in one command or it will not be run.

### AD-5 — Verified against production, never the dev server
Two sessions were lost to dev/prod differences: React 19 dev hydration drops
`metadata`-export tags (fake SEO failure), and `pnpm build` while `next dev` runs
replaces `.next` under the dev server (composer appeared to vanish). All UI
verification in this plan runs against `next start`, with `.next/BUILD_ID` mtime
checked before trusting any build result.

---

## Audit Findings

### Defects found (fix these — they are wrong today)

| # | Finding | Evidence | Severity |
|---|---|---|---|
| D-1 | Stray `/Users/imac/package-lock.json` breaks workspace-root inference | `next build` warns "We detected multiple lockfiles and selected the directory of /Users/imac/package-lock.json" | Medium — wrong file tracing in deploys |
| D-2 | `audit:deps` reports `@tailwindcss/container-queries` as "declared, never imported" | It *is* imported: `tailwind.config.ts:9`, used at `:226` | Low — a false positive in the gate trains people to ignore it |
| D-3 | Three CSS custom properties defined and never used | `audit:css`: `--k-void`, `--k-elev-1`, `--k-elev-5` | Low — dead tokens; `--k-elev-1/5` became dead when the sidebar moved to `elev-4` |
| D-4 | Six audits fail with `ECONNREFUSED` / "Hakuna CSS" when prerequisites are absent | `audit:a11y`, `:layout`, `:answers`, `simulate:clients` → `:9222`/`:3100`; `audit:classes`, `:css` → no build | Medium — the gate is unusable from a cold checkout |
| D-5 | `admin/page.tsx` is 840 lines, `offline-answers.ts` is 1,118 | `wc -l` | Low — maintainability only |
| D-6 | No `outputFileTracingRoot` set despite a multi-lockfile environment | same as D-1 | Medium |

### Gaps against ChatGPT (ranked by user value)

| # | Missing feature | Why it matters here specifically |
|---|---|---|
| G-1 | **Edit a sent message and resend** | The single most-used ChatGPT power feature. A customer who typo's "sendof" gets a wrong answer and must retype everything. |
| G-2 | **Search conversations** | History caps at 40 conversations. Today the only way to find one is to scan a list. |
| G-3 | **Rename a conversation** | Titles are auto-derived from the first 46 chars of the first question. Two questions starting "Nahitaji..." produce two identical rows. |
| G-4 | **Attach an image** | This is a *photo and video studio*. A customer with a reference photo has no way to show it. Highest-value gap in the list. |
| G-5 | **Voice input** | Phone-first market; Swahili typing on a phone keyboard is slow. Also the highest-effort item (needs `MediaRecorder` + a transcription endpoint). |
| G-6 | **Keyboard shortcuts / command palette** | `Cmd+K`, `Cmd+Shift+O`. Desktop users expect them; today every action needs the mouse. |
| G-7 | **Message feedback with a destination** | Deliberately removed for being fake. Returning it *with* somewhere to go makes it honest and gives the owner signal. |
| G-8 | **Export / share a conversation** | The studio needs to hand a thread to a colleague, or a customer wants to keep it. |
| G-9 | **Pin a conversation** | Pinned items must survive the 40-conversation cap, which today evicts by recency. |
| G-10 | **Unread count on the scroll control** | The control exists but says nothing about *how much* is below. |
| G-11 | **Message timestamps** | Stored (`createdAt`/`updatedAt` on the conversation) but never shown per message. |
| G-12 | **Draft persistence per conversation** | Composer state is owned by the assistant-ui runtime, which is **remounted on every conversation switch** (`chat-runtime.tsx` line 19–20, keyed by id). Half-typed text is destroyed by a sidebar click. |

### What is already right (do not touch)

Measured contrast hierarchy (cards 1.42:1 · composer 1.309:1 · buttons 1.22:1 ·
sidebar 1.172:1, documented in `app-shell.tsx`); the studio level meter
(`live-room-indicator.tsx`, 560×104px, 40 bars, 10.46:1); code fences with language
plate + copy (`markdown-text.tsx`); `tel:` link allowlist with the DOM-level reason
recorded; the focus-trap/inert ordering comment; branch picker; error state that offers
WhatsApp; the offline-answer intent taxonomy; the `backwards`-fill welcome stagger.

---

## Task List

### Phase 1 — Foundations and correctness (no user-visible features)

- [ ] **Task 1: Fix the workspace-root and lockfile defect** — D-1, D-6
  Set `outputFileTracingRoot` in `next.config.ts`; report the stray
  `/Users/imac/package-lock.json` to the user rather than deleting a file outside the
  repo. *Acceptance:* `pnpm build` emits no workspace-root warning.
  *Verification:* build log clean; `pnpm test` 195/195. *Files:* `next.config.ts`.
  *Scope:* XS.

- [ ] **Task 2: Make the audit gate runnable in one command** — D-4
  Add `tools/audit-env.sh` + `pnpm audit:all`: detect and start missing prerequisites
  (prod build, Chrome CDP `:9222`, server `:3100`), then run all twelve audits and
  print one pass/fail table. *Acceptance:* a cold checkout runs everything with one
  command; a missing prerequisite is named, not surfaced as `ECONNREFUSED`.
  *Verification:* run from clean state, all audits reach a real verdict.
  *Files:* `tools/audit-env.sh`, `package.json`. *Scope:* M.

- [ ] **Task 3: Clear the false positive and the dead tokens** — D-2, D-3
  Teach `audit-deps.mjs` that a package referenced from `tailwind.config.ts` counts as
  imported; remove `--k-void`, `--k-elev-1`, `--k-elev-5` (confirm each has no reader
  first). *Acceptance:* `audit:deps` and `audit:css` both PASS with an empty
  exceptions list. *Verification:* both audits green; contrast values unchanged.
  *Files:* `tools/audit-deps.mjs`, `src/app/globals.css`. *Scope:* S.
  *Risk:* removing an elevation step could change the sidebar — it reads `--k-elev-4`.
  Re-measure the four surfaces after.

### Checkpoint A (after Tasks 1–3)
- [ ] `pnpm check` passes from a cold start
- [ ] `pnpm audit:all` runs every audit and reports every verdict
- [ ] Contrast hierarchy still measures 1.42 / 1.31 / 1.22 / 1.17
- [ ] **Review with the user before Phase 2**

### Phase 2 — Conversation management (the workspace layer)

- [ ] **Task 4: Extend the store with rename, pin, archive** — AD-1
  Add `pinned?: boolean`, `archived?: boolean`, and a `rename(id, title)` action. All
  optional; absent means false. Pin survives the `MAX_CONVERSATIONS` eviction in
  `saveStore` (currently a pure recency slice). *Acceptance:* renaming survives a
  reload; a pinned conversation is never evicted; a 20-conversation store with 5
  pinned keeps all 5. *Verification:* new unit tests in `tests/conversations.test.ts`.
  *Files:* `src/lib/conversations.ts`, `src/components/chat/conversations-provider.tsx`.
  *Scope:* M.

- [ ] **Task 5: Rename in the sidebar** — G-3, depends on Task 4
  Inline edit in `ConversationRow`: a pencil on the active row, an `<input>` in place of
  the title, Enter commits, Escape cancels, blur commits. Keyboard-only reachable.
  *Acceptance:* rename by mouse and by keyboard; Escape restores; empty title reverts to
  the derived one rather than showing blank. *Verification:* axe 0 violations; 16-stop
  tab traversal still passes. *Files:* `src/components/layout/app-shell.tsx`. *Scope:* M.

- [ ] **Task 6: Search conversations** — G-2, depends on Task 4
  A search field above the history, filtering on title and message text. Group headers
  collapse to a flat "Matokeo" list while a query is active; matches highlighted.
  *Acceptance:* typing filters within one frame; clearing restores grouping; no results
  state names the query. *Verification:* filter a 40-conversation store by a word that
  appears only in a message body. *Files:* `app-shell.tsx`, `lib/conversations.ts`.
  *Scope:* M.

- [ ] **Task 7: Pin and archive** — G-9, depends on Task 4
  Pinned group above "Leo", and an "Archived" section at the bottom, collapsed by
  default. *Acceptance:* pinned items always at the top; archived items never appear in
  recency groups. *Verification:* unit tests on `groupByRecency` with pinned +
  archived inputs. *Files:* `lib/conversations.ts`, `app-shell.tsx`. *Scope:* M.

### Checkpoint B (after Tasks 4–7)
- [ ] Rename / search / pin / archive all survive reload
- [ ] `tests/conversations.test.ts` extended and green
- [ ] Sidebar still shows ~9 rows on a 393px phone (no regressions from the new controls)
- [ ] **Review with the user before Phase 3**

### Phase 3 — Message-level interaction (the ChatGPT habits)

- [ ] **Task 8: Edit a sent message and resend** — G-1
  `MessagePrimitive.Root` for the user role gains an Edit control. Editing reverses the
  thread to that message and re-submits, which is what `BranchPickerPrimitive`
  (already present) is for: the regenerated answer becomes branch 2 of N.
  *Acceptance:* edit → resend produces a new branch; the original branch is still
  reachable with `<` `>`; the count reads `2 / 2`. *Verification:* edit a message, then
  navigate back to branch 1 and confirm the original text is intact. *Files:*
  `src/components/chat/messages.tsx`. *Scope:* M. *Risk:* branch state must persist to
  `localStorage` — check what the stored shape does with branches before writing code.

- [ ] **Task 9: Per-conversation drafts** — G-12
  Persist composer text per conversation id; restore on remount. The runtime is keyed by
  id, so this has to live outside it. *Acceptance:* type, switch conversation, switch
  back, text is there. *Verification:* the same by reload mid-draft. *Files:*
  `conversations-provider.tsx`, `composer.tsx`. *Scope:* S.

- [ ] **Task 10: Timestamps and the unread count** — G-10, G-11
  Show a per-message time on hover (desktop) / always (mobile, muted), and a count on
  the scroll-to-bottom control when the user is scrolled away and content is arriving.
  *Acceptance:* the count is right; it disappears at the bottom; timestamps use the
  existing `formatRelative` register. *Verification:* scroll up mid-stream, count
  increments. *Files:* `messages.tsx`, `thread.tsx`. *Scope:* S.

- [ ] **Task 11: Export a conversation** — G-8
  Download as Markdown and copy-as-text. Client-side only, from the stored document.
  *Acceptance:* the exported Markdown round-trips the thread in reading order with roles
  labelled. *Verification:* open the download, check a known message. *Files:*
  `lib/conversations.ts`, `app-shell.tsx`. *Scope:* S.

### Checkpoint C (after Tasks 8–11)
- [ ] Edit/resend/branch works and branches survive reload
- [ ] Drafts survive conversation switching and reload
- [ ] **Review with the user before Phase 4**

### Phase 4 — Input surface (highest user value, highest risk)

- [ ] **Task 12: Image attachment** — G-4, AD-3
  Attach button in the composer, one image, ≤ 2 MB, sent as an image part. Thumbnail with
  a remove control before sending. *Acceptance:* a 1.8 MB JPEG attaches and sends; a
  3 MB file is refused with a message naming the limit; the thumbnail is removable.
  *Verification:* send a real image and confirm it reaches `/api/chat` as a part.
  *Files:* `composer.tsx`, `api/chat/route.ts` (accept the part), `chat-runtime.tsx`.
  *Scope:* M. *Risk:* **the model must accept images.** Confirm the configured
  `GEMINI_CHAIN` models are vision-capable before building the UI — a control that sends
  an image to a text-only model is a bug, not a feature.

- [ ] **Task 13: Message feedback with a destination** — G-7, AD-2
  Only after there is somewhere for it to go. Thumbs return as a written row the owner
  can read in `/admin`, or as a WhatsApp hand-off that carries the question and answer.
  *Acceptance:* a thumb-down from a customer is visible to the owner without the customer
  doing anything else. *Verification:* submit feedback, read it back in `/admin`.
  *Files:* `messages.tsx`, `admin/page.tsx`, a new `api/feedback/route.ts`. *Scope:* M.

- [ ] **Task 14: Keyboard shortcuts + command palette** — G-6
  `Cmd/Ctrl+K` opens a palette (new chat, search, jump to a conversation, open admin);
  `Cmd/Ctrl+Shift+O` starts a new chat. `?` lists shortcuts.
  *Acceptance:* every listed shortcut is reachable by keyboard alone; Escape closes the
  palette and returns focus. *Verification:* perform a full flow without a mouse.
  *Files:* a new `components/layout/command-palette.tsx`, `app-shell.tsx`. *Scope:* M.

- [ ] **Task 15: Voice input** — G-5
  `MediaRecorder` → a transcription call → text into the composer. Own task because it
  is the only item needing a new server capability.
  *Acceptance:* hold-to-record, release, text appears; permission denied leaves the
  composer untouched and says why. *Verification:* record a Swahili sentence on a phone
  and check the transcription. *Files:* `composer.tsx`, `api/transcribe/route.ts`.
  *Scope:* L → **split at implementation time.** *Risk:* needs a transcription provider
  or a local model; confirm which with the user before starting.

### Checkpoint D (final)
- [ ] All twelve audits green via `pnpm audit:all`
- [ ] `pnpm test` extended and passing
- [ ] Lighthouse ≥ 100 accessibility on `/` and `/admin`, desktop and mobile
- [ ] axe 0 violations at 320 / 393 / 768 / 1024 / 1440
- [ ] Full keyboard traversal of every new control
- [ ] Contrast re-measured on every surface that changed
- [ ] **Review with the user**

### Phase 5 — Structure (only if the user wants it)

- [ ] **Task 16: Split the two oversized files** — D-5
  `admin/page.tsx` (840) and `offline-answers.ts` (1118) into focused modules.
  *Acceptance:* behaviour identical, tests untouched and green. *Scope:* M.
  **Not urgent. Do this only if asked** — it risks churn for no user-visible gain.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| New sidebar controls regress the phone row height (9 rows today) | High — the owner already called an earlier version "a mess" | Count rows at 393px after each sidebar task; the row is one line by design |
| Branches inflate the `localStorage` document past quota | Medium | Cap branches per message; the store already halves-and-retries on quota |
| Image attachments to a text-only model | High — silent wrong answers | Verify vision capability in `GEMINI_CHAIN` **before** building the UI |
| Voice input needs infrastructure the project does not have | Medium | Confirm provider with the user before starting; last in the order |
| Touching `globals.css` elevation tokens shifts measured contrast | Medium | Re-measure the four surfaces after Task 3 and at every checkpoint |
| Dev/prod differences produce false audit results | High — two sessions already lost to this | AD-5: verify against `next start` only; check `BUILD_ID` mtime |
| `pnpm build` while `next dev` runs corrupts `.next` | High | Never both at once; `audit:all` from Task 2 owns the sequencing |

## Open Questions

1. **Images to the model.** Is the configured `GEMINI_CHAIN` vision-capable? If not,
   Task 12 becomes "accept and store nothing" and should be cut.
2. **Transcription provider** for Task 15 — cloud API (cost per minute) or a local
   model on this iMac? The user has strong local-first and cost preferences.
3. **Feedback destination** for Task 13 — a row in `/admin`, or a WhatsApp hand-off, or
   both? This decides whether a new API route is needed.
4. **Scope confirmation.** Phases 2–4 are ~12 tasks. Does the user want all four phases,
   or Phase 2 + 3 first and then re-assess?
