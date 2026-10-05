/**
 * CSS audit.
 *
 * The class audit (`audit-classes.mjs`) answers "does every class a component
 * uses actually exist?". This answers the opposite question: "does every piece
 * of CSS actually get used, and is anything defined twice?"
 *
 * It exists because of a real bug. The ambient drift animation was defined in
 * two places — `drift-a` in tailwind.config.ts, which the `animate-drift-*`
 * utility reads, and `k-drift-a` in globals.css, which nothing read. The second
 * copy sat beside the other ambient CSS with the same name, shape and numbers,
 * so editing it looked like it worked and changed nothing. An afternoon went
 * into measuring an edit that had no effect.
 *
 * Three checks, all against the built stylesheet:
 *
 *   1. keyframes defined but never referenced   -> dead animation
 *   2. keyframes defined more than once         -> the edit trap
 *   3. custom properties never referenced       -> dead token
 *
 * Usage:  pnpm audit:css          (needs a build first)
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const CSS_DIR = join(ROOT, ".next", "static", "css");

const cssFiles = existsSync(CSS_DIR)
  ? readdirSync(CSS_DIR).filter((name) => name.endsWith(".css"))
  : [];

if (!cssFiles.length) {
  console.error(
    "Hakuna CSS iliyojengwa.\n\n" +
      "  pnpm build && pnpm audit:css\n",
  );
  process.exit(2);
}

const css = cssFiles.map((name) => readFileSync(join(CSS_DIR, name), "utf8")).join("\n");

/** Source text too, because tokens are used from inline styles as well. */
function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if ([".ts", ".tsx"].includes(extname(entry))) files.push(full);
  }
  return files;
}
const sourceText = walk(SRC)
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

/** Pull every `@keyframes NAME { ... }` block, counting duplicates. */
function collectKeyframes(text) {
  const seen = new Map();
  const re = /@keyframes\s+([A-Za-z0-9_-]+)\s*\{/g;
  let match;
  while ((match = re.exec(text))) {
    const name = match[1];
    // Walk braces to find the end of this block.
    let depth = 1;
    let i = re.lastIndex;
    while (i < text.length && depth > 0) {
      if (text[i] === "{") depth += 1;
      else if (text[i] === "}") depth -= 1;
      i += 1;
    }
    const block = text.slice(match.index, i);
    if (!seen.has(name)) seen.set(name, { count: 0, blocks: [] });
    const entry = seen.get(name);
    entry.count += 1;
    entry.blocks.push(block);
  }
  return seen;
}

const keyframes = collectKeyframes(css);

/** Everything outside the definition blocks — where a reference would live. */
function withoutKeyframeBlocks(text, name) {
  let out = text;
  for (const block of keyframes.get(name)?.blocks ?? []) {
    out = out.split(block).join("");
  }
  return out;
}

const deadKeyframes = [];
const duplicateKeyframes = [];

for (const [name, entry] of keyframes) {
  if (entry.count > 1) duplicateKeyframes.push({ name, count: entry.count });

  const rest = withoutKeyframeBlocks(css, name);
  // A reference is the bare name used as an animation, e.g. `animation:name ...`
  // or `animation-name:name`. Requiring the colon avoids matching a class name
  // that merely contains the animation name.
  const referenced = new RegExp(`animation(-name)?\\s*:[^;{}]*\\b${name}\\b`).test(rest);
  if (!referenced) deadKeyframes.push(name);
}

/** Custom properties defined in CSS, checked against both CSS and the source. */
const declared = new Map();
for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:/gi)) {
  const name = match[1];
  /*
   * Tailwind's own internals. It declares `--tw-*` on the universal selector
   * and sets them from individual utilities; whether every one is read back is
   * Tailwind's business, and reporting them buries the tokens we actually own.
   */
  if (name.startsWith("--tw-")) continue;
  if (!declared.has(name)) declared.set(name, 0);
  declared.set(name, declared.get(name) + 1);
}

const deadTokens = [];
for (const name of declared.keys()) {
  // `var(--name)` in CSS, or `"--name"` / `var(--name)` written from a component.
  const used =
    new RegExp(`var\\(\\s*${name}\\b`).test(css) ||
    css.includes(`"${name}"`) ||
    sourceText.includes(name);
  if (!used) deadTokens.push(name);
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

console.log(
  `${keyframes.size} keyframes, ${declared.size} custom properties, across ${cssFiles.length} stylesheet(s)\n`,
);

let failed = false;

if (deadKeyframes.length) {
  failed = true;
  console.log(`✗ ${deadKeyframes.length} keyframes hazitumiki (kode iliyokufa):\n`);
  for (const name of deadKeyframes) console.log(`   ${name}`);
  console.log("");
} else {
  console.log("✓ kila @keyframes inatumika");
}

if (duplicateKeyframes.length) {
  failed = true;
  console.log(`\n✗ ${duplicateKeyframes.length} keyframes zimefafanuliwa zaidi ya mara moja:\n`);
  for (const { name, count } of duplicateKeyframes) {
    console.log(`   ${name}  (mara ${count}) — kuhariri moja kunaweza kusiathiri kinachoonekana`);
  }
  console.log("");
} else {
  console.log("✓ hakuna @keyframes iliyofafanuliwa mara mbili");
}

if (deadTokens.length) {
  /*
   * A warning, not a failure — and deliberately not something this script
   * deletes.
   *
   * An unused keyframe is a trap, because a second copy of an animation
   * silently wins or loses. An unused token usually is not: `.safe-bottom`
   * exists in this project and reads `var(--safe-bottom)`, but Tailwind strips
   * rules for classes nothing uses, so the reference is not in the built
   * stylesheet. Reach for that utility tomorrow and the token had better still
   * be there.
   *
   * So this lists what to look at, and stops.
   */
  console.log(`\n! ${deadTokens.length} CSS variables hazitumiki kwenye CSS iliyojengwa:\n`);
  for (const name of deadTokens) console.log(`   ${name}`);
  console.log(
    "\n  Kumbuka: Tailwind huondoa utilities zisizotumika, kwa hiyo variable\n" +
      "  inaweza kuwa hai kwa matumizi ya baadaye. Usifute bila kuangalia.",
  );
} else {
  console.log("✓ kila CSS variable inatumika");
}

if (failed) {
  console.log("\nKode iliyokufa inaonekana kama inafanya kazi. Ndiyo hatari.");
  process.exitCode = 1;
}
