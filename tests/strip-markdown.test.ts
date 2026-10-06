import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { stripMarkdown } from "@/lib/strip-markdown";

/**
 * The prose behind the markdown.
 *
 * This runs for one frame on a slow connection, so it does not need to be a
 * parser -- but it does need to remove the things this app actually emits,
 * because the whole point was that a returning customer saw asterisks and a
 * percent-encoded URL where their conversation should be.
 */

describe("stripMarkdown", () => {
  it("turns a link into its label", () => {
    assert.strictEqual(
      stripMarkdown("[wasiliana nasi WhatsApp +255 746 885 113](https://wa.me/255746885113?text=Habari%20Khaki)"),
      "wasiliana nasi WhatsApp +255 746 885 113",
    );
  });

  it("removes bold, italics and code markers", () => {
    assert.strictEqual(stripMarkdown("**Diamond** ni *bei* ya `TSH 2,000,000`"), "Diamond ni bei ya TSH 2,000,000");
  });

  it("turns bullets into bullets", () => {
    assert.strictEqual(
      stripMarkdown("- Diamond — TSH 2,000,000/=\n- Mango — TSH 170,000/="),
      "• Diamond — TSH 2,000,000/=\n• Mango — TSH 170,000/=",
    );
  });

  it("drops heading hashes", () => {
    assert.strictEqual(stripMarkdown("## Sendoff & Harusi"), "Sendoff & Harusi");
  });

  it("does not mangle a word that merely contains an asterisk", () => {
    // Nothing in the catalogue does this, but stripping must not eat a letter.
    assert.strictEqual(stripMarkdown("5 * 3 * 2"), "5 * 3 * 2");
  });

  it("leaves plain prose alone", () => {
    const prose = "Tupo Mkombozi Street, Kibugumo, Kigamboni, Dar es Salaam, Tanzania.";
    assert.strictEqual(stripMarkdown(prose), prose);
  });

  it("produces nothing that still looks like markup, for real answers", () => {
    const real =
      "**Sendoff & Harusi** (packages zinaanzia TSH 170,000):\n\n" +
      "- **Diamond Sendoff & Wedding Package** — TSH 2,000,000/=\n" +
      "- **Mango Package** — TSH 170,000/=\n\n" +
      "Kwa mazungumzo zaidi na booking, [wasiliana nasi WhatsApp +255 746 885 113](https://wa.me/255746885113?text=Habari%20Khaki%20Media).";
    const plain = stripMarkdown(real);
    assert.ok(!plain.includes("**"), "asterisks survived");
    assert.ok(!plain.includes("wa.me"), "a raw URL survived");
    assert.ok(!plain.includes("%20"), "a percent-encoded URL survived");
    assert.match(plain, /Diamond Sendoff & Wedding Package/, "the package name was eaten");
  });
});
