/**
 * Does the environment template match the code?
 *
 * A misspelled variable name is the quietest failure in the project. Nothing
 * throws, nothing logs, the feature simply is not there: `POL[ICY]_TOKEN` looks
 * set in the deploy settings and `/admin` refuses everyone, or a key is present
 * under one name while the code reads another and the assistant answers from
 * the offline list forever.
 *
 * Two directions, both worth knowing:
 *   · a variable the app reads that the template never mentions
 *   · a variable the template offers that nothing reads, which is a lie to
 *     whoever sets it
 *
 *   pnpm audit:env
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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

/*
 * Provided by the runtime rather than by the operator.
 *
 * `NODE_ENV` is set by Next, by Node, and by every test runner. Documenting it
 * in a template for the person deploying would be noise.
 */
const RUNTIME_PROVIDED = new Set(["NODE_ENV"]);

/*
 * Read by the audit tools themselves, not by the app.
 *
 * These are how someone points a tool at a different port or asks for more
 * runs; each tool's header says so. They do not belong in the template for a
 * deployment.
 */
const TOOL_ONLY = new Set(["APP_URL", "CDP_PORT", "RUNS", "SERVER_LOG", "TEMPERATURE"]);

let problems = 0;

console.log("Khaki AI — env dhidi ya code\n");

/* ------------------------------------------------------------------ */
/* What the app reads                                                  */
/* ------------------------------------------------------------------ */
const inApp = new Map();
const inTools = new Map();

for (const file of [...walk("src"), ...walk("tools")]) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
    const target = file.replace(/\\/g, "/").startsWith("src/") ? inApp : inTools;
    if (!target.has(match[1])) target.set(match[1], new Set());
    target.get(match[1]).add(file.replace(/\\/g, "/"));
  }
}

const template = readFileSync(".env.local.example", "utf8");
/*
 * Both forms count as documented.
 *
 * `KHAKI_SETTINGS_PATH` and `KHAKI_SECURE_COOKIES` are in the template with a
 * `#` in front, as optional lines you uncomment to use. The first version of
 * this only matched live assignments and reported both as missing from a file
 * that documents them perfectly well.
 *
 * Matched with `[ \t]` rather than `\s` so the pattern cannot run past the end
 * of a line: `GEMINI_API_KEY=` with nothing after it was reaching down and
 * taking the next comment as its value.
 */
const DECLARATION = /^[ \t]*#?[ \t]*([A-Z][A-Z0-9_]*)[ \t]*=/gm;

const documented = new Set([...template.matchAll(DECLARATION)].map((match) => match[1]));

console.log("variables the app reads");
for (const name of [...inApp.keys()].sort()) {
  if (RUNTIME_PROVIDED.has(name)) {
    console.log(`  · ${name}  (provided by the runtime)`);
    continue;
  }
  if (documented.has(name)) {
    console.log(`  ✓ ${name}`);
  } else {
    console.log(`  ✗ ${name} is read by src/ but missing from .env.local.example`);
    for (const file of inApp.get(name)) console.log(`      ${file}`);
    problems += 1;
  }
}

console.log("\nvariables the tools read");
for (const name of [...inTools.keys()].sort()) {
  if (inApp.has(name)) continue;
  console.log(`  ${TOOL_ONLY.has(name) ? "·" : "?"} ${name}${TOOL_ONLY.has(name) ? "  (tool control, not deployment)" : "  — not on the tool-control list"}`);
}

console.log("\ndocumented but read nowhere");
const offered = [...documented].filter((name) => !inApp.has(name) && !inTools.has(name)).sort();
if (offered.length === 0) {
  console.log("  ✓ every variable the template offers is read somewhere");
} else {
  for (const name of offered) {
    console.log(`  ✗ ${name} is offered by .env.local.example and read by nothing`);
    problems += 1;
  }
}

/* ------------------------------------------------------------------ */
/* The values the template ships must not be real secrets              */
/* ------------------------------------------------------------------ */
console.log("\nthe template carries no secrets");
const assigned = [...template.matchAll(/^[ \t]*([A-Z][A-Z0-9_]*)[ \t]*=[ \t]*(.*)$/gm)]
  .map((match) => ({ name: match[1], value: match[2].trim() }))
  .filter((entry) => entry.value.length > 0);
if (assigned.length === 0) {
  console.log("  ✓ every variable in the template is left empty");
} else {
  for (const entry of assigned) {
    // A phone number is public by design; anything else with a value is not.
    const isPublicNumber = entry.name === "NEXT_PUBLIC_WHATSAPP_NUMBER";
    console.log(`  ${isPublicNumber ? "·" : "✗"} ${entry.name}=${entry.value.slice(0, 24)}`);
    if (!isPublicNumber) problems += 1;
  }
}

console.log(`\n${problems === 0 ? "PASS — template na code zinalingana" : `FAIL — matatizo ${problems}`}`);
process.exit(problems === 0 ? 0 : 1);
