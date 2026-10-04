/**
 * Latency benchmark for the chat path.
 *
 * Answers one question: for a real studio enquiry, which model + thinking
 * setting gets a useful answer to the customer fastest? Run with:
 *
 *   node tools/bench-models.mjs
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY not set");
  process.exit(1);
}

const SYSTEM = `Wewe ni Khaki AI, msaidizi wa studio ya Khaki Media iliyopo Dar es Salaam.
Jibu kwa Kiswahili kifupi (mistari 2-6). Bei halisi: Kurekodi TZS 50,000/saa;
Full Single Song Production TZS 250,000-350,000; Mixing & Mastering TZS 120,000;
Video ya muziki TZS 1,200,000-1,800,000; Podcast TZS 100,000/saa.
Tumia tool onyesha_bei mteja akiuliza bei.`;

const tools = {
  onyesha_bei: tool({
    description: "Onyesha packages na bei za huduma.",
    inputSchema: z.object({ huduma: z.enum(["recording", "video-production", "podcast-livestream"]) }),
    execute: async ({ huduma }) => ({ huduma, packages: ["A: TZS 50,000", "B: TZS 250,000"] }),
  }),
};

const QUESTION = "Nataka booking ya studio Jumamosi saa 3 jioni kwa video ya muziki, jina langu Asha";

const CANDIDATES = [
  { model: "gemini-3.8-flash", thinking: undefined },
  { model: "gemini-3.8-flash", thinking: "low" },
  { model: "gemini-3.6-flash", thinking: "low" },
  { model: "gemini-3.5-flash", thinking: "low" },
  { model: "gemini-flash-latest", thinking: "low" },
  { model: "gemini-3.1-flash-lite", thinking: "low" },
];

const google = createGoogleGenerativeAI({ apiKey });

for (const candidate of CANDIDATES) {
  const started = Date.now();
  let firstText = 0;
  let text = "";
  let tools_ = 0;
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
      providerOptions: candidate.thinking
        ? { google: { thinkingConfig: { thinkingLevel: candidate.thinking } } }
        : undefined,
    });

    for await (const part of result.fullStream) {
      if (part.type === "text-delta" && !firstText) firstText = Date.now() - started;
      if (part.type === "text-delta") text += part.text;
      if (part.type === "tool-result") tools_++;
      if (part.type === "error") failure = String(part.error).slice(0, 120);
    }
  } catch (error) {
    failure = String(error).slice(0, 120);
  }

  const label = `${candidate.model}${candidate.thinking ? ` (thinking:${candidate.thinking})` : ""}`;
  if (failure) {
    console.log(`✗ ${label.padEnd(38)} ${Date.now() - started}ms  ${failure}`);
  } else {
    console.log(
      `✓ ${label.padEnd(38)} total=${String(Date.now() - started).padStart(6)}ms  firstText=${String(firstText).padStart(6)}ms  tools=${tools_}  chars=${text.length}`,
    );
  }
}
