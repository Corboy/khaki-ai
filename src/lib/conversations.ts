import type { UIMessage } from "ai";

/**
 * Conversation storage.
 *
 * ChatGPT's defining behaviour is that your history is still there tomorrow, so
 * this is the piece that makes the app a workspace rather than a demo. It lives
 * in `localStorage`: no server, no account, nothing to leak, and it works on a
 * static deployment.
 *
 * The store is deliberately boring — one JSON document, versioned, with hard
 * caps so a long-lived browser cannot fill its own storage quota.
 */

export interface StoredConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
}

export interface ConversationStore {
  version: 1;
  activeId: string | null;
  conversations: StoredConversation[];
}

const STORAGE_KEY = "khaki:conversations";
const VERSION = 1;

/** Caps that keep the document small enough to stay well inside a 5 MB quota. */
const MAX_CONVERSATIONS = 40;
const MAX_MESSAGES_PER_CONVERSATION = 200;

export const UNTITLED = "Mazungumzo mapya";

const EMPTY_STORE: ConversationStore = { version: VERSION, activeId: null, conversations: [] };

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isConversation(value: unknown): value is StoredConversation {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StoredConversation>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    Array.isArray(candidate.messages)
  );
}

/** Reads the store, repairing anything malformed rather than throwing it away. */
export function loadStore(): ConversationStore {
  if (typeof window === "undefined") return EMPTY_STORE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STORE;

    const parsed = JSON.parse(raw) as Partial<ConversationStore>;
    const conversations = Array.isArray(parsed.conversations)
      ? parsed.conversations.filter(isConversation)
      : [];

    conversations.sort((a, b) => b.updatedAt - a.updatedAt);

    // Reopen the most recent conversation that actually has content. An empty
    // draft created just before a reload would otherwise become "active" and
    // hide real history behind the welcome screen.
    const requested =
      typeof parsed.activeId === "string"
        ? conversations.find((conversation) => conversation.id === parsed.activeId)
        : undefined;

    const activeId =
      requested && requested.messages.length > 0
        ? requested.id
        : (conversations.find((conversation) => conversation.messages.length > 0)?.id ??
          requested?.id ??
          conversations[0]?.id ??
          null);

    return { version: VERSION, activeId, conversations };
  } catch {
    return EMPTY_STORE;
  }
}

export function saveStore(store: ConversationStore): void {
  if (typeof window === "undefined") return;

  const trimmed: ConversationStore = {
    version: VERSION,
    activeId: store.activeId,
    conversations: [...store.conversations]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CONVERSATIONS)
      .map((conversation) => ({
        ...conversation,
        messages:
          conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION
            ? conversation.messages.slice(-MAX_MESSAGES_PER_CONVERSATION)
            : conversation.messages,
      })),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /*
     * Quota exceeded or storage blocked. Drop the least recently used half and
     * try once more, so an active conversation is never lost to an old one.
     *
     * Half of what is actually there — not half of MAX_CONVERSATIONS. Slicing
     * to a fixed 20 shrank nothing when the store held 20 or fewer, so the
     * retry failed exactly like the first attempt and the customer lost their
     * whole history instead of the older part of it. The list is already sorted
     * newest first, and the floor of 1 keeps the conversation in use.
     */
    try {
      const keep = Math.max(1, Math.floor(trimmed.conversations.length / 2));
      trimmed.conversations = trimmed.conversations.slice(0, keep);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      /* give up quietly — the session still works, it just will not persist */
    }
  }
}

export function createConversation(now = Date.now()): StoredConversation {
  return { id: newId(), title: UNTITLED, createdAt: now, updatedAt: now, messages: [] };
}

/** Derives a conversation title from its first question. */
export function titleFromMessages(messages: readonly UIMessage[]): string | null {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return null;

  const text = firstUser.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return null;
  if (text.length <= 46) return text;

  // Trim on a word boundary so titles never end mid-word.
  const clipped = text.slice(0, 46);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 24 ? clipped.slice(0, lastSpace) : clipped).trim()}…`;
}

/** Relative time, in the register a person would actually say it. */
export function formatRelative(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return "sasa hivi";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `dakika ${minutes}`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `saa ${hours}`;

  const days = Math.round(hours / 24);
  if (days === 1) return "jana";
  if (days < 7) return `siku ${days}`;

  return new Date(timestamp).toLocaleDateString("sw-TZ", { day: "numeric", month: "short" });
}

/** Groups conversations the way a history sidebar should read. */
export function groupByRecency(
  conversations: readonly StoredConversation[],
  now = Date.now(),
): Array<{ label: string; items: StoredConversation[] }> {
  const day = 24 * 60 * 60 * 1000;
  const buckets: Array<{ label: string; items: StoredConversation[] }> = [
    { label: "Leo", items: [] },
    { label: "Jana", items: [] },
    { label: "Wiki hii", items: [] },
    { label: "Mapema", items: [] },
  ];

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();

  for (const conversation of conversations) {
    if (conversation.messages.length === 0) continue;
    const age = today + day - conversation.updatedAt;
    if (conversation.updatedAt >= today) buckets[0].items.push(conversation);
    else if (conversation.updatedAt >= today - day) buckets[1].items.push(conversation);
    else if (conversation.updatedAt >= today - 7 * day) buckets[2].items.push(conversation);
    else if (age > 0) buckets[3].items.push(conversation);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}
