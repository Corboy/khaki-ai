/**
 * Which setting gets the first word on screen fastest?
 *
 * Time to the first *text* token is the number a customer feels. A model that
 * finishes in six seconds but thinks for five of them is worse for someone
 * staring at "Inafikiria…" than one that finishes in nine and starts talking
 * at two.
 *
 * Run with `pnpm measure:thinking`. Findings on the current prompt, in the
 * real route:
 *
 *   gemini-3.5-flash       first word  5.7s – 11.6s   (the current default)
 *   gemini-3.1-flash-lite  first word  4.4s –  7.2s   (same questions)
 *
 * On a short prompt, and cleanly comparable because only one thing changed:
 *
 *   gemini-3.1-flash-lite  thinkingBudget 0      1135ms to the first word
 *   gemini-3.1-flash-lite  thinkingLevel  low    2124ms
 *
 * ## Why nothing was changed on the strength of this
 *
 * Swapping the default to the smaller model would roughly halve the wait, and
 * that is tempting. Three turns is not evidence that it answers as well —
 * it handled price, package contents and booking correctly, and even cited the
 * Instagram handle unprompted, but harder cases (an ambiguous Swahili time, an
 * off-topic question, someone trying to talk it out of its instructions) were
 * never tried, and those are exactly where a smaller model gives way.
 *
 * `thinkingBudget: 0` looked about twice as fast again, but gemini-3.5-flash
 * had no quota left to test it on. If that model rejects the setting, every
 * request fails and falls through to the offline answer, so it is not something
 * to change on a hunch.
 *
 * The free tier allows twenty requests per model per day, which is not enough
 * to settle either question. Re-run this against a billed key before deciding.
 */

import { existsSync } from "node:fs";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

if (!process.env.GEMINI_API_KEY && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY haipo. Weka kwenye .env.local.");
  process.exit(1);
}

/** The shape of the real prompt, shortened: a question needing a price. */
const SYSTEM = `Wewe ni Khaki AI wa Khaki Media Pro Pictures. Jibu kwa Kiswahili kifupi.
Bei: Mango TSH 170,000/= · Vanilla 350,000/= · Apple 550,000/= · Basic 1,000,000/= ·
Golden 1,500,000/= · Diamond 2,000,000/= · Kupiga video 400,000/= · Audio 200,000/=.`;
const QUESTION = "Nina sendoff mwezi ujao. Bei zenu zikoje na mnatoa drone shots?";

const google = createGoogleGenerativeAI({ apiKey });

const CASES = [
  { label: "3.5-flash   thinking:low", model: "gemini-3.5-flash", thinking: { thinkingLevel: "low" } },
  { label: "3.5-flash   thinking:0", model: "gemini-3.5-flash", thinking: { thinkingBudget: 0 } },
  {
    label: "3.1-lite    thinking:low",
    model: "gemini-3.1-flash-lite",
    thinking: { thinkingLevel: "low" },
  },
  {
    label: "3.1-lite    thinking:0",
    model: "gemini-3.1-flash-lite",
    thinking: { thinkingBudget: 0 },
  },
];

console.log("Khaki AI — muda hadi neno la kwanza\n");
console.log("mpangilio                        kwanza     jumla   herufi");

for (const testCase of CASES) {
  const started = Date.now();
  let first = 0;
  let text = "";
  let failure = "";

  try {
    const result = streamText({
      model: google(testCase.model),
      system: SYSTEM,
      prompt: QUESTION,
      maxOutputTokens: 600,
      temperature: 0.7,
      maxRetries: 0,
      providerOptions: { google: { thinkingConfig: testCase.thinking } },
    });

    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        if (!first) first = Date.now() - started;
        text += part.text;
      }
      if (part.type === "error") failure = String(part.error).split("\n")[0].slice(0, 80);
    }
  } catch (error) {
    // Quota is per model, so a refusal on one is expected and not a defect.
    failure = String(error).split("\n")[0].slice(0, 80);
  }

  const total = Date.now() - started;
  const firstCell = first ? `${first}ms` : "—";
  const totalCell = failure ? "—" : `${total}ms`;

  console.log(
    `${testCase.label.padEnd(30)} ${firstCell.padStart(8)} ${totalCell.padStart(9)} ` +
      `${failure ? failure : String(text.length).padStart(8)}`,
  );
}
