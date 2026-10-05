import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type InferUIMessageChunk,
  type ToolSet,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { KHAKI_CONFIG } from "@/config/khaki";
import { KHAKI_SERVICES } from "@/data/khakiKnowledge";
import { answerOffline } from "@/lib/offline-answers";
import { boundMessages, wasTrimmed } from "@/lib/bound-messages";
import { getSettings, resolveProvider, type ProviderId } from "@/lib/settings";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { skipRepeatedTextBlocks } from "@/lib/stream-dedupe";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Let the client show which brain answered. */
const PROVIDER_HEADER = "x-khaki-provider";
const MODEL_HEADER = "x-khaki-model";

/**
 * Model failover without a wasted request.
 *
 * Google's free tier is rationed **per model, per day** — a key that is
 * exhausted on one model is usually untouched on the next. Probing costs one
 * request out of that ration, so instead the route opens the real stream and
 * only moves on if the very first chunk is an error. A healthy turn therefore
 * costs exactly one model call.
 */
const GEMINI_CHAIN = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

const OPENAI_CHAIN = ["gpt-4o-mini", "gpt-4o"];

/** Largest request body the chat route will look at: 1 MiB. */
const MAX_BODY_BYTES = 1_048_576;

/**
 * How long a model gets to produce its first chunk before it is abandoned.
 *
 * Normal responses start in 4-11 seconds; the slowest seen was 62. This sits
 * between the two.
 */
const FIRST_CHUNK_TIMEOUT_MS = 20_000;

/**
 * Thinking budget.
 *
 * These models reason before answering, which is wasted latency for "how much
 * is a studio hour?" — measured at 4.6s with `low` versus 39s with the default
 * budget on the same question.
 */
const THINKING_OPTIONS = { google: { thinkingConfig: { thinkingLevel: "low" as const } } };

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */

const bookingDraftSchema = z.object({
  jina: z.string().optional().describe("Jina la mteja kama alivyolitaja"),
  huduma: z
    .string()
    .optional()
    .describe("Aina ya tukio au package, mfano: Sendoff, Harusi, Diamond Package"),
  tarehe: z.string().optional().describe("Tarehe aliyotaja, kwa maneno aliyotumia"),
  muda: z.string().optional().describe("Muda au saa aliyotaja"),
  maelezo: z.string().optional().describe("Maelezo ya ziada aliyotoa"),
});

const pricingSchema = z.object({
  huduma: z
    .enum(KHAKI_SERVICES.map((service) => service.id) as [string, ...string[]])
    .describe("ID ya huduma inayotakiwa kuonyeshwa"),
});

/**
 * Backend tools.
 *
 * These run on the server and render on the client as rich cards, which is how
 * a price list or a booking confirmation becomes something a customer can act
 * on instead of a wall of markdown.
 */
const khakiTools = {
  andaa_booking: {
    description:
      "Tumia hii mara tu mteja anapotoa aina ya tukio (sendoff/harusi), tarehe au package " +
      "anayotaka. Inaandaa kadi ya booking yenye kitufe cha kutuma ombi kwa timu kupitia " +
      "WhatsApp. Ita mara moja tu kwa kila mteja anapotoa taarifa mpya za booking.",
    inputSchema: bookingDraftSchema,
    execute: async (draft: z.infer<typeof bookingDraftSchema>) => {
      const missing: string[] = [];
      if (!draft.huduma) missing.push("aina ya tukio");
      if (!draft.tarehe) missing.push("tarehe");

      return {
        type: "booking-draft" as const,
        draft,
        missing,
        ready: missing.length === 0,
        studio: KHAKI_CONFIG.brandName,
        depositPercentage: KHAKI_CONFIG.bookingRules.depositPercentage,
      };
    },
  },
  onyesha_bei: {
    description:
      "Tumia hii mteja anapouliza bei, packages au gharama za huduma mahususi. Inaonyesha kadi ya " +
      "packages zote za huduma hiyo na bei halisi.",
    inputSchema: pricingSchema,
    execute: async ({ huduma }: z.infer<typeof pricingSchema>) => {
      const service = KHAKI_SERVICES.find((entry) => entry.id === huduma);
      if (!service) return { type: "pricing" as const, found: false, serviceId: huduma };
      return {
        type: "pricing" as const,
        found: true,
        serviceId: service.id,
        title: service.title,
        swahiliTitle: service.swahiliTitle,
        startingAt: service.pricing.startingAt,
        rateType: service.pricing.rateType,
        packages: service.pricing.packages,
      };
    },
  },
} satisfies ToolSet;

