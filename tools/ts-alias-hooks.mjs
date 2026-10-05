/**
 * Module resolution hooks so `node --test` can run the app's TypeScript.
 *
 * The project has no test runner and no extra dependencies: Node 22+ strips
 * TypeScript types on its own and ships a test runner, so the only thing
 * missing is the `@/` path alias that every module uses.
 *
 * This maps `@/x` to `src/x`, trying the extensionless path, then `.ts`,
 * then `.tsx` — the same order TypeScript resolves them in.
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SRC = new URL("../src/", import.meta.url);

function firstExisting(candidates) {
  for (const url of candidates) {
    if (url.protocol === "file:" && existsSync(fileURLToPath(url))) return url;
  }
  return candidates[0];
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = new URL(specifier.slice(2), SRC);
    return nextResolve(
      firstExisting([
        base,
        new URL(`${base.href}.ts`),
        new URL(`${base.href}.tsx`),
        new URL(`${base.href}/index.ts`),
      ]).href,
      context,
    );
  }
  return nextResolve(specifier, context);
}
