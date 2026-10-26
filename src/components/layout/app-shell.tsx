"use client";

import {
  Archive,
  ChevronDown,
  Download,
  MessageCircle,
  MessageSquarePlus,
  MoreVertical,
  PanelLeft,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { KhakiMark } from "@/components/brand/khaki-mark";
import { useConversations } from "@/components/chat/conversations-provider";
import { ContactActions } from "@/components/chat/contact-actions";
import { IconButton } from "@/components/ui/icon-button";
import { KHAKI_CONFIG } from "@/config/khaki";
import {
  archivedConversations,
  exportFilename,
  formatRelative,
  groupByRecency,
  pinnedConversations,
  searchConversations,
  toMarkdown,
  type StoredConversation,
} from "@/lib/conversations";
import { cn } from "@/lib/utils";

/**
 * AppShell — persistent chrome around the conversation.
 *
 * Desktop keeps a fixed sidebar; phones get the same content in a slide-over
 * drawer with a real dialog contract: Escape closes, focus moves in and returns
 * to the trigger, and the backdrop is a labelled button rather than a
 * decorative div.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  /**
   * The desktop rail can be put away.
   *
   * Read from storage after mount rather than during render: the server has no
   * localStorage, and reading it in the initial state would either crash the
   * render or produce markup that differs from the client's. One frame of the
   * rail showing is cheaper than a hydration mismatch.
   */
  const [railHidden, setRailHidden] = useState(false);

  useEffect(() => {
    try {
      setRailHidden(window.localStorage.getItem("khaki:rail") === "hidden");
    } catch {
      // Storage can be blocked entirely, in which case the rail simply stays.
    }
  }, []);

  const toggleRail = useCallback(() => {
    setRailHidden((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("khaki:rail", next ? "hidden" : "shown");
      } catch {
        // Same: the preference is a convenience, not a requirement.
      }
      return next;
    });
  }, []);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerShellRef = useRef<HTMLDivElement>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    triggerRef.current?.focus();
  }, []);

  const navigateDrawer = useCallback(() => {
    setDrawerOpen(false);
    // After the selected thread (and its per-thread composer) mounts, move the
    // keyboard user to the conversation rather than back to the menu trigger.
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>("#khaki-message")?.focus({ preventScroll: true });
    });
  }, []);

  /**
   * `aria-hidden` does not remove anything from the tab order, so on a phone the
   * first dozen tab stops used to be controls inside this off-screen drawer.
   * `inert` takes the whole subtree out of focus, pointer and screen-reader
   * reach until the drawer is opened.
   *
   * Declared before the effect that moves focus, and that order is load-bearing.
   * Effects run in the order they are written, and focusing an element inside an
   * inert subtree does nothing at all. With the focus call first, it ran while
   * the shell was still inert and failed silently: the drawer opened with focus
   * left on the button behind it, so a keyboard user was looking at a panel
   * their next Tab could not reach.
   */
  useEffect(() => {
    const shell = drawerShellRef.current;
    if (!shell) return;
    if (drawerOpen) shell.removeAttribute("inert");
    else shell.setAttribute("inert", "");
  }, [drawerOpen]);

  /**
   * Move focus in, keep it in, and let Escape out.
   *
   * The trap is what stops Tab from walking out of the dialog and into the page
   * behind it -- the first Tab used to land on the header's brand link, so the
   * drawer's own controls were unreachable from the moment it opened.
   */
  useEffect(() => {
    if (!drawerOpen) return;

    const root = drawerRef.current;
    root?.focus();

    const focusable = () =>
      root
        ? Array.from(
            root.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null || el === document.activeElement)
        : [];

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !root) return;

      const items = focusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = root.contains(active);

      if (event.shiftKey && (!inside || active === root || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, closeDrawer]);

  return (
    <div className="relative flex w-full overflow-hidden" style={{ height: "var(--khaki-shell-height)" }}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 overflow-hidden transition-[width] duration-1 ease-fluid lg:block",
          railHidden ? "w-0" : "w-[17.5rem]",
        )}
        aria-hidden={railHidden}
        inert={railHidden}
      >
        <SidebarContent id="khaki-sidebar" />
      </aside>

      {/* Mobile drawer */}
      <div
        ref={drawerShellRef}
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label="Funga menyu"
          onClick={closeDrawer}
          className={cn(
            "absolute inset-0 h-full w-full cursor-default bg-black/65 backdrop-blur-[2px]",
            "transition-opacity duration-1 ease-fluid",
            drawerOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menyu ya Khaki AI"
          tabIndex={-1}
          className={cn(
            "absolute inset-y-0 left-0 w-[86vw] max-w-[20rem] outline-none",
            "transition-transform duration-1 ease-fluid",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarContent id="khaki-drawer" onNavigate={navigateDrawer} onClose={closeDrawer} />
        </div>
      </div>

      {/* Main column */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="safe-top relative z-30 flex items-center gap-2 border-b border-white/[0.08] bg-black px-3 py-2 sm:px-4">
          <IconButton
            ref={triggerRef}
            label="Fungua menyu"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-controls="khaki-drawer"
            className="lg:hidden"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </IconButton>

          {/*
            The same gesture on a desk, where the rail costs 280px of a laptop
            screen whether or not you are using it. The preference is remembered,
            because someone who puts the rail away wants it away tomorrow too.
          */}
          <IconButton
            label={railHidden ? "Onyesha menyu ya kando" : "Ficha menyu ya kando"}
            onClick={toggleRail}
            aria-pressed={railHidden}
            className="hidden lg:inline-flex"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </IconButton>

          {/* Mobile brand anchor; active conversation titles stay in history. */}
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 rounded-lg px-1 py-1 transition-opacity hover:opacity-80 lg:hidden"
          >
            <KhakiMark size={26} />
            <span className="min-w-0">
              <span className="block truncate text-[14.5px] font-semibold leading-none tracking-[-0.02em] text-white">
                Khaki AI
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <NewChatButton />
          </div>
        </header>

        {/*
          A real <main>, not another <div>.
          
          Axe reported `landmark-one-main` and seven `region` violations: the
          page had a <header>, an <aside> and a <nav>, but the conversation
          itself sat in a plain container. A screen reader can jump between
          landmarks; without one here, "skip to the content" had nowhere to go.
        */}
        <main id="main-content" tabIndex={-1} className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

/** Header shortcut; the drawer and sidebar carry the labelled one. */
function NewChatButton() {
  const { startNew } = useConversations();

  return (
    <IconButton label="Mazungumzo mapya" onClick={startNew}>
      <MessageSquarePlus className="h-[18px] w-[18px]" />
    </IconButton>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

function SidebarContent({
  id,
  onNavigate,
  onClose,
}: {
  /** Distinct per placement — the desktop rail and the drawer never share one. */
  id: string;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const { startNew, visible, ready } = useConversations();

  /**
   * Search state.
   *
   * `visible` already filters out empty drafts; the three lists below are
   * derived from it so a search can never surface a thread that the plain list
   * would hide. The pinned and archived lists are separate because
   * `groupByRecency` deliberately excludes both.
   */
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchConversations(visible, query), [visible, query]);
  const pinned = useMemo(() => pinnedConversations(visible), [visible]);
  const archived = useMemo(() => archivedConversations(visible), [visible]);

  const handleNew = useCallback(() => {
    startNew();
    onNavigate?.();
  }, [startNew, onNavigate]);

  /*
   * The sidebar is deliberately the *dimmest* surface on the page.
   *
   * Measured against the content backdrop it sits at ~1.17:1, with its right
   * hairline at ~1.21:1 — below the ~1.2:1 a content surface needs, and that is
   * the intent. Navigation is chrome: it should recede so the eye goes to the
   * conversation and the gold controls, and a sidebar pushed up to match the
   * cards would compete with them.
   *
   * What the earlier value got wrong was not "too dim" but "invisible": elev-1
   * at 95% flattened to rgb(8,8,10), 1.05:1, with a 1.06:1 border — the panel
   * had no edge at all, and the layout read as though the sidebar were not
   * there. It previously relied on `backdrop-blur-2xl` to separate itself,
   * which does nothing over a flat black backdrop.
   *
   * The hierarchy this leaves, every value measured against the same backdrop:
   *   sidebar 1.17  ·  icon buttons 1.22  ·  composer 1.31  ·  cards 1.42+
   */
  return (
    <div
      id={id}
      className="flex h-full flex-col border-r border-white/[0.08] bg-[#171717]"
    >
      {/* Brand — compact, and it says what the business does in one line. */}
      <div className="safe-top flex items-center gap-3 px-4 pb-2.5 pt-3">
        <KhakiMark size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight tracking-[-0.02em] text-white">
            {KHAKI_CONFIG.brandName}
          </p>
          <p className="mt-0.5 truncate text-[11.5px] leading-tight text-ink-3">
            {KHAKI_CONFIG.tagline}
          </p>
        </div>
        {onClose && (
          <IconButton label="Funga menyu" onClick={onClose} className="lg:hidden">
            <X className="h-[18px] w-[18px]" />
          </IconButton>
        )}
      </div>

      <div className="mx-4 h-px bg-white/[0.08]" />

      {/* Primary action */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={handleNew}
          className={cn(
            "group/new flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left",
            "border border-white/[0.12] bg-transparent",
            "text-[14px] font-medium text-ink",
            "transition-colors duration-1 hover:bg-white/[0.08]",
          )}
        >
          <Plus className="h-4 w-4" />
          Mazungumzo mapya
        </button>
      </div>

      {/* Search — available once there is any visible conversation */}
      {ready && visible.length > 0 && <HistorySearch id={`${id}-search`} value={query} onChange={setQuery} />}

      {/* History — given the most room, because it is what people come back for */}
      <nav aria-label="Mazungumzo" className="mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {query.trim() ? (
          /* A flat ranked list while searching. Group headings are about *when*
             something happened, which is not the question being asked. */
          results.length === 0 ? (
            <p className="px-2 pt-1 text-[12.5px] leading-snug text-ink-3">
              Hakuna mazungumzo yenye <span className="text-ink-2">“{query.trim()}”</span>.
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {results.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  query={query}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )
        ) : ready && visible.length === 0 ? (
          <div className="px-2 pt-1">
            <p className="text-[12.5px] font-medium text-ink-3">Hakuna mazungumzo bado</p>
            <p className="mt-1 text-[12px] leading-snug text-ink-4">
              Uliza kitu kwenye chat — mazungumzo yako yatabaki hapa hata ukifunga ukurasa.
            </p>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="mb-1">
                <p className="plate-type flex items-center gap-1.5 px-2 pb-1.5 pt-2 text-gold-400/80">
                  <Pin className="h-2.5 w-2.5" strokeWidth={2.4} aria-hidden />
                  Zilizopin
                </p>
                <div className="flex flex-col gap-0.5">
                  {pinned.map((conversation) => (
                    <ConversationRow
                      key={conversation.id}
                      conversation={conversation}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            )}

            {groupByRecency(visible).map((group) => (
              <div key={group.label} className="mb-1">
                <p className="plate-type px-2 pb-1.5 pt-2 text-ink-4">{group.label}</p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((conversation) => (
                    <ConversationRow
                      key={conversation.id}
                      conversation={conversation}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            ))}

            {archived.length > 0 && <ArchiveGroup items={archived} onNavigate={onNavigate} />}
          </>
        )}
      </nav>

      {/* Footer offers a contact path; desktop keeps the three existing options. */}
      <div className="border-t border-white/[0.055] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <ContactActions primaryOnly={Boolean(onClose)} />
      </div>
    </div>
  );
}


/**
 * One saved conversation.
 *
 * ---------------------------------------------------------------------------
 * Why the actions live behind a menu
 * ---------------------------------------------------------------------------
 * Rename, pin, archive and delete is four controls per row. There are two
 * hazards and they pull in opposite directions:
 *
 *  · The rail is 280px wide and shows about nine conversations. Four icons on
 *    every row is 36 controls competing with nine titles — which is what the
 *    owner already called "a mess" when the bin appeared on every row on every
 *    phone.
 *  · Hiding everything behind hover alone fails on touch, where there is no
 *    hover to reveal it with.
 *
 * So: **one** button per row, revealed on hover where hover exists and on the
 * active row always. The menu it opens carries the four actions, spaced and
 * labelled, which is also what makes room for the fifth one somebody will want
 * next. That is ChatGPT's shape and it solves both problems at once.
 *
 * A pinned conversation is the exception: it keeps a small pin glyph visible at
 * all times, because the point of pinning is to see at a glance what is pinned,
 * and a state you can only read by hovering is not visible.
 *
 * ---------------------------------------------------------------------------
 * Rename
 * ---------------------------------------------------------------------------
 * The pencil in the menu, and double-click on the title. The second is the
 * gesture people already have in their hands from every file manager, and it
 * costs nothing to support.
 *
 * The field commits on Enter or blur and cancels on Escape, and a blank name
 * reverts to the derived one rather than leaving an empty row.
 */
function ConversationRow({
  conversation,
  query = "",
  onNavigate,
}: {
  conversation: StoredConversation;
  /** The active search, so the matched run can be marked. Empty in normal use. */
  query?: string;
  onNavigate?: () => void;
}) {
  const { active, select, remove, rename, togglePin, toggleArchive } = useConversations();
  const isActive = active?.id === conversation.id;

  const [armed, setArmed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);

  const rowRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // A 36px trash button at the edge of a row's tap area is easy to hit by
  // accident, and deleting a conversation cannot be undone. First tap arms it,
  // second tap deletes, and it disarms itself after a few seconds.
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 3500);
    return () => window.clearTimeout(id);
  }, [armed]);

  /* Close the menu on an outside press or Escape, and give focus back. */
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rowRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  /* Focus and select when the field appears, so a rename is one gesture. */
  useEffect(() => {
    if (!editing) return;
    const field = inputRef.current;
    field?.focus();
    field?.select();
  }, [editing]);

  const beginRename = useCallback(() => {
    setDraft(conversation.title);
    setEditing(true);
    setMenuOpen(false);
  }, [conversation.title]);

  const commitRename = useCallback(() => {
    setEditing(false);
    rename(conversation.id, draft);
  }, [conversation.id, draft, rename]);

  /**
   * Download the thread as Markdown.
   *
   * Built in the browser from the stored document — there is no server round
   * trip and nothing leaves the machine. The object URL is revoked on the next
   * frame rather than immediately: revoking before the browser has begun the
   * download cancels it in Safari, and the failure looks like the button doing
   * nothing at all.
   */
  const handleExport = useCallback(() => {
    setMenuOpen(false);
    const markdown = toMarkdown(conversation);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exportFilename(conversation);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [conversation]);

  if (editing) {
    return (
      <div
        ref={rowRef}
        className={cn(
          "relative flex items-center rounded-xl bg-white/[0.07] ring-1 ring-gold-500/45",
        )}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitRename();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              // Escape restores; it does not save what was typed.
              setEditing(false);
            }
          }}
          onBlur={commitRename}
          aria-label={`Badilisha jina la "${conversation.title}"`}
          /* 16px so iOS does not zoom the page when the field takes focus. */
          className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2.5 text-[16px] text-ink outline-none placeholder:text-ink-4"
          placeholder="Jina la mazungumzo"
        />
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      onKeyDownCapture={(event) => {
        if (menuOpen && event.key === "Escape") {
          event.stopPropagation();
          setMenuOpen(false);
          triggerRef.current?.focus();
        }
      }}
      className={cn(
        "group/thread relative flex items-center rounded-xl transition-colors duration-1",
        isActive ? "bg-white/[0.07]" : "hover:bg-white/[0.035]",
      )}
    >
      <button
        type="button"
        onClick={() => {
          select(conversation.id);
          onNavigate?.();
        }}
        onDoubleClick={beginRename}
        aria-current={isActive ? "true" : undefined}
        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-left"
      >
        {/*
          The pin, always visible when set.
          A state you can only read by hovering is not visible; this is the one
          signal in the row that has to survive a still frame.
        */}
        {conversation.pinned && (
          <Pin className="h-3 w-3 shrink-0 text-gold-400" strokeWidth={2.2} aria-hidden />
        )}

        {/* One line, not two. Two-line rows plus a delete button showed about
            five conversations on a phone; this shows roughly nine, and the
            relative time reads fine right-aligned. */}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[13.5px] leading-tight",
            isActive ? "text-ink" : "text-ink-2",
            conversation.archived && "text-ink-3 italic",
          )}
        >
          <HighlightedText text={conversation.title} query={query} />
        </span>

        {/* Archive state is readable without the menu too — otherwise the only
            clue that a thread is filed away is which heading it is missing from. */}
        {conversation.archived && (
          <span className="plate-type shrink-0 text-ink-4" aria-hidden>
            archive
          </span>
        )}

        <span
          className={cn(
            /*
             * Fixed-width, right-aligned time slot.
             *
             * Left to size itself, "sasa hivi" pushed the title's truncation
             * point further left than "Jana" did, so no two rows ended in the
             * same place and the column read as ragged. A fixed lane means
             * every title truncates at the same x.
             *
             * `text-ink-3`, not `text-ink-4`. The fourth ink step is 48% white,
             * which on the *selected* row's `bg-white/[0.07]` overlay resolves
             * to about **4.20:1** — under the 4.5:1 that 11px text needs, and
             * axe-core flagged it as a serious `color-contrast` violation. The
             * third step lands at roughly **5.98:1** on the same surface while
             * staying visibly quieter than the title beside it.
             */
            "w-[54px] shrink-0 text-right text-[11px] tabular-nums text-ink-3 transition-opacity duration-1",
            "group-hover/thread:opacity-0 group-focus-within/thread:opacity-0",
          )}
        >
          {formatRelative(conversation.updatedAt)}
        </span>
      </button>

      {/* One control. Everything else lives inside it. */}
      <RowMenu
        ref={triggerRef}
        open={menuOpen}
        onToggle={() => setMenuOpen((value) => !value)}
        conversation={conversation}
        armed={armed}
        isActive={isActive}
        onRename={beginRename}
        onTogglePin={() => {
          togglePin(conversation.id);
          setMenuOpen(false);
        }}
        onToggleArchive={() => {
          toggleArchive(conversation.id);
          setMenuOpen(false);
        }}
        onExport={handleExport}
        onDelete={() => {
          if (armed) {
            remove(conversation.id);
            setMenuOpen(false);
          } else {
            setArmed(true);
          }
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row menu                                                            */
/* ------------------------------------------------------------------ */

function RowMenu({
  ref,
  open,
  onToggle,
  conversation,
  armed,
  isActive,
  onRename,
  onTogglePin,
  onToggleArchive,
  onExport,
  onDelete,
}: {
  ref: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onToggle: () => void;
  conversation: StoredConversation;
  armed: boolean;
  isActive: boolean;
  onRename: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <IconButton
        ref={ref}
        label={`Vitendo vya "${conversation.title}"`}
        size="sm"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          "mr-1.5 transition-opacity duration-1",
          // Visible while its own menu is open, on the row you are in, and on
          // hover. Never on all rows at once — that was the mess.
          open ? "opacity-100 bg-white/[0.09]" : "opacity-0 group-hover/thread:opacity-100",
          "focus-visible:opacity-100",
          !open && isActive && "opacity-100",
        )}
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </IconButton>

      {open && (
        <div
          role="group"
          aria-label={`Vitendo vya "${conversation.title}"`}
          /*
           * Right-aligned and below the trigger. The rail is narrow, so a
           * left-aligned menu would open off the edge; and it is inside the
           * scroll container, so it opens downward and the list scrolls to it
           * rather than the menu escaping the panel.
           */
          className="absolute right-1.5 top-[calc(100%-0.2rem)] z-50 w-[11.5rem] overflow-hidden rounded-xl border border-white/[0.1] bg-[#202020] p-1"
        >
          <MenuItem icon={Pencil} label="Badilisha jina" onClick={onRename} />
          <MenuItem
            icon={Pin}
            label={conversation.pinned ? "Ondoa pin" : "Pin juu"}
            onClick={onTogglePin}
          />
          <MenuItem
            icon={Archive}
            label={conversation.archived ? "Rudisha" : "Weka kwenye archive"}
            onClick={onToggleArchive}
          />
          <MenuItem icon={Download} label="Hamisha (Markdown)" onClick={onExport} />

          <div className="my-1 h-px bg-white/[0.07]" />

          {/*
            Delete keeps its two-step arming, but inside the menu the label
            changes rather than the row growing a red ring. A menu that closes
            on the first press and reopens to ask "are you sure" is a worse
            question than one that asks it in place.
          */}
          <MenuItem
            icon={Trash2}
            label={armed ? "Bonyeza tena kufuta" : "Futa"}
            onClick={onDelete}
            tone="danger"
            armed={armed}
          />
        </div>
      )}
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  tone = "normal",
  armed = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: "normal" | "danger";
  armed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] lg:min-h-0",
        "transition-colors duration-1",
        tone === "danger"
          ? armed
            ? "bg-red-500/15 text-red-200"
            : "text-red-300/90 hover:bg-red-500/10 hover:text-red-200"
          : "text-ink-2 hover:bg-white/[0.06] hover:text-ink",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

/**
 * The history filter.
 *
 * A real `<search>` landmark with a labelled input, so it is reachable by
 * screen-reader landmark navigation and not just by tabbing past the new-chat
 * button. Clearing is a control rather than a hidden gesture — `type="search"`
 * gives a native clear button on some platforms and nothing on others, and
 * "nothing" is the one that ships to a phone.
 */
function HistorySearch({ id, value, onChange }: { id: string; value: string; onChange: (next: string) => void }) {
  return (
    <search className="px-3 pt-3">
      <div className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-ink-4"
          aria-hidden
        />
        <input
          id={id}
          name="conversation-search"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onChange("");
            }
          }}
          aria-label="Tafuta mazungumzo"
          placeholder="Tafuta mazungumzo…"
          /* 16px, or iOS zooms the whole page the moment it takes focus. */
          className={cn(
            "min-h-[44px] w-full rounded-xl border border-white/[0.07] bg-white/[0.03] pl-8 pr-8",
            "text-[16px] text-ink placeholder:text-ink-4",
            "transition-colors duration-2",
            "focus:border-gold-500/40 focus:bg-white/[0.05] focus:outline-none",
          )}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Ondoa utafutaji"
            className="absolute right-2 grid min-h-[44px] min-w-[44px] place-items-center rounded-md text-ink-3 transition-colors hover:bg-white/[0.07] hover:text-ink"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </search>
  );
}

/**
 * Marks the matched run inside a title.
 *
 * Only the first match is marked: the row truncates to one line, so a second
 * highlight is almost always past the ellipsis and never seen.
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;

  const at = text.toLowerCase().indexOf(needle.toLowerCase());
  if (at < 0) return <>{text}</>;

  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-[3px] bg-gold-500/25 px-0.5 text-gold-100">
        {text.slice(at, at + needle.length)}
      </mark>
      {text.slice(at + needle.length)}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Archived                                                            */
/* ------------------------------------------------------------------ */

/**
 * Filed conversations, folded away.
 *
 * Collapsed by default and labelled with a count, because the point of
 * archiving is to get something out of the way — a heading that immediately
 * re-lists everything has not hidden anything. The count is what tells you the
 * fold is not empty.
 */
function ArchiveGroup({
  items,
  onNavigate,
}: {
  items: StoredConversation[];
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 pb-1.5 pt-2 text-left transition-colors duration-1 hover:text-ink-3"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 text-ink-4 transition-transform duration-2",
            open ? "rotate-0" : "-rotate-90",
          )}
          aria-hidden
        />
        <span className="plate-type flex-1 text-ink-4">Archive</span>
        <span className="tnum text-[11px] text-ink-4">{items.length}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-0.5 pt-0.5">
          {items.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
