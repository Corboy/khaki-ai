/**
 * Latency benchmark for the chat path.
 *
 * Answers one question: for a real studio enquiry, which model + thinking
 * setting gets a useful answer to the customer fastest?
 *
 *   pnpm bench:models
 *
 * This file was missed when the app was rebuilt around the real business. Its
 * prompt and its tool enum still described the recording studio the project
 * started as, for several rounds, because the check that looks for invented
 * data only scanned `src/` and this lives in `tools/`. That blind spot is
 * closed; this file is no longer the reason it opens.
 */

import { existsSync } from "node:fs";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";

/*
 * Next.js loads `.env.local` for the app; a plain Node script does not. Read it
 * here, or `pnpm bench:models` fails with "GEMINI_API_KEY not set" on a machine
 * where the key is sitting right there in the file.
 */
if (!process.env.GEMINI_API_KEY && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error(
    "GEMINI_API_KEY haipo.\n\n" +
      "  Weka kwenye .env.local:\n" +
      "    GEMINI_API_KEY=...\n",
  );
  process.exit(1);
}

/** The real catalogue, so the benchmark exercises the real prompt. */
const SYSTEM = `Wewe ni Khaki AI, msaidizi wa Khaki Media Pro Pictures (Kigamboni, Dar es Salaam).
Jibu kwa Kiswahili kifupi (mistari 2-6).
Bei halisi: Mango TSH 170,000/= · Vanilla TSH 350,000/= · Apple TSH 550,000/= ·
Basic TSH 1,000,000/= · Golden TSH 1,500,000/= · Diamond TSH 2,000,000/= ·
Kupiga video mpaka final TSH 400,000/= · Kazi za audio TSH 200,000/=.
Tumia tool onyesha_bei mteja akiuliza bei.`;

const tools = {
  onyesha_bei: tool({
    description: "Onyesha packages na bei za huduma.",
    inputSchema: z.object({
      huduma: z.enum(["sendoff-wedding", "video-production", "audio"]),
    }),
    execute: async ({ huduma }) => ({
      huduma,
      packages: ["Mango: TSH 170,000/=", "Diamond: TSH 2,000,000/="],
    }),
  }),
};

const QUESTION =
  "Nina sendoff mwezi ujao. Bei zenu zikoje, na mnatoa drone shots? Jina langu Asha";

const CANDIDATES = [
  { model: "gemini-3.8-flash", thinking: undefined },
  { model: "gemini-3.8-flash", thinking: "low" },
  { model: "gemini-3.6-flash", thinking: "low" },
  { model: "gemini-3.5-flash", thinking: "low" },
  { model: "gemini-flash-latest", thinking: "low" },
  { model: "gemini-3.1-flash-lite", thinking: "low" },
];

const google = createGoogleGenerativeAI({ apiKey });

/*
 * A refusal that arrives as an unhandled rejection kills the whole run.
 *
 * The AI SDK rejects its internal stream promise as well as the one this loop
 * awaits, and only the second is inside the try/catch. Without this, a quota
 * refusal on the first model ends the benchmark and hides the other five —
 * which is exactly what happened the first time this script was run.
 */
process.on("unhandledRejection", (reason) => {
  console.error(`   ↳ imekataliwa: ${describeFailure(reason)}`);
});

/**
 * One line an operator can read.
 *
 * `String(error)` on an AI SDK error serialises the entire API response, so a
 * refused model printed several pages of quota JSON into the results table --
 * and a per-model quota refusal is the normal case on the free tier, which is
 * exactly when someone runs this. Quota gets a sentence; anything else gets its
 * first line.
 */
function describeFailure(error) {
  const message = error?.message ?? String(error);
  if (/quota|RESOURCE_EXHAUSTED|exceeded your current quota|\b429\b/i.test(message)) {
    const retry = message.match(/retry in ([^.\n]+)/i)?.[1];
    return `quota imeisha${retry ? ` — irudi baada ya ${retry.trim()}` : ""}`;
  }
  return message.split("\n")[0].slice(0, 110);
}

/*
 * The AI SDK logs every request error itself, with console.error(error).
 *
 * On the free tier a per-model quota refusal is normal, so all six candidates
 * can refuse at once -- and each printed the entire serialised API response to
 * stderr. The run produced a 9-line table wrapped in 611 lines of dump, which
 * is the opposite of the thing someone opens this tool to read.
 *
 * Only AI SDK error objects are dropped. Anything else still reaches stderr
 * untouched, and realConsoleError is kept rather than swallowed, so a genuine
 * fault in this script is still visible.
 */
const realConsoleError = console.error.bind(console);
console.error = (...args) => {
  const [first] = args;
  const isSdkError =
    first &&
    typeof first === "object" &&
    Object.getOwnPropertySymbols(first).some((symbol) => String(symbol).includes("vercel.ai.error"));
  if (isSdkError) return;
  realConsoleError(...args);
};

console.log(`Khaki AI — kasi ya modeli\n`);
console.log(`${"modeli".padEnd(38)} ${"jumla".padStart(8)} ${"neno la kwanza".padStart(14)}  tools  herufi`);

for (const candidate of CANDIDATES) {
  const started = Date.now();
  let firstText = 0;
  let text = "";
  let toolCalls = 0;
  let failure = "";

  try {
    const result = streamText({
      model: google(candidate.model),
      system: SYSTEM,
      prompt: QUESTION,
      tools,
      stopWhen: stepCountIs(2),
      maxOutputTokens: 800,
      temperature: 0.7,
      /*
       * No retries. The SDK retries three times with backoff, which turns a
       * quota refusal into a long wait and, in this script's case, a rejected
       * promise that escaped the try/catch below and killed the run. A
       * benchmark wants the refusal reported, immediately, and the next model
       * tried.
       */
      maxRetries: 0,
      providerOptions: candidate.thinking
        ? { google: { thinkingConfig: { thinkingLevel: candidate.thinking } } }
        : undefined,
    });

    for await (const part of result.fullStream) {
      if (part.type === "text-delta" && !firstText) firstText = Date.now() - started;
      if (part.type === "text-delta") text += part.text;
      if (part.type === "tool-result") toolCalls += 1;
      if (part.type === "error") failure = describeFailure(part.error);
    }
  } catch (error) {
    failure = describeFailure(error);
  }

  const label = `${candidate.model}${candidate.thinking ? ` (thinking:${candidate.thinking})` : ""}`;
  if (failure) {
    // Quota is per model, so a refusal on one is normal and not a defect.
    console.log(`${label.padEnd(38)} ${"—".padStart(8)} ${"failed".padStart(14)}  ${failure}`);
  } else {
    console.log(
      `${label.padEnd(38)} ${String(Date.now() - started).padStart(6)}ms ${String(firstText).padStart(11)}ms ` +
        `${String(toolCalls).padStart(6)} ${String(text.length).padStart(7)}`,
    );
  }
}
