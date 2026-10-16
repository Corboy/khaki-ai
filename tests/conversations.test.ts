import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cleanTitle,
  clearDraft,
  createConversation,
  formatRelative,
  groupByRecency,
  loadStore,
  pinnedConversations,
  readDraft,
  saveStore,
  searchConversations,
  titleFromMessages,
  writeDraft,
  UNTITLED,
  type StoredConversation,
} from "@/lib/conversations";

/**
 * Tests for saved conversations.
 *
 * This is the module where a bug is least visible and most annoying: a title
 * that ends mid-word, a history that silently drops the thread you were reading,
 * a full localStorage that wipes everything instead of the oldest half. None of
 * it throws, and none of it shows up in a screenshot.
 */

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const user = (text: string) => ({
  id: `u${Math.random()}`,
  role: "user" as const,
  parts: [{ type: "text" as const, text }],
});

const DAY = 24 * 60 * 60 * 1000;

function conversation(overrides: Partial<StoredConversation> = {}): StoredConversation {
  return {
    id: "c1",
    title: "Mazungumzo",
    createdAt: 0,
    updatedAt: 0,
    messages: [user("Bei zikoje?")],
    ...overrides,
  };
}

/** A window with a localStorage that behaves, and can be told to fill up. */
function fakeWindow(options: { failOnWrite?: boolean } = {}) {
  const store = new Map<string, string>();
  return {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (options.failOnWrite) {
          const error = new Error("QuotaExceededError");
          error.name = "QuotaExceededError";
          throw error;
        }
        store.set(key, value);
      },
      removeItem: (key: string) => store.delete(key),
      _raw: store,
    },
  };
}

function withWindow<T>(win: unknown, run: () => T): T {
  const previous = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = win;
  try {
    return run();
  } finally {
    (globalThis as { window?: unknown }).window = previous;
  }
}

/* ------------------------------------------------------------------ */
/* Titles                                                              */
/* ------------------------------------------------------------------ */

describe("conversation titles", () => {
  it("returns null when there is no question yet", () => {
    assert.equal(titleFromMessages([]), null);
    assert.equal(
      titleFromMessages([{ id: "a", role: "assistant", parts: [{ type: "text", text: "Habari" }] }]),
      null,
    );
  });

  it("uses a short question whole", () => {
    assert.equal(titleFromMessages([user("Bei zikoje?")]), "Bei zikoje?");
  });

  it("collapses whitespace and newlines", () => {
    assert.equal(titleFromMessages([user("  Bei\n\nzikoje?  ")]), "Bei zikoje?");
  });

  it("joins multiple text parts", () => {
    const message = {
      id: "u",
      role: "user" as const,
      parts: [
        { type: "text" as const, text: "Nina harusi" },
        { type: "text" as const, text: "Desemba" },
      ],
    };
    assert.equal(titleFromMessages([message]), "Nina harusi Desemba");
  });

  it("returns null rather than an empty title", () => {
    assert.equal(titleFromMessages([user("   ")]), null);
  });

  it("never ends a long title mid-word", () => {
    const long = "Nataka kuweka booking ya harusi tarehe kumi na mbili Desemba huko Kigamboni";
    const title = titleFromMessages([user(long)]);
    assert.ok(title);
    assert.ok(title.endsWith("…"), "a clipped title is marked as clipped");
    assert.ok(title.length <= 47, `title too long: ${title.length}`);
    // The last character before the ellipsis must complete a word.
    const withoutEllipsis = title.slice(0, -1);
    assert.equal(withoutEllipsis, withoutEllipsis.trimEnd());
    assert.ok(long.startsWith(withoutEllipsis), "the clip is a prefix of the original");
  });

  it("uses the first question, not a later one", () => {
    const messages = [user("Swali la kwanza"), user("Swali la pili")];
    assert.equal(titleFromMessages(messages), "Swali la kwanza");
  });
});

