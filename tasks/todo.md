# Khaki AI — TODO

Plan: [`tasks/plan.md`](./plan.md) · Verified against `next start`, never `next dev`.

## Phase 1 — Foundations

- [x] **T1** Fix workspace-root + lockfile defect (D-1, D-6) — `outputFileTracingRoot` set, resolves from its own directory
- [x] **T2** `tools/audit-env.sh` + `pnpm audit:all` — bootstraps build/Chrome/prod, 13 audits, **exit-code verdicts**
- [x] **T3** `audit:deps` false positive fixed · dead tokens `--k-void`/`--k-elev-1`/`--k-elev-5` removed from CSS *and* the Tailwind scale

### Imefunuliwa na Phase 1 (findings mpya)
- [x] **N1** `audit-env.sh` v1 ilitumia string matching → iliripoti **false positives na false negatives kwa wakati mmoja**. Sasa exit codes.
- [x] **N2** README haikutaja `audit:all` (nilijisababishia) — imeandikwa, pamoja na kanuni mbili za build/dev
- [x] **N3** README ilidai "169 tests" wakati ni **195** — imesahihishwa
- [ ] **N4** ⚠️ `audit:answers` — majibu **3 kati ya 27** yalikubali kitu ambacho studio haikusema. **Inachunguzwa**
- [ ] **N5** ⚠️ `simulate:clients` exit 1 — **inachunguzwa**

### Checkpoint A
- [x] Struttura ya gate inafanya kazi kwa amri moja kutoka hali tupu
- [ ] `pnpm audit:all` yote 13 zinapita (inasubiri N4/N5)
- [ ] Contrast bado 1.42 / 1.31 / 1.22 / 1.17
- [ ] ⛔ Review na mtumiaji

## Phase 2 — Conversation management

- [ ] **T4** Store: `rename` / `pinned` / `archived` + pinned survives eviction
- [ ] **T5** Rename in sidebar (pencil → input → Enter/Escape)
- [ ] **T6** Search conversations (title + body, flat results while searching)
- [ ] **T7** Pin + archive groups

### Checkpoint B
- [ ] All survive reload · unit tests green · 9 rows still fit at 393px
- [ ] ⛔ Review with user

## Phase 3 — Message interaction

- [ ] **T8** Edit a sent message and resend (→ branch 2 of N)
- [ ] **T9** Per-conversation composer drafts
- [ ] **T10** Timestamps + unread count on scroll control
- [ ] **T11** Export conversation as Markdown

### Checkpoint C
- [ ] Branches survive reload · drafts survive switch + reload
- [ ] ⛔ Review with user

## Phase 4 — Input surface

- [ ] **T12** Image attachment (≤ 2 MB, data URL) — ⚠️ confirm vision-capable model first
- [ ] **T13** Feedback with a destination (needs admin row or WhatsApp hand-off)
- [ ] **T14** `Cmd/Ctrl+K` palette + shortcuts
- [ ] **T15** Voice input — ⚠️ confirm transcription provider first

### Checkpoint D (final)
- [ ] `pnpm audit:all` green
- [ ] Lighthouse ≥ 100 a11y on `/` and `/admin`, desktop + mobile
- [ ] axe 0 violations at 320/393/768/1024/1440
- [ ] Keyboard traversal of every new control
- [ ] Contrast re-measured
- [ ] ⛔ Review with user

## Phase 5 — Optional

- [ ] **T16** Split `admin/page.tsx` (840) + `offline-answers.ts` (1118) — *only if asked*

---

## Blocked on user decision

- [ ] Is the `GEMINI_CHAIN` model vision-capable? (decides T12)
- [ ] Transcription provider for T15: cloud API or local on this iMac?
- [ ] Feedback destination for T13: `/admin` row, WhatsApp, or both?
- [ ] All four phases, or Phase 2 + 3 and re-assess?