/* ------------------------------------------------------------------ */
/* Route                                                               */
/* ------------------------------------------------------------------ */

export async function POST(req: Request) {
  let messages: UIMessage[] = [];

  /*
   * Refuse an oversized body before parsing it.
   *
   * Cheap, and it runs before anything allocates. `content-length` is absent on
   * a chunked upload, so this is the first line rather than the only one --
   * `boundMessages` below is what actually caps the model's bill.
   */
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Ombi ni kubwa mno." }, { status: 413 });
  }

  try {
    const body = (await req.json()) as { messages?: UIMessage[] };
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return Response.json({ error: "Ombi si sahihi." }, { status: 400 });
  }

  if (!messages.length) {
    return Response.json({ error: "Hakuna ujumbe." }, { status: 400 });
  }

  /*
   * Bound what one request is allowed to cost.
   *
   * This app has no login and no rate limit, so whatever arrives here is passed
   * to the model and billed to the studio. Without a cap, a script can post
   * five hundred messages and the whole conversation goes to Gemini at the
   * customer's expense. A real enquiry never comes close to either limit.
   */
  const bounded = boundMessages(messages);
  if (wasTrimmed(messages, bounded)) {
    console.warn(
      `[khaki] context trimmed from ${messages.length} to ${bounded.length} message(s)`,
    );
  }
  messages = bounded;

  const settings = getSettings();
  const { provider, apiKey, model } = resolveProvider(settings);
  const question = extractLastUserText(messages);

  // ---- No provider configured: answer from the grounded offline knowledge ----
  if (provider === "builtin") {
    return offlineResponse(question, "builtin");
  }

  const system = buildSystemPrompt({ customInstructions: settings.customInstructions });
  const modelMessages = await convertToModelMessages(messages, { tools: khakiTools });
  const chain = chainFor(provider, model);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      /*
       * How long the customer is willing to watch "Inafikiria…" while we try
       * models that are not going to answer.
       *
       * Free-tier quota is per model, so when it runs out every model in the
       * chain refuses — at roughly 2.5s each. Measured with the quota spent,
       * the six-model chain took 15.2 seconds, and not a single byte reached
       * the customer until the very end. The grounded offline answer that
       * eventually arrived is good and states real prices; it was just held
       * hostage behind five more doomed attempts.
       *
       * The budget only bounds the *failover*, never a model that is answering:
       * once a candidate starts streaming we take it however long it takes.
       */
      const FAILOVER_BUDGET_MS = 5_000;
      const startedAt = Date.now();

      for (const [index, candidate] of chain.entries()) {
        if (index > 0 && Date.now() - startedAt > FAILOVER_BUDGET_MS) {
          console.warn(
            `[khaki] failover budget spent after ${index} model(s); answering from the offline knowledge`,
          );
          break;
        }

        const languageModel =
          provider === "gemini"
            ? createGoogleGenerativeAI({ apiKey })(candidate)
            : createOpenAI({ apiKey })(candidate);

        const result = streamText({
          model: languageModel,
          system,
          messages: modelMessages,
          tools: khakiTools,
          temperature: settings.temperature,
          maxOutputTokens: settings.maxOutputTokens,
          /*
           * No SDK retries. The chain below is the retry mechanism: six
           * different models, each with its own quota. Retrying the same model
           * before moving on doubles the wait for a customer with nothing on
           * screen, to re-send a request that just failed.
           */
          maxRetries: 0,
          stopWhen: stepCountIs(2),
          providerOptions: provider === "gemini" ? THINKING_OPTIONS : undefined,
          abortSignal: req.signal,
        });

        const uiStream = result.toUIMessageStream({
          sendStart: false,
          onError: (error) => describeFailure(error).message,
        });

        // Read the first chunk to find out whether the model actually served us.
        const reader = uiStream.getReader() as ReadableStreamDefaultReader<UiChunk>;
        let first: ReadableStreamReadResult<UiChunk>;
        try {
          /*
           * A model that never starts talking is not a model that answered.
           *
           * Measured over twenty-five real enquiries, the first word normally
           * arrives in 4-11 seconds, but one run took 62. There was no timeout
           * anywhere on this path, so a customer waited the whole minute with
           * "Inafikiria…" on screen and no way to know whether anything was
           * happening.
           *
           * 20 seconds is comfortably above every normal response and well
           * below the outlier. When it fires the attempt is abandoned like any
           * other failure, and the route moves on -- which, with the failover
           * budget spent, means the grounded offline answer at 20 seconds
           * rather than the model's at 62.
           */
          first = await Promise.race([
            reader.read(),
            new Promise<never>((_, reject) => {
              const timer = setTimeout(
                () => reject(new Error(`${candidate} did not start within ${FIRST_CHUNK_TIMEOUT_MS}ms`)),
                FIRST_CHUNK_TIMEOUT_MS,
              );
              // Never hold the process open for a timer that has been won.
              if (typeof timer === "object" && "unref" in timer) timer.unref();
            }),
          ]);
        } catch (error) {
          await reader.cancel().catch(() => {});
          logFailure(candidate, error);
          continue;
        }

        if (first.done) {
          await reader.cancel().catch(() => {});
          continue;
        }

        const chunk = first.value;
        if (!chunk || chunk.type === "error") {
          const text = (chunk as { errorText?: string } | undefined)?.errorText ?? "";
          console.warn(`[khaki] ${candidate} refused the turn: ${text.slice(0, 160)}`);
          await reader.cancel().catch(() => {});
          continue;
        }

        if (candidate !== chain[0]) {
          console.warn(`[khaki] served by fallback model ${candidate}`);
        }

        writer.merge(dropRepeatedText(chainStreams(chunk, reader)));
        return;
      }

      // ---- Every model refused: answer from the grounded knowledge base ----
      console.error("[khaki] every model refused the turn; using offline answers");
      const textId = "offline-fallback";
      writer.write({ type: "text-start", id: textId });
      for (const token of offlineFallback(question).split(/(\s+)/)) {
        writer.write({ type: "text-delta", id: textId, delta: token });
        if (token.trim()) await sleep(14);
      }
      writer.write({ type: "text-end", id: textId });
    },
    onError: (error) => describeFailure(error).message,
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      [PROVIDER_HEADER]: provider,
      [MODEL_HEADER]: chain[0] ?? "unknown",
    },
  });
}

