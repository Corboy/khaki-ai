# Khaki AI Mobile-First Chat Shell Redesign

**Status:** Design proposal — implementation not started
**Date:** 2026-10-24
**Audience:** Khaki Media customers on iOS Safari, Android Chrome, and desktop web

## Decision

Khaki AI will borrow the **interaction architecture** of ChatGPT and Vercel's Chatbot template, not their branding or their full feature set. The product remains a Swahili-first Khaki Media assistant with one primary job: help a visitor ask about services, prices, or booking and then take the next useful action.

The mobile experience is the source of truth. Desktop gets the same simple flow with a wider conversation surface and a persistent history rail.

## Comparison verdict

### Adopt from Vercel Chatbot

- Separate conversation navigation from the active chat shell.
- Keep a bounded `dvh` flex layout: header, transcript, composer.
- Follow streaming output only while the reader is already at the bottom.
- Use observer-based scroll handling and an explicit jump-to-latest control.
- Treat the composer as a real form with explicit loading, stop, send, and IME states.
- Close mobile navigation immediately after selecting a conversation or starting a new one.
- Use compact, horizontally scrollable suggestions on narrow screens.

### Keep from Khaki AI

- Per-conversation local drafts.
- Safe-area handling for the composer and drawer footer.
- The labelled mobile drawer, focus trap, Escape handling, inert subtree, and focus return.
- 16px composer text, 44px primary send/stop target, reduced-motion support, Swahili labels, and Khaki's obsidian/brass identity.
- Local-first conversation persistence and deterministic runtime remounts.

### Reject from Vercel Chatbot

- Model selector, visibility selector, artifacts, file-upload menu, and other template features that do not serve a Khaki customer.
- Global draft storage under one key.
- Global mobile zoom restrictions.
- Focus-outline removal without a replacement.
- A split artifact pane on phones.
- Unverified optimistic destructive actions.

## Product job and hierarchy

The first screen must answer this question immediately: **“Ninauliza wapi kuhusu Khaki Media?”**

Hierarchy, in order:

1. Composer: ask a question.
2. Two or three prompt starters: help the first question without creating a dashboard.
3. Assistant answer and action: price, service explanation, booking, or contact.
4. Conversation history: secondary navigation.
5. Contact and studio settings: secondary support, never competing with the chat.

## Proposed mobile shell

```text
┌──────────────────────────────┐
│ ☰  Khaki AI       +          │  compact header
├──────────────────────────────┤
│                              │
│       Karibu Khaki Media     │  compact welcome
│   Uliza kuhusu huduma, bei   │
│        au booking.            │
│                              │
│  Bei za packages · Booking   │  2–3 compact starters
│  Huduma tunazotoa            │
│                              │
│                              │
│  ┌────────────────────────┐  │
│  │ Andika ujumbe...    ↑  │  │  keyboard-safe composer
│  └────────────────────────┘  │
└──────────────────────────────┘
```

### Header

- Mobile: menu, current conversation identity, new chat, and at most one essential secondary action.
- Remove appearance controls from the primary header.
- Show the active conversation title on mobile after a thread has messages.
- Desktop may keep the rail toggle and a compact appearance/settings entry.

### Drawer

The mobile drawer is a focused navigation sheet:

1. New chat.
2. Recent conversations.
3. Search / all conversations once history exists.
4. Bottom section: one contact CTA and studio settings.

Move address, social links, appearance controls, and secondary contact variants out of the main navigation path. Preserve the existing focus trap, Escape/backdrop close, inert handling, focus return, and close-on-navigation behavior.

### Welcome state

Replace the current hero stack, four large cards, status chip, marquee, address, phone, and social row with:

- A smaller Khaki mark.
- One concise Swahili value proposition.
- The composer close to the first viewport.
- Two or three compact prompt starters.

Starters should either fill the composer for editing or clearly communicate that they send immediately. Default recommendation: fill the composer, because a touch mis-tap should not start a request unexpectedly.

The service marquee is removed from the primary path. If the service list is still useful, show a static, accessible one-line summary below the first interaction or inside the drawer.

## Composer, keyboard, and scrolling contract

### Keyboard-safe layout

- Keep `100dvh`, `viewport-fit=cover`, and non-disabled pinch zoom.
- Add a `visualViewport` fallback for browsers that do not consistently resize the layout when the keyboard opens.
- Expose the actual composer height as a CSS variable and apply matching transcript `scroll-padding-bottom`.
- Cap multiline input by available visual height, not a fixed `42vh`.
- The send/stop action and the last draft line must remain visible on iOS Safari and Android Chrome.
- Do not autofocus on mobile conversation switches.

### Input behavior

- Keep 16px text to prevent iOS focus zoom.
- Keep a 44px send/stop target.
- Preserve per-conversation draft persistence.
- Keep desktop Enter-to-send / Shift+Enter-newline if it remains clear; on mobile, prioritize predictable multiline typing and the visible send button.
- Preserve IME composition behavior if the composer is expanded.

### Transcript behavior

