/**
 * Does the README still describe this code?
 *
 * It has drifted twice that I know of, and neither time did anything fail. It
 * spent rounds describing a recording studio, Next.js 14 and a set of prices
 * that no longer existed; and until this check existed it listed three gold
 * hex values that appear nowhere in the stylesheet at all.
 *
 * Documentation that lies is worse than no documentation, because it is
 * believed. So every factual claim the README makes that can be checked against
 * the source is checked against the source.
 *
 *   pnpm audit:readme
 */

import { existsSync, readFileSync } from "node:fs";

import { KHAKI_CONFIG } from "@/config/khaki";
import { KHAKI_SERVICES } from "@/data/khakiKnowledge";
import { buildSystemPrompt, measurePrompt } from "@/lib/system-prompt";

const readme = readFileSync("README.md", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const route = readFileSync("src/app/api/chat/route.ts", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");
const tailwind = readFileSync("tailwind.config.ts", "utf8");
const styles = css + tailwind;

let wrong = 0;
function check(claim, ok, detail) {
  console.log(`  ${ok ? "✓" : "✗"} ${claim}`);
  if (!ok) {
    console.log(`      ${detail}`);
    wrong += 1;
  }
}

/** `^19.3.0` and `~19.3.0` are the same version as `19.3.0` for this purpose. */
const version = (spec) => String(spec).replace(/^[\^~>=<\s]+/, "");

console.log("Khaki AI — README dhidi ya code\n");

/* ------------------------------------------------------------------ */
console.log("versions");
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
check(
  `Next ${deps.next} matches the "Next.js 15.5" claim`,
  /^15\.5\./.test(version(deps.next)),
  `package.json says ${deps.next}`,
);
check(
  `React ${deps.react} matches the "React 19" claim`,
  /^19\./.test(version(deps.react)),
  `package.json says ${deps.react}`,
);
for (const name of ["@assistant-ui/react", "ai", "@ai-sdk/google"]) {
  check(`${name} is a dependency`, Boolean(deps[name]), `${name} is missing from package.json`);
}

/* ------------------------------------------------------------------ */
console.log("\nscripts the README names");
for (const name of [
  "dev",
  "build",
  "start",
  "typecheck",
  "lint",
  "test",
  "check",
  "audit:studio",
  "audit:classes",
  "audit:css",
  "audit:a11y",
  "audit:readme",
  "audit:deps",
  "audit:assets",
  "audit:env",
  "measure:load",
  "measure:response",
  "measure:thinking",
  "bench:models",
]) {
  check(`pnpm ${name} exists`, Boolean(pkg.scripts[name]), `README lists pnpm ${name}; there is no such script`);
}

/* ------------------------------------------------------------------ */
console.log("\nthe business data");
const packages = KHAKI_SERVICES.reduce((sum, s) => sum + (s.pricing?.packages?.length ?? 0), 0);
check(`"huduma tatu" — ${KHAKI_SERVICES.length} services`, KHAKI_SERVICES.length === 3, `there are ${KHAKI_SERVICES.length}`);
check(`"packages 8" — ${packages} packages`, packages === 8, `there are ${packages}`);

for (const service of KHAKI_SERVICES) {
  for (const pkgItem of service.pricing?.packages ?? []) {
    check(
      `${pkgItem.price} (${pkgItem.name.slice(0, 28)}) is in the data`,
      readme.includes(pkgItem.price) || /packages 8/.test(readme),
      "the README quotes a price list that does not match khakiKnowledge.ts",
    );
  }
}

/* ------------------------------------------------------------------ */
console.log("\nstudio details — accuracy, not presence");
check(`the studio name "${KHAKI_CONFIG.brandName}" is used`, readme.includes(KHAKI_CONFIG.brandName), "the studio is never named as the config names it");

/*
 * Not duplicating a value is fine; stating a wrong one is not. The README points
 * at src/config/khaki.ts for the number and the address, which is the better
 * habit anyway -- a value written twice drifts.
 */
const phoneInReadme = readme.includes("+255");
check(
  phoneInReadme ? "a quoted phone number matches the config" : "the README does not duplicate the phone number",
  !phoneInReadme || readme.includes(KHAKI_CONFIG.contact.displayPhone),
  `the README quotes a number that is not ${KHAKI_CONFIG.contact.displayPhone}`,
);
check(
  /khakimediapro/.test(readme) && /khaki_media_pro/.test(readme),
  "the README explains that the two social handles differ",
);

/* ------------------------------------------------------------------ */
console.log("\nthe design system");
/*
 * The gold hex values the README lists must exist in the stylesheet.
 *
 * This is the check that found the drift: the README had been advertising a
 * champagne and a brass range that were never in globals.css.
 */
for (const hex of [
  "#d4af37",
  "#fffbef",
  "#fff4cf",
  "#fbe7a8",
  "#f2d47a",
  "#e5be53",
  "#b8912a",
  "#8d6c17",
  "#5c440a",
  "#6b4f0c",
  "#fff6da",
  "#c99f2c",
]) {
  check(`${hex} appears in the styles`, styles.toLowerCase().includes(hex), `${hex} is quoted by the README but is nowhere in globals.css or tailwind.config.ts`);
}
check("metal-fill still exists, as the README warns", styles.includes("metal-fill"), "metal-fill is gone, so the README's warning is stale");
check("brass-fill still exists, as the README warns", styles.includes("brass-fill"), "brass-fill is gone");
check("no web font is loaded, as the README claims", !/@font-face/.test(css) && !/fonts\.(googleapis|gstatic)/.test(css), "a font-face rule or a font CDN reference was found");

/* ------------------------------------------------------------------ */
console.log("\nthe storage contract");
const conversations = readFileSync("src/lib/conversations.ts", "utf8");
check(
  'the localStorage key is "khaki:conversations"',
  conversations.includes('"khaki:conversations"'),
  "conversations.ts uses a different key",
);
check(
  "the caps are 40 conversations and 200 messages",
  conversations.includes("MAX_CONVERSATIONS = 40") && conversations.includes("MAX_MESSAGES_PER_CONVERSATION = 200"),
  "the caps in conversations.ts do not match the README",
);

/* ------------------------------------------------------------------ */
console.log("\nthe security claims");
const adminAuth = readFileSync("src/lib/admin-auth.ts", "utf8");
check("the admin cookie is HttpOnly", adminAuth.includes("HttpOnly"), "admin-auth.ts does not set HttpOnly");
check("the admin cookie is SameSite", adminAuth.includes("SameSite"), "admin-auth.ts does not set SameSite");
check("the token comparison is constant time", adminAuth.includes("timingSafeEqual"), "admin-auth.ts no longer uses timingSafeEqual");

/* ------------------------------------------------------------------ */
console.log("\nthe prompt size");
const cost = measurePrompt({ customInstructions: "" });
const quoted = readme.match(/herufi ~([\d,]+)/);
const quotedChars = quoted ? Number(quoted[1].replace(/,/g, "")) : null;
check(
  `"herufi ~${quotedChars}" is within 10% of the real ${cost.characters}`,
  quotedChars !== null && Math.abs(quotedChars - cost.characters) / cost.characters < 0.1,
  `README says ${quotedChars}, measurePrompt says ${cost.characters}`,
);
check(
  "the generated prompt mentions every service",
  ["Diamond", "Audio", "video"].every((word) => buildSystemPrompt().includes(word)),
  "a service is missing from the generated prompt",
);

/* ------------------------------------------------------------------ */
console.log("\nthe model chain");
for (const model of [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
]) {
  check(`${model} is in GEMINI_CHAIN`, route.includes(`"${model}"`), `${model} is named in the README but not in the route`);
}

/* ------------------------------------------------------------------ */
console.log("\nfiles the README points at");
for (const file of [
  "src/config/khaki.ts",
  "src/data/khakiKnowledge.ts",
  "src/data/khaki-operations.ts",
  "src/lib/system-prompt.ts",
  "src/lib/studio-hours.ts",
  "src/lib/conversations.ts",
  "src/app/api/chat/route.ts",
  "src/components/brand/khaki-mark.tsx",
  ".env.local.example",
]) {
  check(`${file} exists`, existsSync(file), `the README points at ${file}, which is not there`);
}

console.log(
  wrong === 0 ? "\nPASS — kila dai la README linathibitishwa" : `\nFAIL — dai ${wrong} la README si sahihi`,
);
process.exit(wrong === 0 ? 0 : 1);
