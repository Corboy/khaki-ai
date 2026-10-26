import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("ChatGPT-style Khaki chat UI contract", () => {
  it("keeps user turns in a neutral bubble instead of the metallic-gold card", () => {
    const messages = read("../src/components/chat/messages.tsx");
    const userMessage = messages.match(/<MessagePrimitive\.Root[\s\S]*?data-role="user"[\s\S]*?<\/MessagePrimitive\.Root>/)?.[0];

    assert.ok(userMessage, "user message primitive is present");
    assert.match(userMessage, /justify-end/);
    assert.match(userMessage, /bg-white\/\[0\.08\]/);
    assert.doesNotMatch(userMessage, /gold-rgb|metal-sweep|metal-fill|animate-/);
  });

  it("uses a small static Khaki mark for the accessible thinking status, not a Lottie robot", () => {
    const status = read("../src/components/brand/live-room-indicator.tsx");

    assert.match(status, /role="status"/);
    assert.match(status, /aria-live="polite"/);
    assert.match(status, /KhakiMark/);
    assert.doesNotMatch(status, /KhakiGlyph/);
    assert.doesNotMatch(status, /ThinkingRobot|khaki-thinking\.json|lottie-web/);
  });

  it("removes decorative looping and entrance animation from the public chat surface", () => {
    const chatSurface = [
      "../src/components/chat/messages.tsx",
      "../src/components/chat/composer.tsx",
      "../src/components/chat/thread.tsx",
      "../src/components/chat/welcome.tsx",
      "../src/components/chat/tool-cards.tsx",
      "../src/components/brand/live-room-indicator.tsx",
      "../src/components/brand/khaki-mark.tsx",
      "../src/components/ui/icon-button.tsx",
      "../src/components/layout/app-shell.tsx",
      "../src/components/brand/branded-fallback.tsx",
      "../src/app/not-found.tsx",
    ].map(read).join("\n");

    assert.doesNotMatch(chatSurface, /metal-sweep|animate-sheen|animate-wave|animate-caret|animate-halo|anim-rise|welcome-item/);
  });

  it("removes the active conversation title from the chat header but keeps history titles", () => {
    const shell = read("../src/components/layout/app-shell.tsx");

    assert.doesNotMatch(shell, /<ActiveConversationTitle\s*\/>/);
    assert.match(shell, /<HighlightedText text=\{conversation\.title\} query=\{query\} \/>/);
  });

  it("preserves the Khaki logo and accessible, keyboard-safe composer", () => {
    const shell = read("../src/components/layout/app-shell.tsx");
    const composer = read("../src/components/chat/composer.tsx");

    assert.match(shell, /KhakiMark/);
    assert.match(composer, /id="khaki-message"/);
    assert.match(composer, /name="message"/);
    assert.match(composer, /aria-label="Andika ujumbe"/);
    assert.match(composer, /h-11 w-11/);
    assert.match(composer, /ComposerPrimitive\.Send/);
    assert.match(composer, /ComposerPrimitive\.Cancel/);
  });

  it("does not keep a permanent keyboard-shortcut legend under the composer", () => {
    const thread = read("../src/components/chat/thread.tsx");

    assert.equal(thread.includes("Shift + Enter"), false);
  });

  it("uses a restrained design-system radius and readable placeholder", () => {
    const composer = read("../src/components/chat/composer.tsx");

    assert.ok(composer.includes('"rounded-lg border border-white/[0.09] bg-[#171717]"'));
    assert.ok(composer.includes('placeholder="Uliza kuhusu huduma…"'));
    assert.match(composer, /placeholder:text-ink-3/);
  });

  it("removes appearance and studio settings from the chat chrome but keeps service starters", () => {
    const shell = read("../src/components/layout/app-shell.tsx");
    const welcome = read("../src/components/chat/welcome.tsx");

    assert.doesNotMatch(shell, /StudioControls|AppearanceDisclosure|AppearancePanel|Mipangilio ya Studio|Mwonekano/);
    assert.doesNotMatch(shell, /href=["']\/admin["']/);
    assert.match(welcome, /KHAKI_CONFIG\.quickActions\.slice\(0,\s*3\)/);
    assert.match(welcome, /ThreadPrimitive\.Suggestion/);
  });
});
