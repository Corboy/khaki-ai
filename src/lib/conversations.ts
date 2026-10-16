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
  /**
   * Kept above the recency groups, and exempt from the cap below.
   *
   * Pinning has to survive eviction or it means nothing: the store keeps the
   * newest 40, so a conversation pinned in January would be dropped in March by
   * the one conversation it was pinned to outrank. `saveStore` therefore takes
   * pinned items first and fills the remaining slots by recency.
   */
  pinned?: boolean;
  /** Hidden from the recency groups, reachable under its own heading. */
  archived?: boolean;
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

/**
 * The conversations worth keeping, in the order they should be kept.
 *
 * Pinned first, then everything else by recency. Used both by the normal write
 * and by the quota retry, so the two can never disagree about what matters.
 */
function retentionOrder(conversations: readonly StoredConversation[]): StoredConversation[] {
  const byRecency = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  return [...byRecency.filter((c) => c.pinned), ...byRecency.filter((c) => !c.pinned)];
}

/** Trim a list to the cap, keeping every pinned conversation. */
function retain(conversations: readonly StoredConversation[], limit: number): StoredConversation[] {
  const ordered = retentionOrder(conversations);
  const pinned = ordered.filter((c) => c.pinned);
  const rest = ordered.filter((c) => !c.pinned);

  // Pinned items are never evicted, even if there are more of them than the
  // cap allows. Dropping one would break the promise pinning makes; the cap is
  // a storage guard, and the user asked for these by name.
  if (pinned.length >= limit) return pinned;

  return [...pinned, ...rest.slice(0, limit - pinned.length)];
}

export function saveStore(store: ConversationStore): void {
  if (typeof window === "undefined") return;

  const trimmed: ConversationStore = {
    version: VERSION,
    activeId: store.activeId,
    conversations: retain(store.conversations, MAX_CONVERSATIONS).map((conversation) => ({
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
     *
     * Through `retain`, so a pinned conversation is not the thing that gets
     * dropped to make room. That is the whole point of pinning.
     */
    try {
      const keep = Math.max(1, Math.floor(trimmed.conversations.length / 2));
      trimmed.conversations = retain(trimmed.conversations, keep);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      /* give up quietly — the session still works, it just will not persist */
    }
  }
}

/**
 * A half-written message, kept per conversation.
 *
 * ---------------------------------------------------------------------------
 * Why this needs its own storage
 * ---------------------------------------------------------------------------
 * The composer's text lives in the assistant-ui runtime, and the runtime is
 * **remounted on every conversation switch** — `ChatWorkspace` keys it by
 * conversation id, which is what makes switching threads deterministic instead
 * of a race against a live stream.
 *
 * Deterministic also means destructive: type half a question, click another
 * thread in the sidebar out of curiosity, and the draft is gone with no warning
 * and no undo. On a phone, where the sidebar is one tap away and the keyboard
 * covers half the screen, that is a normal thing to do by accident.
 *
 * So the text is mirrored into `localStorage` under its own key, written on
 * every keystroke and read back when the thread is reopened.
 *
 * ---------------------------------------------------------------------------
 * Why a separate key and not a field on the conversation
 * ---------------------------------------------------------------------------
 * A draft is not part of the transcript. Putting it in the conversation object
 * would mean every keystroke rewrites the whole history document — up to 40
 * conversations and 200 messages each — and a draft would then be savable,
 * searchable and exportable, none of which it should be. One small key per
 * draft keeps the write cheap and the transcript clean.
 *
 * The keys are swept when a conversation is deleted, so they cannot accumulate
 * past the conversation cap.
 */

const DRAFT_PREFIX = "khaki:draft:";

export function readDraft(conversationId: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(DRAFT_PREFIX + conversationId) ?? "";
  } catch {
    return "";
  }
}

export function writeDraft(conversationId: string, text: string): void {
  if (typeof window === "undefined") return;
  try {
    if (text) window.localStorage.setItem(DRAFT_PREFIX + conversationId, text);
    else window.localStorage.removeItem(DRAFT_PREFIX + conversationId);
  } catch {
    /* storage blocked — the draft still lives for this session */
  }
}

/** Drops the stored draft, e.g. when its conversation is deleted. */
export function clearDraft(conversationId: string): void {
  writeDraft(conversationId, "");
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

/**
 * Groups conversations the way a history sidebar should read.
 *
 * Pinned and archived conversations are excluded: pinned items sit in their own
 * group above these, and archived ones below. Listing them here too would put
 * the same row on screen twice, under two headings that disagree about when it
 * happened.
 */
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
    if (conversation.pinned || conversation.archived) continue;
    const age = today + day - conversation.updatedAt;
    if (conversation.updatedAt >= today) buckets[0].items.push(conversation);
    else if (conversation.updatedAt >= today - day) buckets[1].items.push(conversation);
    else if (conversation.updatedAt >= today - 7 * day) buckets[2].items.push(conversation);
    else if (age > 0) buckets[3].items.push(conversation);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}

/* ------------------------------------------------------------------ */
/* The sidebar's other groups                                          */
/* ------------------------------------------------------------------ */

/** Pinned conversations, newest first. */
export function pinnedConversations(
  conversations: readonly StoredConversation[],
): StoredConversation[] {
  return conversations
    .filter((c) => c.pinned && c.messages.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Archived conversations, newest first. */
export function archivedConversations(
  conversations: readonly StoredConversation[],
): StoredConversation[] {
  return conversations
    .filter((c) => c.archived && c.messages.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Free-text search across titles and message bodies.
 *
 * It searches the *messages*, not just the title. A customer looking for the
 * thread where they discussed a price will remember a word from the answer, not
 * the four-word title the title generator clipped for them. Titles still rank
 * first, because a title match is nearly always the one meant.
 *
 * A pinned or archived conversation is still findable — filing something away
 * should hide it from the list, not from the person looking for it.
 */
export function searchConversations(
  conversations: readonly StoredConversation[],
  query: string,
): StoredConversation[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const scored: Array<{ conversation: StoredConversation; score: number }> = [];

  for (const conversation of conversations) {
    if (conversation.messages.length === 0) continue;

    const inTitle = conversation.title.toLowerCase().includes(needle);
    let inBody = false;
    if (!inTitle) {
      for (const message of conversation.messages) {
        for (const part of message.parts) {
          if (part.type === "text" && part.text.toLowerCase().includes(needle)) {
            inBody = true;
            break;
          }
        }
        if (inBody) break;
      }
    }

    if (inTitle) scored.push({ conversation, score: 0 });
    else if (inBody) scored.push({ conversation, score: 1 });
  }

  return scored
    .sort((a, b) => (a.score - b.score) || (b.conversation.updatedAt - a.conversation.updatedAt))
    .map((entry) => entry.conversation);
}

/**
 * A title typed by hand.
 *
 * Blank input means "go back to the derived title", not "call it nothing": an
 * empty row in the sidebar is worse than the first question it was named after.
 * The length cap matches the generator's, so a pasted paragraph cannot make one
 * row ellipsise across the whole rail.
 */
export function cleanTitle(input: string, fallback: string): string {
  const trimmed = input.replace(/\s+/g, " ").trim();
  if (!trimmed) return fallback;
  if (trimmed.length <= MAX_TITLE) return trimmed;

  const clipped = trimmed.slice(0, MAX_TITLE);
  const lastSpace = clipped.lastIndexOf(" ");
  return (lastSpace > MAX_TITLE / 2 ? clipped.slice(0, lastSpace) : clipped).trim();
}

const MAX_TITLE = 46;
