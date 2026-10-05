import type { UIMessage } from "ai";

/**
 * Bounds on what one request is allowed to cost.
 *
 * The chat route took whatever the client sent and passed all of it to the
 * model. There is no login on this app and no rate limit, so on a deployed URL
 * that is an open tap: a script can post five hundred messages, or one message
 * of a megabyte, and every token of it is billed to the studio. The owner had
 * been told to turn on billing, which is exactly when it starts to matter.
 *
 * Two limits, both on the server, both invisible to a real customer:
 *
 *   · the most recent MAX_CONTEXT_MESSAGES turns
 *   · and only as far back as MAX_CONTEXT_CHARS of text
 *
 * A genuine conversation about a wedding never approaches either. The last
 * message is always kept whatever it costs -- dropping it would answer a
 * question the customer did not ask.
 */

export const MAX_CONTEXT_MESSAGES = 24;
export const MAX_CONTEXT_CHARS = 24_000;

/** How much text a message carries, ignoring tool parts and attachments. */
function textLength(message: UIMessage): number {
  let total = 0;
  for (const part of message.parts ?? []) {
    if (part.type === "text" && typeof part.text === "string") total += part.text.length;
  }
  return total;
}

/**
 * The slice of a conversation worth sending, newest first.
 *
 * Walks backwards from the end so the recent context is what survives, and
 * stops when the budget is spent rather than truncating a message in the
 * middle -- half a question is worse than a shorter history.
 */
export function boundMessages(messages: readonly UIMessage[]): UIMessage[] {
  if (messages.length === 0) return [];

  const recent = messages.slice(-MAX_CONTEXT_MESSAGES);
  const kept: UIMessage[] = [];
  let budget = MAX_CONTEXT_CHARS;

  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const message = recent[index];
    const size = textLength(message);

    // `kept.length === 0` is the last message: it is the question, so it stays
    // however large it is.
    if (kept.length > 0 && size > budget) break;

    kept.unshift(message);
    budget -= size;
  }

  return kept;
}

/** True when `boundMessages` actually removed something. */
export function wasTrimmed(original: readonly UIMessage[], bounded: readonly UIMessage[]): boolean {
  return bounded.length < original.length;
}
