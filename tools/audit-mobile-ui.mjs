#!/usr/bin/env node
/**
 * Mobile UI audit — checks for touch-target and duplication issues.
 * Run: node tools/audit-mobile-ui.mjs
 * Exit code: 0 = clean, 1 = findings
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.env.KHAKI_AUDIT_SRC || path.join(process.cwd(), "src"));
const FILES = {
  "app-shell": "components/layout/app-shell.tsx",
  "icon-button": "components/ui/icon-button.tsx",
  "messages": "components/chat/messages.tsx",
  "thread": "components/chat/thread.tsx",
  layout: "app/layout.tsx",
  admin: "app/admin/page.tsx",
  composer: "components/chat/composer.tsx",
  welcome: "components/chat/welcome.tsx",
  css: "app/globals.css",
};

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function findLines(content, pattern) {
  const lines = content.split("\n");
  const matches = [];
  lines.forEach((line, i) => {
    if (pattern.test(line)) {
      matches.push({ line: i + 1, text: line.trim() });
    }
  });
  return matches;
}

const findings = [];

// 1. Mobile social link with h-9 w-9
const appShell = read(FILES["app-shell"]);
const socialMatches = findLines(appShell, /className=.*h-9\s+w-9/);
if (socialMatches.length > 0) {
  findings.push({
    rule: "mobile-social-link-size",
    message: "Mobile social link uses h-9 w-9 (36px) — must be at least 44px",
    file: FILES["app-shell"],
    matches: socialMatches,
  });
}

// 2. Jump-to-latest button with h-9
const thread = read(FILES["thread"]);
const jumpMatches = findLines(thread, /className=.*\bh-9\b/);
if (jumpMatches.length > 0) {
  findings.push({
    rule: "jump-to-latest-size",
    message: "Jump-to-latest button uses h-9 (36px) — must be at least 44px",
    file: FILES["thread"],
    matches: jumpMatches,
  });
}

// 3. Search clear control with h-6 w-6
const searchClearMatches = findLines(appShell, /className=.*\bh-6\s+w-6\b/);
if (searchClearMatches.length > 0) {
  findings.push({
    rule: "search-clear-size",
    message: "Search clear control uses h-6 w-6 (24px) — must be at least 44px",
    file: FILES["app-shell"],
    matches: searchClearMatches,
  });
}

// Source-level accessibility contracts. Missing values report the file's first
// line because there is no source location for an absent element.
function requireSource(file, rule, pattern, message) {
  if (!pattern.test(read(file))) {
    findings.push({ rule, message, file, matches: [{ line: 1, text: "Required source contract missing" }] });
  }
}

requireSource(FILES.layout, "metadata-description", /\bdescription:\s*["'`][^"'`\n]+/, "Page metadata needs a non-empty description");
requireSource(FILES.composer, "composer-id", /\bid="khaki-message"/, "Composer textarea needs a stable id");
requireSource(FILES.composer, "composer-name", /\bname="message"/, "Composer textarea needs a form name");
requireSource(FILES.layout, "skip-link", /href="#main-content"/, "Keyboard skip link must target the chat landmark");
requireSource(FILES["app-shell"], "main-landmark", /<main\b[^>]*id="main-content"[^>]*tabIndex=\{-1\}/, "Chat landmark must be focusable by the skip link");
requireSource(FILES.admin, "admin-main-landmark", /<main\b[^>]*id="main-content"[^>]*tabIndex=\{-1\}/, "The shared skip link must work on the admin route too");
requireSource(FILES.css, "reduced-motion", /@media\s*\(prefers-reduced-motion:\s*reduce\)/, "Reduced motion requires an explicit media rule");
requireSource(FILES.css, "reduced-motion-scroll", /scroll-behavior:\s*auto\s*!important/, "Reduced motion must disable smooth scrolling");
requireSource(FILES.thread, "reduced-motion-jump", /behavior=\{reducedMotion\s*\?\s*"instant"\s*:\s*"smooth"\}/, "The explicit jump action must respect reduced motion");
const removedSettingsMatches = findLines(appShell, /StudioControls|AppearanceDisclosure|AppearancePanel|Mipangilio ya Studio|Mwonekano|href=["']\/admin["']/);
if (removedSettingsMatches.length > 0) {
  findings.push({
    rule: "chat-settings-removed",
    message: "The public chat shell must not expose appearance or studio settings",
    file: FILES["app-shell"],
    matches: removedSettingsMatches,
  });
}
requireSource(FILES["app-shell"], "single-contact", /<ContactActions\s+primaryOnly=\{Boolean\(onClose\)\}/, "Mobile drawer must show one primary contact path");
requireSource(FILES.welcome, "service-starters", /KHAKI_CONFIG\.quickActions\.slice\(0,\s*3\)/, "The welcome screen must keep its three service prompt starters");

// 5. IconButton sm size (h-9 w-9) used for frequent mobile targets that need 44px
const iconButton = read(FILES["icon-button"]);
const smSizeDef = findLines(iconButton, /sm:\s*["']h-9\s+w-9/);
if (smSizeDef.length > 0) {
  // Check where size="sm" is used in mobile-visible contexts
  const messages = read(FILES["messages"]);
  const smUsages = findLines(messages, /size=["']sm["']/);
  if (smUsages.length > 0) {
    findings.push({
      rule: "icon-button-sm-touch-target",
      message: `IconButton size="sm" (h-9 w-9 = 36px) used ${smUsages.length} time(s) in messages.tsx — frequent mobile targets need 44px minimum`,
      file: FILES["messages"],
      matches: smUsages,
    });
  }
}

// 6. Check for h-6 w-6 anywhere in mobile contexts
const allFiles = [FILES["app-shell"], FILES["icon-button"], FILES.messages, FILES.thread, FILES.composer];
for (const file of allFiles) {
  const content = read(file);
  const h6w6 = findLines(content, /\bh-6\s+w-6\b/);
  if (h6w6.length > 0) {
    findings.push({
      rule: "h6w6-touch-target",
      message: `Found h-6 w-6 (24px) touch target in ${file}`,
      file,
      matches: h6w6,
    });
  }
}

// 7. Check for h-9 w-9 anywhere in mobile contexts (excluding icon-button definition)
for (const file of allFiles) {
  if (file === FILES["icon-button"]) continue; // skip the definition
  const content = read(file);
  const h9w9 = findLines(content, /\bh-9\s+w-9\b/);
  if (h9w9.length > 0) {
    findings.push({
      rule: "h9w9-touch-target",
      message: `Found h-9 w-9 (36px) touch target in ${file}`,
      file,
      matches: h9w9,
    });
  }
}

// Report
if (findings.length === 0) {
  console.log("✓ Mobile UI audit passed — no violations found");
  process.exit(0);
}

console.log(`\n✗ Mobile UI audit failed — ${findings.length} violation(s):\n`);
for (const f of findings) {
  console.log(`[${f.rule}] ${f.message}`);
  console.log(`  File: ${f.file}`);
  for (const m of f.matches) {
    console.log(`  Line ${m.line}: ${m.text}`);
  }
  console.log("");
}

process.exit(1);