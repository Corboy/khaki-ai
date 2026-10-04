/**
 * Tailwind class audit.
 *
 * Tailwind drops any utility it cannot resolve, silently. That is how a design
 * ends up with rings that are blue instead of gold, or a sidebar that ignores
 * its own width — the markup looks right and the CSS simply is not there.
 *
 * This script extracts every class token used in `src/`, then checks each one
 * against the compiled stylesheet, and reports the ones that produced nothing.
 *
 *   node tools/audit-classes.mjs
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const CSS_DIR = join(ROOT, ".next", "static", "css");

/* ------------------------------------------------------------------ */
/* Collect every class token from the source                           */
/* ------------------------------------------------------------------ */

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if ([".tsx", ".ts"].includes(extname(entry))) files.push(full);
  }
  return files;
}

const CLASS_ATTR = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{cn\(([\s\S]*?)\)\})/g;
const STRING_LITERAL = /"([^"]*)"|'([^']*)'|`([^`]*)`/g;

const tokens = new Set();

for (const file of walk(SRC)) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(CLASS_ATTR)) {
    const blob = match[1] ?? match[2] ?? match[3] ?? "";
    const strings = match[3] ? [...blob.matchAll(STRING_LITERAL)].map((m) => m[1] ?? m[2] ?? m[3] ?? "") : [blob];
    for (const chunk of strings) {
      for (const token of chunk.split(/\s+/)) {
        if (token) tokens.add(token);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Load the compiled stylesheet                                        */
/* ------------------------------------------------------------------ */

const cssFiles = existsSync(CSS_DIR)
  ? readdirSync(CSS_DIR).filter((name) => name.endsWith(".css"))
  : [];

if (!cssFiles.length) {
  console.error(
    "Hakuna CSS iliyojengwa.\n\n" +
      "Zana hii inakagua classes dhidi ya stylesheet halisi, kwa hiyo inahitaji\n" +
      "build kwanza:\n\n" +
      "  pnpm build && pnpm audit:classes\n",
  );
  process.exit(2);
}

const css = cssFiles
  .map((name) => readFileSync(join(CSS_DIR, name), "utf8"))
  // Tailwind escapes commas inside arbitrary values as the CSS unicode escape
  // `\2c `, so normalise before comparing.
  .join("\n")
  .replace(/\\2c /g, ",");

/** Escapes a class the way Tailwind writes it into the stylesheet.
 *  Commas are pre-normalised above, so they are left alone here. */
function selectorFor(token) {
  return "." + token.replace(/[.:/[\]()%#!*+&>~='"^$|?@{}]/g, (char) => `\\${char}`);
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

const missing = [];
const NOT_A_CLASS = new Set(["circle", "ok", "square", "ghost", "solid", "gold", "stacked", "inline", "gemini", "openai", "builtin", "quiet", "active", "token", "loopback"]);

for (const token of [...tokens].sort()) {
  // Skip tokens that are clearly not utilities.
  if (/^(group|peer)(\/|$)/.test(token)) continue;
  if (token.startsWith("data-") || token.startsWith("aria-")) continue;
  if (NOT_A_CLASS.has(token)) continue;
  if (!css.includes(selectorFor(token))) missing.push(token);
}

console.log(`scanned ${tokens.size} distinct class tokens across src/\n`);

if (!missing.length) {
  console.log("✓ every class resolved to CSS");
} else {
  console.log(`✗ ${missing.length} class token(s) produced no CSS:\n`);
  for (const token of missing) console.log("   " + token);
}

/* ------------------------------------------------------------------ */
/* tailwind-merge safety net                                           */
/* ------------------------------------------------------------------ */

/**
 * `cn()` merges classes, and tailwind-merge drops any class it believes is
 * overridden by a later one in the same group. A custom utility that merely
 * *looks* like a Tailwind one (`bg-brass`) is silently deleted, which is how a
 * gold button ends up as black text on nothing.
 *
 * Only unconditional `cn(...)` calls are replayed. A call containing a ternary
 * holds mutually exclusive branches — `active ? "text-gold-200" : "text-ink"` —
 * which never apply at the same time, so merging them together would report a
 * conflict that cannot happen.
 */
const { twMerge } = await import("tailwind-merge");

const CN_CALL = /cn\(([\s\S]{0,800}?)\)/g;
const dropped = new Map();
let skippedConditional = 0;

for (const file of walk(SRC)) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(CN_CALL)) {
    const blob = match[1];
    if (blob.includes("?")) {
      skippedConditional += 1;
      continue;
    }

    const literals = [...blob.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)]
      .map((m) => m[1] ?? m[2] ?? m[3] ?? "")
      .filter(Boolean);
    if (literals.length < 2) continue;

    const input = literals.flatMap((chunk) => chunk.split(/\s+/)).filter(Boolean);
    const output = new Set(twMerge(...literals).split(/\s+/).filter(Boolean));

    for (const token of input) {
      if (output.has(token)) continue;
      if (!dropped.has(token)) dropped.set(token, new Set());
      dropped.get(token).add(file.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
    }
  }
}

if (!dropped.size) {
  console.log(
    `✓ nothing dropped by tailwind-merge (${skippedConditional} conditional cn() call(s) skipped)`,
  );
} else {
  console.log(`\n✗ ${dropped.size} class token(s) are silently dropped by cn():\n`);
  for (const [token, files] of dropped) {
    console.log(`   ${token}  ←  ${[...files].join(", ")}`);
  }
}