/* ------------------------------------------------------------------ */
/* Relative time                                                       */
/* ------------------------------------------------------------------ */

describe("relative time", () => {
  const now = Date.UTC(2026, 9, 5, 12, 0, 0);

  it("says 'sasa hivi' under a minute", () => {
    assert.equal(formatRelative(now - 5_000, now), "sasa hivi");
    assert.equal(formatRelative(now, now), "sasa hivi");
  });

  it("counts minutes, then hours", () => {
    assert.equal(formatRelative(now - 5 * 60_000, now), "dakika 5");
    assert.equal(formatRelative(now - 3 * 60 * 60_000, now), "saa 3");
  });

  it("says 'jana' for exactly one day", () => {
    assert.equal(formatRelative(now - DAY, now), "jana");
  });

  it("counts days within the week", () => {
    assert.equal(formatRelative(now - 3 * DAY, now), "siku 3");
    assert.equal(formatRelative(now - 6 * DAY, now), "siku 6");
  });

  it("falls back to a date beyond a week", () => {
    const old = Date.UTC(2026, 8, 20, 9, 0, 0);
    const label = formatRelative(old, now);
    assert.ok(!label.startsWith("siku"), `expected a date, got "${label}"`);
    assert.match(label, /20/);
  });

  it("does not produce negative time for a clock that is ahead", () => {
    assert.equal(formatRelative(now + 60_000, now), "sasa hivi");
  });
});

/* ------------------------------------------------------------------ */
/* Grouping                                                            */
/* ------------------------------------------------------------------ */

describe("history grouping", () => {
  /** Local midnight today, which is what groupByRecency compares against. */
  const now = new Date(2026, 9, 5, 12, 0, 0).getTime();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();

  const at = (updatedAt: number) => conversation({ id: `c${updatedAt}`, updatedAt });

  it("puts today's conversations under 'Leo'", () => {
    const groups = groupByRecency([at(today + 60_000)], now);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].label, "Leo");
  });

  it("puts yesterday's under 'Jana'", () => {
    const groups = groupByRecency([at(today - DAY)], now);
    assert.equal(groups[0].label, "Jana");
  });

  it("puts the rest of the week under 'Wiki hii'", () => {
    assert.equal(groupByRecency([at(today - 3 * DAY)], now)[0].label, "Wiki hii");
    assert.equal(groupByRecency([at(today - 6 * DAY)], now)[0].label, "Wiki hii");
  });

  it("puts anything older under 'Mapema'", () => {
    assert.equal(groupByRecency([at(today - 30 * DAY)], now)[0].label, "Mapema");
  });

  it("skips conversations that were never used", () => {
    const empty = conversation({ id: "empty", updatedAt: today, messages: [] });
    assert.deepEqual(groupByRecency([empty], now), []);
  });

  it("drops empty buckets instead of rendering a heading with nothing under it", () => {
    const groups = groupByRecency([at(today), at(today - 30 * DAY)], now);
    assert.deepEqual(
      groups.map((g) => g.label),
      ["Leo", "Mapema"],
    );
  });
});

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

