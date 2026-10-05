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
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();

/**
 * This file defines the patterns below, so of course it contains them. Scanning
 * it would report sixteen invented details that are the definitions of the
 * sixteen invented details — on every run, forever.
 */
const SELF = fileURLToPath(import.meta.url);

/**
 * Everywhere business data can hide.
 *
 * `tools/` was missing from this list, and that is exactly where it was hiding:
 * `bench-models.mjs` still described the invented recording studio — mixing &
 * mastering, music videos, podcasts, TZS prices — long after the app had been
 * rebuilt around the real business. The check scanned `src/`, found nothing,
 * and reported clean. That is the worst kind of clean.
 */
const SOURCE_DIRS = [
  { dir: join(ROOT, "src"), extensions: [".ts", ".tsx"] },
  { dir: join(ROOT, "tools"), extensions: [".mjs", ".ts"] },
  { dir: join(ROOT, "tests"), extensions: [".ts"] },
];

/**
 * Files outside `src/` that also carry business data or prose about it.
 *
 * `.env.local` wins over `src/config/khaki.ts` for the WhatsApp number, so it
 * is the easiest place for a stale placeholder to hide. `README.md` is here
 * because docs drift: it kept describing a recording studio and Next.js 14 long
 * after both had changed, and it was carrying a fragment of the real API key.
 */
const EXTRA_FILES = [".env.local", ".env.local.example", ".env.example", "README.md"];

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

/**
 * Credential fragments, checked everywhere except `.env.local`.
 *
 * The README used to illustrate the masking with the real key's first five and
 * last four characters — `AQ.Ab8…Qo5g` — in a public repository. That is not
 * the key itself, but it narrows the search space and confirms the format.
 * A mask should be dots and nothing else.
 */
const SECRET_PATTERNS = [
  { pattern: /AQ\.Ab[A-Za-z0-9_\-]{4,}/, what: "Sehemu ya Gemini API key" },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}/, what: "GitHub token" },
  { pattern: /\bsk-[A-Za-z0-9]{20,}/, what: "OpenAI API key" },
  { pattern: /\bAIza[A-Za-z0-9_\-]{20,}/, what: "Google API key" },
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

function walk(dir, extensions, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, extensions, files);
    else if (extensions.includes(extname(entry))) files.push(full);
  }
  return files;
}

/** Every source file this check reads, minus this file itself. */
const walkSources = () =>
  SOURCE_DIRS.flatMap(({ dir, extensions }) => walk(dir, extensions)).filter(
    (file) => file !== SELF,
  );

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
  ...walkSources(),
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

/*
 * The credential scan skips `.env.local`.
 *
 * That file is where the real key is supposed to live, so flagging it would
 * report the one place the secret belongs as a leak. Everything else — source,
 * docs, and the `.env` templates — must carry no credential fragment at all.
 */
const secretTargets = [
  ...walkSources(),
  ...EXTRA_FILES.filter((name) => name !== ".env.local").map((name) => join(ROOT, name)),
].filter((path) => existsSync(path));

for (const file of secretTargets) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const secret of SECRET_PATTERNS) {
      if (secret.pattern.test(line)) {
        hits.push({
          where: `${relative(ROOT, file).replace(/\\/g, "/")}:${index + 1}`,
          what: secret.what,
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
