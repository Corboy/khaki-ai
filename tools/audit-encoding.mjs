/**
 * Is every file still the text it was written as?
 *
 * The recurring hazard in this project is PowerShell. `Get-Content` without a
 * BOM reads UTF-8 as Windows-1252, and `WriteAllText` writes the result back,
 * so a round trip turns an em dash or a bullet into a short run of accented
 * letters, silently. It has happened five times: README.md, globals.css,
 * ambient-backdrop.tsx, check-studio-data.mjs and settings.test.ts. Each was
 * caught by eye, or by something else failing later.
 *
 * There was a checker, but it lived in a temp directory and only ran when
 * someone remembered to run it. This is that checker, in the repository, in
 * `pnpm check`.
 *
 * Three things, because they fail differently:
 *
 *   · bytes that are not valid UTF-8 at all -- a strict decode refuses them
 *   · the mojibake signature -- valid UTF-8 that used to be something else,
 *     which no decoder will complain about
 *   · a byte-order mark, which changes how a file is read by half the tools
 *     that touch it and appears in this project only by accident
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/*
 * Text files only. A binary pushed through a strict UTF-8 decoder fails for a
 * reason that has nothing to do with this check.
 */
const TEXT = new Set([".ts", ".tsx", ".mjs", ".js", ".json", ".md", ".css", ".yml", ".yaml", ".example", ".txt"]);
const SPECIAL = new Set([".env.local.example"]);

const files = [...walk("src"), ...walk("tools"), ...walk("tests"), ...walk("public")]
  .filter((file) => TEXT.has(extname(file)) || SPECIAL.has(file.split(/[\\/]/).pop() ?? ""))
  .concat(
    ["README.md", "package.json", "tsconfig.json", "tailwind.config.ts", "next.config.ts", "pnpm-workspace.yaml"].filter(
      existsSync,
    ),
  );

/*
 * What Windows-1252 does to a UTF-8 sequence.
 *
 * An em dash is three bytes; read as cp1252 the lead byte becomes a-circumflex
 * and the continuations become their own characters, so one punctuation mark
 * turns into a short run of accented letters. The same happens to a bullet and
 * to emoji.
 *
 * Built from code points rather than written out, because a file containing the
 * literal sequences would be reported by this check -- starting with this file,
 * whose first draft quoted them in a comment and flagged itself.
 */
const MOJIBAKE = new RegExp(
  [
    "\\u00e2\\u20ac", // the usual opener
    "\\u00e2\\u2020",
    "\\u00c3[\\u0080-\\u00bf]", // c3 XX
    "\\u00c2[\\u0080-\\u00bf]", // c2 XX
    "\\u00f0\\u009f", // f0 9f -- the first bytes of most emoji
  ].join("|"),
);

let problems = 0;
const decoded = [];

for (const file of files) {
  const bytes = readFileSync(file);
  const label = file.replace(/\\/g, "/");

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    console.log(`  ✗ ${label} starts with a byte-order mark`);
    problems += 1;
  }

  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    console.log(`  ✗ ${label} is not valid UTF-8`);
    problems += 1;
    continue;
  }

  const hit = MOJIBAKE.exec(text);
  if (hit) {
    const line = text.slice(0, hit.index).split("\n").length;
    console.log(`  ✗ ${label}:${line} looks like it was round-tripped through Windows-1252 — ${JSON.stringify(hit[0])}`);
    problems += 1;
  }

  // A lone surrogate survives some decoders and breaks others.
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text)) {
    console.log(`  ✗ ${label} contains a lone surrogate`);
    problems += 1;
  }

  decoded.push({ label, text });
}

console.log(`Khaki AI — usafi wa maandishi\n`);
console.log(`  files ${decoded.length}${problems === 0 ? "  ·  zote ni UTF-8 safi" : ""}`);

/*
 * A file that changed only in its encoding is the case this exists for, so the
 * accented and Dashes are counted rather than assumed.
 */
const nonAscii = decoded.reduce((sum, entry) => sum + (entry.text.match(/[^\x00-\x7F]/g)?.length ?? 0), 0);
console.log(`  non-ASCII characters across the tree: ${nonAscii}`);

console.log(`\n${problems === 0 ? "PASS — hakuna uharibifu wa maandishi" : `FAIL — matatizo ${problems}`}`);
process.exit(problems === 0 ? 0 : 1);