describe("saved history", () => {
  it("starts empty when nothing is stored", () => {
    withWindow(fakeWindow(), () => {
      const store = loadStore();
      assert.deepEqual(store.conversations, []);
      assert.equal(store.activeId, null);
    });
  });

  it("survives rubbish in storage instead of throwing", () => {
    const win = fakeWindow();
    win.localStorage.setItem("khaki:conversations", "{not json");
    withWindow(win, () => {
      assert.deepEqual(loadStore().conversations, []);
    });
  });

  it("reopens the most recently used conversation that has messages", () => {
    const older = conversation({ id: "old", updatedAt: 1000 });
    const newerEmpty = conversation({ id: "new", updatedAt: 9000, messages: [] });

    const win = fakeWindow();
    win.localStorage.setItem(
      "khaki:conversations",
      JSON.stringify({ version: 1, activeId: "new", conversations: [older, newerEmpty] }),
    );

    withWindow(win, () => {
      // An untouched draft should not be what greets you on return.
      assert.equal(loadStore().activeId, "old");
    });
  });

  it("caps the number of conversations kept", () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      conversation({ id: `c${i}`, updatedAt: i * 1000 }),
    );
    const win = fakeWindow();
    withWindow(win, () => {
      saveStore({ version: 1, activeId: "c59", conversations: many });
      const saved = JSON.parse(win.localStorage.getItem("khaki:conversations") ?? "{}");
      assert.equal(saved.conversations.length, 40);
      // The newest survive.
      assert.equal(saved.conversations[0].id, "c59");
    });
  });

  it("caps the messages kept per conversation", () => {
    const long = conversation({
      id: "long",
      messages: Array.from({ length: 260 }, (_, i) => user(`ujumbe ${i}`)),
    });
    const win = fakeWindow();
    withWindow(win, () => {
      saveStore({ version: 1, activeId: "long", conversations: [long] });
      const saved = JSON.parse(win.localStorage.getItem("khaki:conversations") ?? "{}");
      assert.equal(saved.conversations[0].messages.length, 200);
      // The most recent messages are the ones kept.
      assert.equal(saved.conversations[0].messages.at(-1).parts[0].text, "ujumbe 259");
    });
  });

  it("halves the store when writing fails, rather than losing everything", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      conversation({ id: `c${i}`, updatedAt: i * 1000 }),
    );

    /*
     * A quota that refuses the full payload and accepts roughly half of it.
     *
     * The threshold is derived from the real payload rather than guessed, so
     * this measures the behaviour and not the size of the fixture.
     */
    const full = JSON.stringify({ version: 1, activeId: "c19", conversations: many });
    const limit = Math.floor(full.length * 0.6);

    const store = new Map<string, string>();
    const win = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          if (value.length > limit) {
            const error = new Error("QuotaExceededError");
            error.name = "QuotaExceededError";
            throw error;
          }
          store.set(key, value);
        },
        removeItem: (key: string) => store.delete(key),
      },
    };

    withWindow(win, () => {
      saveStore({ version: 1, activeId: "c19", conversations: many });

      const raw = store.get("khaki:conversations");
      assert.ok(raw, "the retry must write something; losing everything is the bug");

      const saved = JSON.parse(raw);
      assert.ok(
        saved.conversations.length < many.length,
        `the retry must actually shrink the payload (was ${saved.conversations.length} of ${many.length})`,
      );
      assert.ok(saved.conversations.length >= 1, "the conversation in use must survive");
      // The list is sorted newest first, so what remains is the recent half.
      assert.equal(saved.conversations[0].id, "c19");
    });
  });
});

describe("new conversations", () => {
  it("starts untitled and empty", () => {
    const fresh = createConversation(1234);
    assert.equal(fresh.title, UNTITLED);
    assert.deepEqual(fresh.messages, []);
    assert.equal(fresh.createdAt, 1234);
    assert.equal(fresh.updatedAt, 1234);
  });

  it("gives every conversation a distinct id", () => {
    const ids = new Set(Array.from({ length: 50 }, () => createConversation().id));
    assert.equal(ids.size, 50);
  });
});

/* ------------------------------------------------------------------ */
/* Names                                                              */
/* ------------------------------------------------------------------ */

describe("hand-written titles", () => {
  it("uses the name as typed", () => {
    assert.equal(cleanTitle("Harusi ya Neema", "Swali la kwanza"), "Harusi ya Neema");
  });

  it("collapses whitespace", () => {
    assert.equal(cleanTitle("  Harusi   ya\n\nNeema  ", "x"), "Harusi ya Neema");
  });

  it("falls back rather than showing an empty row", () => {
    // Blank means "go back to the derived title", not "call it nothing".
    assert.equal(cleanTitle("", "Swali la kwanza"), "Swali la kwanza");
    assert.equal(cleanTitle("   ", "Swali la kwanza"), "Swali la kwanza");
    assert.equal(cleanTitle("\n\t", "Swali la kwanza"), "Swali la kwanza");
  });

  it("clips a pasted paragraph without ending mid-word", () => {
    const long = "Nataka kuweka booking ya harusi tarehe kumi na mbili Desemba huko Kigamboni";
    const title = cleanTitle(long, "x");
    assert.ok(title.length <= 46, `too long: ${title.length}`);
    assert.ok(long.startsWith(title), "the clip is a prefix of what was typed");
    assert.equal(title, title.trimEnd());
  });
});

