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
import { KHAKI_CONTACT_REASONS } from "@/data/khaki-operations";
import { KHAKI_SERVICES } from "@/data/khakiKnowledge";
import { boundMessages, wasTrimmed } from "@/lib/bound-messages";
import { CHAT_TEMPORARILY_UNAVAILABLE_MESSAGE } from "@/lib/chat-unavailable";
import { getToolPermissions, type ConversationTurn } from "@/lib/tool-policy";
import { getSettings, modelChainFor, resolveProvider } from "@/lib/settings";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { sanitizeProviderError } from "@/lib/provider-error-diagnostics";
import { skipRepeatedTextBlocks } from "@/lib/stream-dedupe";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Let the client show which brain answered. */
const PROVIDER_HEADER = "x-khaki-provider";
const MODEL_HEADER = "x-khaki-model";

/**
 * Model failover without a wasted request.
 *
 * Google's quota is scoped to the project and model; a different candidate may
 * still have capacity when one is exhausted. The route opens the real stream
 * and only moves on if its first chunk is an error. A normal text reply costs
 * one model call; a tool turn may need a second model step.
 */
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
 * Thinking level.
 *
 * A low level reduces unnecessary reasoning latency for routine studio facts.
 * The 4.6s-versus-39s comparison was measured historically on `gemini-3.5-flash`;
 * it is not a benchmark of the current `gemini-3.8-flash` default.
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

const contactHandoffSchema = z.object({
  reason: z.enum(KHAKI_CONTACT_REASONS).describe("Sababu fupi ya kumwelekeza mteja kwa timu"),
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
      "Tumia hii tu baada ya mteja kuonyesha nia wazi ya kuanza booking (mfano: 'nataka kubook' au 'naomba tuanze booking') na ametoa angalau taarifa moja ya booking. " +
      "Usitumie kwa salamu, kuuliza bei/package tu, au kutaja event, tarehe au package bila nia ya kubook. Inaandaa kadi ya booking yenye kitufe cha kutuma ombi kwa timu kupitia WhatsApp.",
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
  show_contact_options: {
    description:
      "Tumia wakati mteja ameomba kuwasiliana na timu, au jibu linahitaji uthibitisho/handoff wa timu (availability, malalamiko, huduma isiyothibitishwa, au logistics za Friday Melody Moment). " +
      "Huonyesha kadi yenye vitufe tofauti vya WhatsApp na simu ya kawaida. WhatsApp hufungua draft tu, haitumi ujumbe; kitufe cha simu hufungua dialer na mteja ndiye anayeanzisha simu. " +
      "Usitumie kwa salamu, small talk, kuuliza bei/package pekee, au kama kadi ya andaa_booking tayari inatimiza handoff hiyo.",
    inputSchema: contactHandoffSchema,
    execute: async ({ reason }: z.infer<typeof contactHandoffSchema>) => ({
      type: "contact-handoff" as const,
      reason,
    }),
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
  const toolPermissions = getToolPermissions(extractConversationTurns(messages));
  const turnTools = toolsForTurn(toolPermissions);

  // ---- No provider configured: never substitute curated/offline answers ----
  if (provider === "builtin") {
    return temporaryUnavailableResponse(provider, model);
  }

  const system = buildSystemPrompt({
    customInstructions: settings.customInstructions,
    whatsappNumber: settings.whatsappNumber,
  });
  // Keep the full set available for parsing previous tool parts in history;
  // only the current turn's exposed tools are permission-gated below.
  const modelMessages = await convertToModelMessages(messages, { tools: khakiTools });
  const chain = modelChainFor(provider, model);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      /*
       * How long the customer is willing to watch "Inafikiria…" while we try
       * models that are not going to answer.
       *
       * Free-tier quota is per model. Current Gemini candidates are stable
       * function-calling Flash variants, with deprecated model IDs redirected
       * before the request reaches Google. The budget avoids spending the whole
       * turn on a quota-exhausted chain before returning a short unavailable notice.
       *
       * The budget only bounds the *failover*, never a model that is answering:
       * once a candidate starts streaming we take it however long it takes.
       */
      const FAILOVER_BUDGET_MS = 5_000;
      const startedAt = Date.now();

      for (const [index, candidate] of chain.entries()) {
        if (index > 0 && Date.now() - startedAt > FAILOVER_BUDGET_MS) {
          console.warn(
            `[khaki] failover budget spent after ${index} model(s); returning unavailable notice`,
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
          tools: turnTools,
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
          onError: (error) => {
            const status = extractStatus(error);
            console.error(
              `[khaki] ${candidate} provider error${status ? ` (${status})` : ""}: ${sanitizeProviderError(error)}`,
            );
            return CHAT_TEMPORARILY_UNAVAILABLE_MESSAGE;
          },
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
           * the thinking indicator on screen and no way to know whether anything was happening.
           *
           * 20 seconds is comfortably above every normal response and well
           * below the outlier. When it fires the attempt is abandoned like any
           * other failure, and the route moves on -- or shows the unavailable
           * notice once the bounded failover budget is spent.
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

      // ---- Every model refused: return a brief, honest service notice ----
      console.error("[khaki] every model refused the turn; returning unavailable notice");
      writeTemporaryUnavailableMessage(writer, "temporarily-unavailable");
    },
    onError: () => CHAT_TEMPORARILY_UNAVAILABLE_MESSAGE,
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

/* ------------------------------------------------------------------ */
/* Temporarily unavailable path                                        */
/* ------------------------------------------------------------------ */

function temporaryUnavailableResponse(provider: string, model: string): Response {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writeTemporaryUnavailableMessage(writer, "temporarily-unavailable");
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: { [PROVIDER_HEADER]: provider, [MODEL_HEADER]: model },
  });
}

function writeTemporaryUnavailableMessage(
  writer: { write: (chunk: UiChunk) => void },
  id: string,
): void {
  writer.write({ type: "text-start", id });
  writer.write({ type: "text-delta", id, delta: CHAT_TEMPORARILY_UNAVAILABLE_MESSAGE });
  writer.write({ type: "text-end", id });
}

function extractConversationTurns(messages: UIMessage[]): ConversationTurn[] {
  let start = 0;
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    const alreadyHandedOff = message.parts.some((part) => {
      const candidate = part as { type?: string; toolName?: string };
      return (
        candidate.type === "tool-show_contact_options" ||
        candidate.type === "tool-andaa_booking" ||
        (candidate.type === "dynamic-tool" &&
          (candidate.toolName === "show_contact_options" || candidate.toolName === "andaa_booking"))
      );
    });
    if (alreadyHandedOff) start = index + 1;
  }

  return messages.slice(start).flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") return [];
    const text = message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .trim();
    return text ? [{ role: message.role, text }] : [];
  });
}

function toolsForTurn(permissions: ReturnType<typeof getToolPermissions>): ToolSet {
  const tools: ToolSet = { onyesha_bei: khakiTools.onyesha_bei };
  if (permissions.prepareBooking) tools.andaa_booking = khakiTools.andaa_booking;
  if (permissions.showContactOptions) tools.show_contact_options = khakiTools.show_contact_options;
  return tools;
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

function logFailure(model: string, error: unknown): void {
  const status = extractStatus(error);
  const message = sanitizeProviderError(error).slice(0, 200);
  console.warn(`[khaki] ${model} failed${status ? ` (${status})` : ""}: ${message}`);
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
