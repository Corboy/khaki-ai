"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UIMessage } from "ai";

import {
  createConversation,
  loadStore,
  saveStore,
  titleFromMessages,
  UNTITLED,
  type StoredConversation,
} from "@/lib/conversations";

/**
 * Conversation state for the whole app.
 *
 * One provider owns the list and the active id; the runtime remounts when the
 * active id changes, which is what makes switching threads deterministic
 * instead of a race against a streaming response.
 */

interface ConversationsValue {
  /** Null until the store has been read on the client. */
  active: StoredConversation | null;
  conversations: StoredConversation[];
  /** Conversations worth listing — empty drafts are hidden. */
  visible: StoredConversation[];
  /** False during the first client render, before localStorage is read. */
  ready: boolean;
  startNew: () => void;
  select: (id: string) => void;
  remove: (id: string) => void;
  /** Called by the runtime as messages change. */
  syncMessages: (id: string, messages: UIMessage[]) => void;
}

const ConversationsContext = createContext<ConversationsValue | null>(null);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Read the store after mount so the server and client markup always agree.
  useEffect(() => {
    const store = loadStore();
    if (store.conversations.length) {
      setConversations(store.conversations);
      setActiveId(store.activeId ?? store.conversations[0]!.id);
    } else {
      const fresh = createConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
    }
    setReady(true);
  }, []);

  /*
   * Persist whenever the list changes, but never before the first read — that
   * would overwrite real history with an empty document.
   *
   * The guard is `ready` alone. There used to be a second one, a `persistRef`
   * that was created as `true`, read here and never written anywhere: a switch
   * that could not be switched, which reads to the next person as though
   * persistence is sometimes off. It never was.
   */
  useEffect(() => {
    if (!ready) return;
    saveStore({ version: 1, activeId, conversations });
  }, [ready, activeId, conversations]);

  const startNew = useCallback(() => {
    // Reuse an existing empty draft rather than piling up blanks. The lookup
    // happens outside the state updater: calling setActiveId from inside one
    // makes the update a render-phase side effect, which React is free to
    // ignore — and it silently dropped the switch.
    const empty = conversations.find((conversation) => conversation.messages.length === 0);
    if (empty) {
      setActiveId(empty.id);
      return;
    }

    const fresh = createConversation();
    setConversations((current) => [fresh, ...current]);
    setActiveId(fresh.id);
  }, [conversations]);

  const select = useCallback((id: string) => setActiveId(id), []);

  const remove = useCallback(
    (id: string) => {
      const remaining = conversations.filter((conversation) => conversation.id !== id);

      if (!remaining.length) {
        const fresh = createConversation();
        setConversations([fresh]);
        setActiveId(fresh.id);
        return;
      }

      setConversations(remaining);
      if (activeId === id) {
        setActiveId(
          remaining.find((conversation) => conversation.messages.length > 0)?.id ??
            remaining[0]!.id,
        );
      }
    },
    [conversations, activeId],
  );

  const syncMessages = useCallback((id: string, messages: UIMessage[]) => {
    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.id !== id) return conversation;

        // Cheap identity check: the runtime hands us a new array on every
        // token, so compare length and the last message id before doing work.
        const previous = conversation.messages;
        const last = messages[messages.length - 1];
        const lastPrevious = previous[previous.length - 1];
        if (previous.length === messages.length && last?.id === lastPrevious?.id) {
          // Same shape — the last message is still streaming, so keep its text
          // current without rebuilding a title.
          return { ...conversation, messages, updatedAt: Date.now() };
        }

        const derived = titleFromMessages(messages);
        return {
          ...conversation,
          messages,
          title:
            derived && (conversation.title === UNTITLED || !conversation.title)
              ? derived
              : conversation.title,
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const value = useMemo<ConversationsValue>(() => {
    const active = conversations.find((conversation) => conversation.id === activeId) ?? null;
    const visible = [...conversations]
      .filter((conversation) => conversation.messages.length > 0)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return {
      active,
      conversations,
      visible,
      ready,
      startNew,
      select,
      remove,
      syncMessages,
    };
  }, [conversations, activeId, ready, startNew, select, remove, syncMessages]);

  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
}

export function useConversations(): ConversationsValue {
  const value = useContext(ConversationsContext);
  if (!value) {
    throw new Error("useConversations must be used inside <ConversationsProvider>");
  }
  return value;
}
