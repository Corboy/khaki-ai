"use client";

import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AssistantChatTransport, useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { useEffect, useMemo, useRef, type ReactNode } from "react";

import { useConversations } from "@/components/chat/conversations-provider";
import type { StoredConversation } from "@/lib/conversations";

/**
 * KhakiChatRuntime — the single place the assistant runtime is created.
 *
 * Two details make persisted conversations work:
 *
 *  · `messages` is read **once** into a ref. `useChat` takes it as a seed, so
 *    feeding the saved array back on every render would reset the live stream
 *    the moment the first token was written to storage.
 *  · The component is keyed by conversation id in `ChatWorkspace`, so switching
 *    threads remounts it. That is deterministic — no racing an in-flight run.
 */

/** Save at most this often while tokens are streaming in. */
const SAVE_THROTTLE_MS = 500;

export function KhakiChatRuntime({
  conversation,
  children,
}: {
  conversation: StoredConversation;
  children: ReactNode;
}) {
  const { syncMessages } = useConversations();

  const transport = useMemo(
    () => new AssistantChatTransport({ api: "/api/chat", credentials: "same-origin" }),
    [],
  );

  // Frozen seed — see the note above.
  const seed = useRef(conversation.messages).current;

  const chat = useChat({
    id: conversation.id,
    messages: seed,
    transport,
  });

  const runtime = useAISDKRuntime(chat);

  const { messages, status } = chat;
  const lastSave = useRef(0);

  // Throttled write while the answer streams.
  useEffect(() => {
    if (!messages.length) return;
    const now = Date.now();
    if (now - lastSave.current < SAVE_THROTTLE_MS) return;
    lastSave.current = now;
    syncMessages(conversation.id, messages);
  }, [messages, conversation.id, syncMessages]);

  // Guaranteed write when a run settles (including an aborted or failed one).
  useEffect(() => {
    if (status === "streaming" || status === "submitted") return;
    const latest = chat.messages;
    if (!latest.length) return;
    lastSave.current = Date.now();
    syncMessages(conversation.id, latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, conversation.id, syncMessages]);

  // Final write if the user navigates away mid-stream.
  //
  // Through a ref, because this effect runs once per conversation and its
  // closure would otherwise hold the messages as they were at mount.
  // `useChat` does not return a live handle: it builds a plain object each
  // render whose `messages` is that render's snapshot, so `chat.messages` read
  // from an effect with `[conversation.id]` deps is the *seed*.
  //
  // That mattered. Leaving mid-answer — which on a 9-second reply is a normal
  // thing to do on a phone — wrote the seed back over whatever had already
  // streamed, so the question and the partial answer both disappeared. The ref
  // is current regardless of which render closed over it.
  const latestMessages = useRef(messages);
  useEffect(() => {
    latestMessages.current = messages;
  });

  useEffect(() => {
    return () => {
      if (latestMessages.current.length) syncMessages(conversation.id, latestMessages.current);
    };
  }, [conversation.id, syncMessages]);

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
