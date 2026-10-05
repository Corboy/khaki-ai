/**
 * Dropping a text block that repeats the one before it.
 *
 * With `stopWhen: stepCountIs(2)` the model sometimes answers in one step and
 * then answers again in a second, identical word for word, and the customer
 * reads the whole reply twice. A frame dump confirmed the shape: two
 * `text-start` blocks, different ids, same content. A line in the system prompt
 * asking the model not to repeat itself did not stop it.
 *
 * The first block streams straight through, so nothing about the normal,
 * progressive answer changes. Only a *second* block is held back, and only
 * until it ends and can be compared: if it differs it is emitted whole, if it
 * matches it is dropped and never reaches the customer.
 *
 * The cost, stated plainly: a genuine second block -- a preamble, then a tool
 * card, then the answer -- arrives in one piece instead of typing itself out.
 * That is a smaller price than the studio's assistant saying everything twice,
 * and it is paid only on replies that have two blocks at all.
 */

/** The parts of a UI message chunk this pass cares about. */
export interface TextFrame {
  type: string;
  id?: string;
  delta?: string;
}

/**
 * Yields the frames, minus any text block identical to the previous one.
 *
 * Takes either kind of iterable: `for await` handles both, and a caller with an
 * array in hand should not have to wrap it to be allowed to use this.
 *
 * Deliberately structural rather than tied to the AI SDK's chunk union: the
 * tool frames, step frames and finish frames all pass through untouched, and a
 * test can drive it with three-field objects.
 */
export async function* skipRepeatedTextBlocks<T extends TextFrame>(
  source: Iterable<T> | AsyncIterable<T>,
): AsyncGenerator<T> {
  let previous = "";
  let blocks = 0;
  let buffering = false;
  let pending: T[] = [];
  let current = "";

  for await (const frame of source) {
    if (frame.type === "text-start") {
      blocks += 1;
      if (blocks > 1) {
        // A later block: hold it until we know whether it repeats.
        buffering = true;
        pending = [frame];
        current = "";
      } else {
        yield frame;
      }
      continue;
    }

    if (frame.type === "text-delta") {
      const delta = frame.delta ?? "";
      if (buffering) {
        pending.push(frame);
        current += delta;
      } else {
        previous += delta;
        yield frame;
      }
      continue;
    }

    if (frame.type === "text-end") {
      if (buffering) {
        buffering = false;
        const repeated = current.trim().length > 0 && current.trim() === previous.trim();
        if (!repeated) {
          for (const chunk of pending) yield chunk;
          yield frame;
          previous = current;
        }
        pending = [];
        current = "";
      } else {
        yield frame;
      }
      continue;
    }

    yield frame;
  }
}

/** Collects a stream of frames, for tests and for reading a whole reply. */
export async function collectFrames<T extends TextFrame>(
  source: Iterable<T> | AsyncIterable<T>,
): Promise<T[]> {
  const out: T[] = [];
  for await (const frame of source) out.push(frame);
  return out;
}

/** The text a run of frames produces. */
export function textOfFrames(frames: readonly TextFrame[]): string {
  return frames
    .filter((frame) => frame.type === "text-delta")
    .map((frame) => frame.delta ?? "")
    .join("");
}

/**
 * A block-shaped reply, for tests: one `text-start`, its deltas, one `text-end`.
 */
export function textBlock(id: string, text: string, chunk = 12): TextFrame[] {
  const frames: TextFrame[] = [{ type: "text-start", id }];
  for (let index = 0; index < text.length; index += chunk) {
    frames.push({ type: "text-delta", id, delta: text.slice(index, index + chunk) });
  }
  frames.push({ type: "text-end", id });
  return frames;
}