/* ------------------------------------------------------------------ */
/* Search                                                             */
/* ------------------------------------------------------------------ */

describe("searching history", () => {
  const withText = (id: string, title: string, ...texts: string[]) =>
    conversation({
      id,
      title,
      messages: texts.map((t) => user(t)),
    });

  it("returns nothing for a blank query", () => {
    assert.deepEqual(searchConversations([withText("a", "x", "y")], "  "), []);
  });

  it("matches the title", () => {
    const found = searchConversations([withText("a", "Harusi ya Neema", "Bei?")], "neema");
    assert.equal(found.length, 1);
    assert.equal(found[0].id, "a");
  });

  it("matches the body, not just the title", () => {
    // The customer remembers a word from the answer, not the clipped title.
    const found = searchConversations(
      [withText("a", "Mazungumzo mapya", "Nahitaji kujua kuhusu Diamond package")],
      "diamond",
    );
    assert.equal(found.length, 1);
  });

  it("is case-insensitive", () => {
    assert.equal(searchConversations([withText("a", "DIAMOND", "x")], "diamond").length, 1);
  });

  it("ranks a title match above a body match", () => {
    const found = searchConversations(
      [
        withText("body", "Mazungumzo mapya", "tunazungumzia diamond hapa"),
        withText("title", "Diamond package", "bei?"),
      ],
      "diamond",
    );
    assert.equal(found[0].id, "title");
    assert.equal(found[1].id, "body");
  });

  it("still finds a pinned or archived conversation", () => {
    // Filing something away hides it from the list, not from the person
    // looking for it.
    const pinned = conversation({ id: "p", title: "Diamond", pinned: true });
    const archived = conversation({ id: "a", title: "Diamond", archived: true });
    assert.equal(searchConversations([pinned, archived], "diamond").length, 2);
  });

  it("skips conversations that were never used", () => {
    assert.deepEqual(searchConversations([conversation({ messages: [] })], "x"), []);
  });
});

/* ------------------------------------------------------------------ */
/* Pinning and archiving                                              */
/* ------------------------------------------------------------------ */

