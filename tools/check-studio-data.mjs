/**
 * Pre-public check: is any invented studio detail still in the project?
 *
 * The project started from placeholder business information. Once real details
 * arrive it is easy to replace most of them and miss one — and a wrong phone
 * number or address on a live site costs real customers.
 *
 *   node tools/check-studio-data.mjs
 *
 * Exit code 1 means placeholder data is still present.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const SCAN_EXTENSIONS = [".ts", ".tsx"];

/**
 * Files outside `src/` that also carry business data.
 *
 * `.env.local` wins over `src/config/khaki.ts` for the WhatsApp number, so it
 * is the easiest place for a stale placeholder to hide.
 */
const EXTRA_FILES = [".env.local", ".env.local.example", ".env.example"];

/**
 * Values that were invented for the first draft and must never come back.
 *
 * The real details came from the studio's own price lists: Khaki Media Pro
 * Pictures, sendoff and wedding coverage, Kigamboni. Anything below belongs to
 * the fictional recording studio the project started as.
 */
const PLACEHOLDERS = [
  { pattern: /255744000111|744\s?000\s?111/, what: "Namba ya WhatsApp ya kubuni (744 000 111)" },
  { pattern: /info@khakimedia\.com/, what: "Barua pepe ya kubuni (info@khakimedia.com)" },
  { pattern: /Plot\s*42/, what: "Anwani ya kubuni (Plot 42)" },
  { pattern: /Kinondoni\s*\/\s*Victoria/, what: "Eneo la kubuni (Kinondoni / Victoria)" },
  { pattern: /Creative\s+Plaza/i, what: "Alama ya kufika ya kubuni (Creative Plaza)" },
  { pattern: /Sound Suite A/, what: "Chumba cha kubuni (Sound Suite A)" },
  { pattern: /@khakimedia\b/, what: "Instagram ya kubuni (@khakimedia)" },
  { pattern: /Khaki Media Official/, what: "YouTube ya kubuni (Khaki Media Official)" },
  // The invented recording-studio catalogue.
  { pattern: /Neumann|Shure SM7B|AKG C414|Genelec|Yamaha HS8|Universal Audio Apollo/, what: "Vifaa vya studio vya kubuni" },
  { pattern: /Sony FX6|Sony FX3|Aputure|Amaran|DJI Ronin/, what: "Vifaa vya camera vya kubuni" },
  { pattern: /Mixing & Mastering/i, what: "Huduma ya kubuni (Mixing & Mastering)" },
  { pattern: /Kurekodi Muziki/, what: "Huduma ya kubuni (Kurekodi Muziki)" },
  { pattern: /Podcast Production|Livestreaming/i, what: "Huduma ya kubuni (Podcast/Livestream)" },
  { pattern: /Graphic Design & Brand Identity/, what: "Huduma ya kubuni (Graphic Design)" },
  { pattern: /Kiwango cha chini ni masaa/, what: "Masharti ya kubuni ya studio" },
];

/** Facts that cannot be checked mechanically — read these yourself. */
const MANUAL_REVIEW = [
  ["Bei na yaliyomo kwenye packages", "src/data/khakiKnowledge.ts"],
  ["Maswali na majibu (FAQs)", "src/data/khakiKnowledge.ts"],
  ["Saa za kufanya kazi", "src/config/khaki.ts"],
  ["Instagram / YouTube / TikTok", "src/config/khaki.ts"],
  ["Sheria za amana (kwa sasa hazipo)", "src/config/khaki.ts"],
  ["Namba ya WhatsApp iliyowekwa", ".env.local"],
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (SCAN_EXTENSIONS.includes(extname(entry))) files.push(full);
  }
  return files;
}

const hits = [];

/**
 * Example text is not business data.
 *
 * The admin panel shows `255746885113` as a format hint and a placeholder
 * attribute. Those are illustrations of the shape a number should take, so they
 * are skipped rather than reported as stale details.
 */
const isFormatExample = (line) => /\b(placeholder|hint)\s*=/.test(line);

const scanTargets = [
  ...walk(SRC),
  ...EXTRA_FILES.map((name) => join(ROOT, name)).filter((path) => existsSync(path)),
];

for (const file of scanTargets) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (isFormatExample(line)) return;
    for (const placeholder of PLACEHOLDERS) {
      if (placeholder.pattern.test(line)) {
        hits.push({
          where: `${relative(ROOT, file).replace(/\\/g, "/")}:${index + 1}`,
          what: placeholder.what,
          line: line.trim().slice(0, 100),
        });
      }
    }
  });
}

console.log("Khaki AI — ukaguzi wa taarifa za studio\n");

if (hits.length === 0) {
  console.log("✓ Hakuna taarifa za kubuni zilizobaki kwenye src/\n");
} else {
  console.log(`✗ Taarifa ${hits.length} za kubuni zilizobaki:\n`);
  for (const hit of hits) {
    console.log(`  ${hit.what}`);
    console.log(`    ${hit.where}`);
    console.log(`    ${hit.line}`);
  }
  console.log("");
}

console.log("Pitia kwa mkono (hizi haziwezi kukaguliwa na script):");
for (const [what, where] of MANUAL_REVIEW) {
  console.log(`  · ${what.padEnd(38)} ${where}`);
}
console.log("");

process.exit(hits.length ? 1 : 0);
