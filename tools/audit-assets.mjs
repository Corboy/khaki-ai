/**
 * Does every asset the code points at actually exist?
 *
 * Paths like `/images/og-cover.png` are strings, not imports. Nothing fails to
 * compile when one is renamed or deleted -- the page builds, deploys, and
 * quietly serves a 404 where a logo should be. The social preview image is the
 * worst case: nobody sees the broken one until a customer forwards the link.
 *
 * Checks three things:
 *   · every local asset path referenced in src/ or tools/ exists in public/
 *   · the openGraph image dimensions match the real file
 *   · the icons the manifest advertises are really there
 *
 *   pnpm audit:assets
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

const files = [...walk("src"), ...walk("tools")];

let problems = 0;
console.log("Khaki AI — assets dhidi ya code\n");

/* ------------------------------------------------------------------ */
/* Every /path referenced in the source                                */
/* ------------------------------------------------------------------ */
console.log("assets the source points at");
const referenced = new Map();
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/["'`](\/[A-Za-z0-9._/-]+\.(?:png|webp|jpg|jpeg|svg|gif|ico|webmanifest|json|txt))["'`]/g)) {
    const path = match[1];
    if (!referenced.has(path)) referenced.set(path, new Set());
    referenced.get(path).add(file.replace(/\\/g, "/"));
  }
}

if (referenced.size === 0) {
  console.log("  ! no asset paths found — the pattern may have stopped matching");
  problems += 1;
}

for (const [path, sources] of [...referenced].sort()) {
  const onDisk = join("public", path.replace(/^\//, ""));
  if (existsSync(onDisk)) {
    console.log(`  ✓ ${path}  (${(statSync(onDisk).size / 1024).toFixed(1)} kB)`);
  } else {
    console.log(`  ✗ ${path} is referenced but not in public/`);
    for (const source of sources) console.log(`      ${source}`);
    problems += 1;
  }
}

/* ------------------------------------------------------------------ */
/* The declared openGraph dimensions must be the real ones             */
/* ------------------------------------------------------------------ */
console.log("\nthe social preview image");
const layout = readFileSync("src/app/layout.tsx", "utf8");

/*
 * Read the openGraph block, not the file.
 *
 * The first `url: "/images/..."` in layout.tsx belongs to the `icons` block,
 * which appears above openGraph -- so matching on the whole file checked the
 * 192px app icon against the 1200x630 cover's declared size and reported a
 * failure that did not exist. Scope the search to the section being described.
 */
const ogStart = layout.indexOf("openGraph:");
const ogBlock = ogStart >= 0 ? layout.slice(ogStart) : "";

const ogUrl = ogBlock.match(/url:\s*"(\/images\/[^"]+)"/)?.[1];
const ogWidth = Number(ogBlock.match(/width:\s*(\d+)/)?.[1] ?? 0);
const ogHeight = Number(ogBlock.match(/height:\s*(\d+)/)?.[1] ?? 0);

if (!ogUrl) {
  console.log("  ✗ layout.tsx declares no openGraph image");
  problems += 1;
} else {
  const onDisk = join("public", ogUrl.replace(/^\//, ""));
  if (!existsSync(onDisk)) {
    console.log(`  ✗ ${ogUrl} does not exist`);
    problems += 1;
  } else {
    const buffer = readFileSync(onDisk);
    // PNG width and height are the first two IHDR fields, at bytes 16 and 20.
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    const ratio = width / height;

    console.log(`  ${ogUrl}  ${width}x${height}  declared ${ogWidth}x${ogHeight}`);
    if (width !== ogWidth || height !== ogHeight) {
      console.log(`  ✗ declared size does not match the file (${width}x${height})`);
      problems += 1;
    } else {
      console.log("  ✓ declared size matches the file");
    }

    /*
     * Next emits `twitter:card: summary_large_image` whenever an openGraph
     * image is present, which promises a 1.91:1 landscape card. A square logo
     * there is not a broken build, it is a card every platform renders wrong.
     */
    if (ratio < 1.7 || ratio > 2.1) {
      console.log(`  ✗ ${ratio.toFixed(2)}:1 — summary_large_image expects about 1.91:1`);
      problems += 1;
    } else {
      console.log(`  ✓ ${ratio.toFixed(2)}:1 suits summary_large_image`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* The manifest's icons must load                                      */
/* ------------------------------------------------------------------ */
console.log("\nthe manifest icons");
const manifest = readFileSync("src/app/manifest.ts", "utf8");
const iconPaths = [...manifest.matchAll(/src:\s*"(\/images\/[^"]+)"/g)].map((m) => m[1]);
if (iconPaths.length === 0) {
  console.log("  ✗ the manifest advertises no icons, so the app is not installable");
  problems += 1;
}
for (const path of iconPaths) {
  const onDisk = join("public", path.replace(/^\//, ""));
  if (!existsSync(onDisk)) {
    console.log(`  ✗ ${path} is advertised but missing`);
    problems += 1;
  } else {
    const buffer = readFileSync(onDisk);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    // Android needs at least 192 and 512 to offer an install.
    const size = manifest.match(new RegExp(`src:\\s*"${path.replace(/[/.]/g, "\\$&")}"[^}]*sizes:\\s*"(\\d+)x(\\d+)"`));
    const declared = size ? `${size[1]}x${size[2]}` : "undeclared";
    const matches = size ? Number(size[1]) === width && Number(size[2]) === height : true;
    console.log(
      `  ${matches ? "✓" : "✗"} ${path}  ${width}x${height}  declared ${declared}`,
    );
    if (!matches) problems += 1;
  }
}

console.log(`\n${problems === 0 ? "PASS — kila asset kilichotajwa kipo" : `FAIL — matatizo ${problems}`}`);
process.exit(problems === 0 ? 0 : 1);
