/**
 * Registers the `@/` alias hook for `node --test`.
 *
 * Usage:  node --import ./tools/register-alias.mjs --test tests/
 */
import { register } from "node:module";

// `import.meta.url` is already a URL — wrapping it in pathToFileURL() produces
// a doubled `file:/file:/` prefix that Node cannot resolve.
register("./ts-alias-hooks.mjs", import.meta.url);