/* ------------------------------------------------------------------ */
/* Stream plumbing                                                     */
/* ------------------------------------------------------------------ */

/** One event in the AI SDK UI message stream. */
type UiChunk = InferUIMessageChunk<UIMessage>;

/** Re-emits an already-read first chunk followed by the rest of the stream. */
function chainStreams<T>(first: T, reader: ReadableStreamDefaultReader<T>): ReadableStream<T> {
  return new ReadableStream<T>({
    start(controller) {
      controller.enqueue(first);

      const pump = async () => {
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      };

      void pump();
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

/**
 * The deduplicating pass, as a stream the writer can merge.
 *
 * The logic lives in `src/lib/stream-dedupe.ts` so it can be tested without a
 * server, an API key, or a model that happens to repeat itself -- which is what
 * the first version of this could not be, sitting inline here where the only
 * way to exercise it was to wait for the model to misbehave.
 *
 * \`ReadableStream.from\` is the obvious way to wrap an async generator, but it is
 * not in the TypeScript lib this project compiles against, so the generator is
 * pulled by hand in both directions.
 */
function dropRepeatedText(source: ReadableStream<UiChunk>): ReadableStream<UiChunk> {
  const reader = source.getReader();

  const frames: AsyncIterable<UiChunk> = {
    async *[Symbol.asyncIterator]() {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    },
  };

  const iterator = skipRepeatedTextBlocks<UiChunk>(frames);

  return new ReadableStream<UiChunk>({
    async pull(controller) {
      const { done, value } = await iterator.next();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    async cancel(reason) {
      await iterator.return?.(undefined);
      return source.cancel(reason);
    },
  });
}

function chainFor(provider: ProviderId, preferred: string): string[] {
  const base = provider === "openai" ? OPENAI_CHAIN : GEMINI_CHAIN;
  const ordered = [preferred, ...base];
  return ordered.filter((id, index) => id && ordered.indexOf(id) === index);
}

/* ------------------------------------------------------------------ */
/* Offline path                                                        */
/* ------------------------------------------------------------------ */

function offlineResponse(question: string, model: string): Response {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const textId = "offline-0";
      writer.write({ type: "text-start", id: textId });
      for (const token of answerOffline(question).split(/(\s+)/)) {
        writer.write({ type: "text-delta", id: textId, delta: token });
        if (token.trim()) await sleep(16);
      }
      writer.write({ type: "text-end", id: textId });
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: { [PROVIDER_HEADER]: "builtin", [MODEL_HEADER]: model },
  });
}

/**
 * What the customer sees when every model is unavailable.
 *
 * The studio's own answers are still true whether or not Google is answering,
 * so the assistant degrades to the curated knowledge base with an honest note
 * rather than an apology and a dead end.
 */
function offlineFallback(question: string): string {
  return [
    "Kwa sasa msaidizi wa AI ana shughuli nyingi, lakini hili ndilo jibu la haraka:",
    "",
    answerOffline(question),
  ].join("\n");
}

function extractLastUserText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    return message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .trim();
  }
  return "";
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

function logFailure(model: string, error: unknown): void {
  const status = extractStatus(error);
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[khaki] ${model} failed${status ? ` (${status})` : ""}: ${message.slice(0, 200)}`);
}

/**
 * Turns a provider failure into something a customer can act on.
 *
 * The distinction that matters is quota versus everything else. A studio on
 * Google's free tier hits a per-model daily cap, and "jaribu tena" is the wrong
 * advice when the answer is "top up the key".
 */
function describeFailure(error: unknown): { message: string; log: string } {
  const raw = error instanceof Error ? error.message : String(error);
  const status = extractStatus(error);
  const log = status ? `${status} ${raw.slice(0, 300)}` : raw.slice(0, 300);

  if (status === 429) {
    return {
      message:
        "Nimefika kikomo cha matumizi ya API kwa leo. Tafadhali wasiliana nasi moja kwa moja kupitia " +
        "WhatsApp, au jaribu tena baadaye.",
      log,
    };
  }
  if (status === 503 || status === 500) {
    return {
      message:
        "Model ya AI ina shughuli nyingi kwa sasa. Tafadhali jaribu tena baada ya sekunde chache.",
      log,
    };
  }
  if (status === 401 || status === 403) {
    return {
      message:
        "Muunganisho wa AI haujakamilika. Tafadhali wasiliana nasi moja kwa moja kupitia WhatsApp.",
      log,
    };
  }
  return {
    message:
      "Samahani, mtandao umekatika kwa muda. Tafadhali jaribu tena, au wasiliana nasi kupitia WhatsApp.",
    log,
  };
}

function extractStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as { statusCode?: unknown; status?: unknown; lastError?: unknown };

  if (typeof candidate.statusCode === "number") return candidate.statusCode;
  if (typeof candidate.status === "number") return candidate.status;

  const last = candidate.lastError as { statusCode?: unknown } | undefined;
  if (typeof last?.statusCode === "number") return last.statusCode;

  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