describe("pinning", () => {
  const at = (id: string, updatedAt: number, extra: Partial<StoredConversation> = {}) =>
    conversation({ id, updatedAt, ...extra });

  it("lists pinned conversations newest first", () => {
    const list = [at("a", 100, { pinned: true }), at("b", 900, { pinned: true }), at("c", 500)];
    assert.deepEqual(
      pinnedConversations(list).map((c) => c.id),
      ["b", "a"],
    );
  });

  it("leaves pinned conversations out of the recency groups", () => {
    // Otherwise the same row appears twice, under two headings that disagree.
    const now = new Date(2026, 9, 5, 12, 0, 0).getTime();
    const pinnedToday = at("p", now, { pinned: true });
    assert.deepEqual(groupByRecency([pinnedToday], now), []);
  });

  it("leaves archived conversations out of the recency groups too", () => {
    const now = new Date(2026, 9, 5, 12, 0, 0).getTime();
    assert.deepEqual(groupByRecency([at("a", now, { archived: true })], now), []);
  });

  it("survives the storage cap", () => {
    /*
     * The whole point. The store keeps the newest 40, so without this a
     * conversation pinned in January is evicted in March by the one it was
     * pinned to outrank — and the pin silently meant nothing.
     */
    const pinnedOld = conversation({ id: "pinned", updatedAt: 1, pinned: true });
    const newer = Array.from({ length: 60 }, (_, i) => conversation({ id: `n${i}`, updatedAt: 1000 + i }));

    const win = fakeWindow();
    withWindow(win, () => {
      saveStore({ version: 1, activeId: "n59", conversations: [...newer, pinnedOld] });
      const saved = JSON.parse(win.localStorage.getItem("khaki:conversations") ?? "{}");
      const ids = saved.conversations.map((c: StoredConversation) => c.id);
      assert.ok(ids.includes("pinned"), "a pinned conversation must not be evicted");
      assert.equal(ids[0], "pinned", "and it stays at the front");
      assert.equal(saved.conversations.length, 40);
    });
  });

  it("keeps more than the cap when that many are pinned", () => {
    // The cap is a storage guard; pinning is a request by name. The request wins.
    const pinned = Array.from({ length: 45 }, (_, i) =>
      conversation({ id: `p${i}`, updatedAt: i, pinned: true }),
    );
    const win = fakeWindow();
    withWindow(win, () => {
      saveStore({ version: 1, activeId: "p0", conversations: pinned });
      const saved = JSON.parse(win.localStorage.getItem("khaki:conversations") ?? "{}");
      assert.equal(saved.conversations.length, 45);
    });
  });

  it("does not promote a re-pin to the top of the recency groups", () => {
    // Pinning is filing, not activity. `updatedAt` is untouched, so a thread
    // from January stays in "Mapema" when it is unpinned again.
    const now = new Date(2026, 9, 5, 12, 0, 0).getTime();
    const old = at("old", now - 30 * DAY, { pinned: true });
    const unpinned = { ...old, pinned: false };
    assert.equal(groupByRecency([unpinned], now)[0].label, "Mapema");
  });
});

/* ------------------------------------------------------------------ */
/* Drafts                                                             */
/* ------------------------------------------------------------------ */

describe("half-written messages", () => {
  it("reads back empty when nothing was typed", () => {
    withWindow(fakeWindow(), () => {
      assert.equal(readDraft("c1"), "");
    });
  });

  it("keeps a draft per conversation", () => {
    withWindow(fakeWindow(), () => {
      writeDraft("c1", "Nataka kuhusu");
      writeDraft("c2", "Bei ya Diamond");

      // The whole point: switching threads must not merge or lose them.
      assert.equal(readDraft("c1"), "Nataka kuhusu");
      assert.equal(readDraft("c2"), "Bei ya Diamond");
      assert.equal(readDraft("c3"), "");
    });
  });

  it("drops the key rather than storing an empty string", () => {
    const win = fakeWindow();
    withWindow(win, () => {
      writeDraft("c1", "Nataka kuhusu");
      assert.ok(win.localStorage._raw.has("khaki:draft:c1"));

      writeDraft("c1", "");
      // An empty draft is absence, not content. Storing "" would leave a key
      // for every conversation ever opened.
      assert.ok(!win.localStorage._raw.has("khaki:draft:c1"));
    });
  });

  it("clears the draft when its conversation is deleted", () => {
    const win = fakeWindow();
    withWindow(win, () => {
      writeDraft("c1", "Nataka kuhusu");
      clearDraft("c1");
      assert.equal(readDraft("c1"), "");
    });
  });

  it("keeps other drafts when one is cleared", () => {
    withWindow(fakeWindow(), () => {
      writeDraft("c1", "moja");
      writeDraft("c2", "mbili");
      clearDraft("c1");
      assert.equal(readDraft("c2"), "mbili");
    });
  });

  it("survives storage being blocked", () => {
    // Private browsing, or a full quota. A missing draft is a small loss; a
    // throw here would take the composer down with it.
    withWindow({ localStorage: { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } } }, () => {
      assert.equal(readDraft("c1"), "");
      writeDraft("c1", "x");
      clearDraft("c1");
    });
  });
});