- Follow a stream only while the reader is at the bottom.
- If the reader scrolls away, never steal the reading position.
- Show a 44px jump-to-latest control with an accurate unread count.
- Ensure the composer never hides the latest answer or tool card.
- Verify turn anchoring with a long streaming response before shipping.

## Visual system

Keep:

- Obsidian-black room.
- Restrained brass/gold accent.
- Khaki mark and Swahili-first copy.
- One clear brass emphasis point per screen.

Reduce:

- Always-on ambient blur and large backdrop layers on constrained devices.
- Orbiting rings, infinite marquee, cursor spotlight, repeated sheen, and simultaneous glow effects.
- Card count and border density.

Use semantic surfaces and quiet elevation. Content should be the visual focus; decoration should communicate state, not compete with the question and answer.

## Touch and accessibility contract

- Frequently used mobile actions must have a 44×44 CSS pixel target: menu, close, new chat, row actions, clear search, jump-to-latest, copy, regenerate, and recovery actions.
- Keep visible `:focus-visible` rings and native interactive elements.
- Add a real skip link to the main conversation landmark.
- For row actions, either implement expected menu keyboard navigation and focus movement, or replace `role="menu"` with a simpler labelled action popover.
- Keep dynamic send, copy, error, and drawer state announcements intentional and concise.
- Preserve `prefers-reduced-motion`; disable marquee/orbit/shimmer and smooth programmatic scrolling when requested.
- Do not disable pinch zoom.

## Desktop behavior

- Keep a persistent history rail at large widths.
- Keep the active chat bounded to a readable measure.
- Use the same simplified welcome and composer hierarchy as mobile.
- Allow appearance controls only as a secondary desktop affordance; they must not duplicate in header and page overlay.
- Do not add desktop-only features that make the mobile model more complex.

## Out of scope for this redesign

- OmniVoice or any new voice provider.
- Model selection.
- Authentication or server-side conversation sync.
- File attachments.
- Artifacts or split document panes.
- New business services, pricing, or AI behavior.
- Rebranding Khaki Media.

## Implementation slices

### Slice 1 — Mobile shell foundation

- Keyboard-safe visual viewport handling.
- Composer height variable and transcript scroll padding.
- 44px touch target audit for primary mobile controls.
- Mobile active conversation identity.

**Acceptance:** The composer and send/stop action remain fully visible with the keyboard open; no page-level scroll is introduced; active thread identity is clear.

### Slice 2 — Welcome and primary path

- Replace the tall marketing welcome with compact chat-first welcome.
- Replace large auto-send cards with two or three compact starters.
- Remove marquee and move secondary contact information out of the first viewport.

**Acceptance:** At 320px, 375px, 390px, and 414px widths, the first viewport presents the value proposition, composer, and starters without making the user scroll through marketing content.

### Slice 3 — Drawer and navigation simplification

- Reduce drawer to new chat, recent/all conversations, and a secondary footer.
- Make search behavior consistent once history exists.
- Preserve and verify focus trap, Escape, backdrop close, inert, and focus return.
- Fix row-action semantics and focus movement.

**Acceptance:** A user can open the drawer, move focus through it, select a thread, and return to the composer without losing a draft.

### Slice 4 — Visual restraint and responsive finish

- Reduce mobile compositing and always-on animation.
- Remove duplicated appearance controls.
- Preserve Khaki identity with fewer effects.
- Add skip link, meta description, and form `id`/`name` semantics.

**Acceptance:** Lighthouse remains clean for accessibility and best practices; reduced-motion mode has no decorative loops; the product reads as one calm chat surface on mobile and desktop.

## Verification matrix

- Viewports: 320×800, 375×812, 390×844, 414×896, 430×932, 768×1024, 1024×768, 1440×900.
- iOS Safari: keyboard closed/open, multiline draft, safe-area notch, drawer focus, VoiceOver.
- Android Chrome: keyboard closed/open, back gesture/drawer close, TalkBack, rotation.
- Flows: new chat, prompt starter, multiline draft, send, stop, stream while scrolled away, jump to latest, switch thread with draft, search, rename, archive, delete, copy, regenerate, error recovery.
- Modes: reduced motion, 200% text/zoom, slow network, empty history, long history.
- Gates: typecheck, focused tests, full tests, production build, Lighthouse accessibility/best practices, and manual device checks.

## Source references

- Vercel Chatbot commit reviewed: `c2f8235e1f3ea903ad8b7f61447c4f74164b5c58`.
- Vercel patterns: `components/chat/shell.tsx`, `components/chat/app-sidebar.tsx`, `components/chat/greeting.tsx`, `components/chat/suggested-actions.tsx`, `components/ai-elements/conversation.tsx`, `components/ai-elements/prompt-input.tsx`.
- Khaki patterns: `src/components/layout/app-shell.tsx`, `src/components/chat/welcome.tsx`, `src/components/chat/composer.tsx`, `src/components/chat/thread.tsx`, `src/components/chat/chat-runtime.tsx`, `src/app/layout.tsx`, `src/app/globals.css`.
- ChatGPT interaction references: OpenAI Help Center release notes, especially the simplified sidebar and unified composer updates.
