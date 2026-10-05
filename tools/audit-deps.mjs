/**
 * Does every import have a declared home?
 *
 * `nodeLinker: hoisted` is mandatory here -- Node cannot follow the junctions a
 * default pnpm layout creates on Windows. The trade is that anything in the
 * tree is resolvable from anywhere, so a package this project uses but never
 * declared still works, right up until the transitive dependency that happened
 * to provide it is dropped or moved. Then it breaks on someone else's machine.
 *
 * The other direction matters less but is worth seeing: a declared dependency
 * nothing imports is weight carried for nothing.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const declared = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if ([".ts", ".tsx", ".mjs"].includes(extname(entry))) out.push(full);
  }
  return out;
}

/**
 * Comments are not imports.
 *
 * This file explains the four import forms in a comment, and a scan of the raw
 * source found `import "pkg"` inside that explanation and reported `pkg` as an
 * undeclared dependency. The class audit had the same fault and was fixed the
 * same way: strip comments before reading code as code.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");
}

const files = [...walk("src"), ...walk("tools"), ...walk("tests")];

/** Package name from a module specifier: `@scope/pkg/sub` -> `@scope/pkg`. */
const packageOf = (specifier) => {
  if (specifier.startsWith(".") || specifier.startsWith("@/") || specifier.startsWith("node:")) return null;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
};

const used = new Map();
for (const file of files) {
  const source = stripComments(readFileSync(file, "utf8"));
  /*
   * `import x from "pkg"`, `import("pkg")`, `require("pkg")`, and bare
   * `import "pkg"`.
   *
   * That last form was missing, and the red test proved it: a side-effect
   * import of an undeclared package resolved from the tree and the check
   * reported clean. A check that only sees the import forms someone remembered
   * to include is a check with a hole in it.
   */
  const specifiers = [
    ...source.matchAll(/(?:from\s+|import\s*\(\s*|require\(\s*|import\s+)["']([^"']+)["']/g),
  ];
  for (const match of specifiers) {
    const name = packageOf(match[1]);
    if (!name) continue;
    if (!used.has(name)) used.set(name, new Set());
    used.get(name).add(file.replace(/\\/g, "/"));
  }
}

/* Node's own builtins are not dependencies. */
const builtin = new Set([
  "assert", "crypto", "fs", "http", "https", "module", "os", "path", "process",
  "stream", "test", "timers", "url", "util", "worker_threads", "zlib", "events",
  "buffer", "child_process", "net", "tty", "readline", "async_hooks", "perf_hooks",
]);
for (const name of [...used.keys()]) if (builtin.has(name)) used.delete(name);

/* Next and React come with the framework's own resolution; they are declared. */
let problems = 0;

console.log("Khaki AI — dependencies dhidi ya imports\n");

console.log("imported but not declared");
const undeclared = [...used.keys()].filter((name) => !declared.has(name)).sort();
if (undeclared.length === 0) {
  console.log("  ✓ every imported package is declared in package.json");
} else {
  for (const name of undeclared) {
    console.log(`  ✗ ${name}`);
    for (const file of used.get(name)) console.log(`      ${file}`);
    problems += 1;
  }
}

/*
 * Declared without a matching `import`, and legitimately so.
 *
 * `@types/*` are consumed by tsc, not imported by name. `react-dom` is the
 * renderer Next.js uses; App Router source never names it. `autoprefixer` and
 * the rest are run by the build from config files.
 *
 * Listing them keeps the check honest. A tool that flags four things on every
 * run is a tool people learn to scroll past, and then it catches nothing.
 */
const EXPECTED_WITHOUT_IMPORT = new Set([
  "react-dom",
  "typescript",
  "eslint",
  "eslint-config-next",
  "tailwindcss",
  "postcss",
  "autoprefixer",
  "prettier",
]);
const isTypePackage = (name) => name.startsWith("@types/");

console.log("\ndeclared but never imported");
const unused = [...declared]
  .filter((name) => !used.has(name))
  .filter((name) => !EXPECTED_WITHOUT_IMPORT.has(name) && !isTypePackage(name))
  .sort();
if (unused.length === 0) {
  console.log("  ✓ nothing is declared that nothing uses");
} else {
  for (const name of unused) {
    console.log(`  ! ${name} — declared, never imported`);
  }
}

console.log("\nevery package resolves on disk");
const { existsSync } = await import("node:fs");
for (const name of [...declared].sort()) {
  if (!existsSync(join("node_modules", name))) {
    console.log(`  ✗ ${name} is declared but not installed`);
    problems += 1;
  }
}
if (problems === 0) console.log("  ✓ all installed");

console.log(`\n${problems === 0 ? "PASS" : `FAIL — matatizo ${problems}`}`);
process.exit(problems === 0 ? 0 : 1);
