/**
 * Exports nothing references at all.
 *
 * `persistRef` was a switch that could not be switched. `rename` is a function
 * nothing calls. Both read as live capability and both cost the next person a
 * minute of believing them.
 *
 * The first version of this counted references in *other* files only, which
 * reported 32 dead exports and was mostly wrong: `KhakiMarkProps` is the prop
 * type of the component declared beside it, `promptSections` is called by
 * `buildSystemPrompt` in the same file, and an exported type with no external
 * consumer is idiomatic rather than dead. A check that cries wolf gets ignored.
 *
 * What is worth reporting is narrower and unambiguous: a symbol whose name
 * appears on exactly one line in the entire codebase -- its own declaration.
 * That is dead by definition.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { extname, join } from "node:path";

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if ([".ts", ".tsx", ".mjs"].includes(extname(entry))) out.push(full);
  }
  return out;
}

const files = [...walk("src"), ...walk("tools"), ...walk("tests")];
const sources = files.map((file) => ({ file, lines: readFileSync(file, "utf8").split("\n") }));

/*
 * Names that are referenced by their own framework or by convention, so the
 * absence of a caller says nothing.
 */
const IGNORE = new Set([
  "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS",
  "default", "metadata", "viewport", "generateMetadata", "generateStaticParams",
  "runtime", "dynamic", "revalidate", "fetchCache", "dynamicParams", "maxDuration",
]);

const dead = [];

for (const { file, lines } of sources) {
  const declared = new Set();
  for (const [index, line] of lines.entries()) {
    const match =
      /^export\s+(?:async\s+)?(?:function|const|let|class|interface|type)\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (match) declared.add(`${index}:${match[1]}`);
  }

  for (const entry of declared) {
    const [indexText, name] = entry.split(":");
    if (IGNORE.has(name)) continue;

    const pattern = new RegExp(`\\b${name.replace(/[$]/g, "\\$")}\\b`);
    let references = 0;
    for (const source of sources) {
      for (const [lineIndex, line] of source.lines.entries()) {
        // The declaration itself does not count, wherever it is.
        if (source.file === file && lineIndex === Number(indexText)) continue;
        if (pattern.test(line)) references += 1;
      }
    }

    if (references === 0) dead.push({ name, file: file.replace(/\\/g, "/") });
  }
}

console.log("Khaki AI — exports ambazo hakuna marejeleo yoyote\n");
if (dead.length === 0) {
  console.log("  ✓ kila export inatajwa mahali pengine");
} else {
  for (const { name, file } of dead) console.log(`  ✗ ${name}  (${file})`);
}
console.log(`\n${dead.length === 0 ? "PASS" : `FAIL — ${dead.length} zisizotumika`}`);
process.exit(dead.length === 0 ? 0 : 1);
