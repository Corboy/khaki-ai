"use client";

import {
  ChevronDown,
  Instagram,
  MapPin,
  MessageCircle,
  MessageSquarePlus,
  Music2,
  PanelLeft,
  Plus,
  Settings2,
  SlidersHorizontal,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { KhakiMark } from "@/components/brand/khaki-mark";
import { useConversations } from "@/components/chat/conversations-provider";
import { AppearancePanel, StudioControls } from "@/components/layout/studio-controls";
import { useStudioInfo } from "@/components/studio-info";
import { IconButton } from "@/components/ui/icon-button";
import { KHAKI_CONFIG } from "@/config/khaki";
import { formatRelative, groupByRecency, type StoredConversation } from "@/lib/conversations";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerShellRef = useRef<HTMLDivElement>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKeyDown);
    drawerRef.current?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, closeDrawer]);

  /**
   * `aria-hidden` does not remove anything from the tab order, so on a phone the
   * first dozen tab stops used to be controls inside this off-screen drawer.
   * `inert` takes the whole subtree out of focus, pointer and screen-reader
   * reach until the drawer is opened.
   */
  useEffect(() => {
    const shell = drawerShellRef.current;
    if (!shell) return;
    if (drawerOpen) shell.removeAttribute("inert");
    else shell.setAttribute("inert", "");
  }, [drawerOpen]);

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-[17.5rem] shrink-0 lg:block">
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
          tabIndex={drawerOpen ? 0 : -1}
          aria-label="Funga menyu"
          onClick={closeDrawer}
          className={cn(
            "absolute inset-0 h-full w-full cursor-default bg-black/65 backdrop-blur-[2px]",
            "transition-opacity duration-3 ease-fluid",
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
            "transition-transform duration-3 ease-fluid",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarContent id="khaki-drawer" onNavigate={closeDrawer} onClose={closeDrawer} />
        </div>
      </div>

      {/* Main column */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="safe-top relative z-30 flex items-center gap-2 border-b border-white/[0.055] bg-black/55 px-3 py-2 backdrop-blur-xl sm:px-4">
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
            One identity, once. On desktop the sidebar already carries the brand
            a few centimetres to the left, so the header shows the thing that is
            actually unknown at that moment — which conversation you are in.
          */}
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 rounded-lg px-1 py-1 transition-opacity hover:opacity-80 lg:hidden"
          >
            <KhakiMark size={26} />
            <span className="min-w-0">
              <span className="block truncate text-[14.5px] font-semibold leading-none tracking-[-0.02em] text-white">
                Khaki AI
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] leading-none text-ink-3">
                {KHAKI_CONFIG.brandName}
              </span>
            </span>
          </Link>

          <ActiveConversationTitle />

          <div className="ml-auto flex items-center gap-1">
            <NewChatButton />
            <Link
              href="/admin"
              /*
               * No prefetch.
               *
               * Next prefetches every <Link> it can see, and /admin is a page
               * only the owner opens — a customer never will. Measured on a
               * cold load, the browser was pulling the admin route's JavaScript
               * in the background, competing for a 400 kbps connection with the
               * bundle the customer is actually waiting on.
               */
              prefetch={false}
              aria-label="Mipangilio"
              title="Mipangilio"
              className="grid h-9 w-9 place-items-center rounded-[10px] text-ink-3 transition duration-1 ease-fluid hover:bg-white/[0.07] hover:text-ink active:scale-90"
            >
              <Settings2 className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </header>

        {/*
          A real <main>, not another <div>.
          
          Axe reported `landmark-one-main` and seven `region` violations: the
          page had a <header>, an <aside> and a <nav>, but the conversation
          itself sat in a plain container. A screen reader can jump between
          landmarks; without one here, "skip to the content" had nowhere to go.
        */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
      </div>

      <StudioControls />
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
  const { whatsappNumber, studioName } = useStudioInfo();
  const { startNew, visible, ready } = useConversations();

  const handleNew = useCallback(() => {
    startNew();
    onNavigate?.();
  }, [startNew, onNavigate]);

  return (
    <div
      id={id}
      className="flex h-full flex-col border-r border-white/[0.055] bg-[rgb(var(--k-elev-1))]/95 backdrop-blur-2xl"
    >
      {/* Brand — compact, and it says what the business does in one line. */}
      <div className="safe-top flex items-center gap-3 px-4 pb-2.5 pt-3">
        <KhakiMark size={34} halo />
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

      <div className="gold-rule mx-4" />

      {/* Primary action */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={handleNew}
          className={cn(
            "group/new flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left",
            "border border-gold-500/22 bg-gold-500/[0.07]",
            "text-[14px] font-medium text-gold-200",
            "transition duration-2 ease-fluid hover:border-gold-500/40 hover:bg-gold-500/[0.11] active:scale-[0.985]",
          )}
        >
          <Plus className="h-4 w-4" />
          Mazungumzo mapya
        </button>
      </div>

      {/* History — given the most room, because it is what people come back for */}
      <nav aria-label="Mazungumzo" className="mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {ready && visible.length === 0 ? (
          <div className="px-2 pt-1">
            <p className="text-[12.5px] font-medium text-ink-3">Hakuna mazungumzo bado</p>
            <p className="mt-1 text-[12px] leading-snug text-ink-4">
              Uliza kitu kwenye chat — mazungumzo yako yatabaki hapa hata ukifunga ukurasa.
            </p>
          </div>
        ) : (
          groupByRecency(visible).map((group) => (
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
          ))
        )}
      </nav>

      {/*
        Footer holds only what a visitor might need *instead of* the assistant:
        a human, the appearance controls, and the settings. The address and
        opening hours used to live here in a tall card — they are already in the
        welcome screen and the assistant knows them, so the card was competing
        with navigation for the same vertical space.
      */}
      <div className="border-t border-white/[0.055] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            "flex h-10 items-center justify-center gap-2 rounded-xl",
            "border border-white/[0.09] bg-white/[0.04] text-[13px] font-medium text-ink",
            "transition duration-2 ease-fluid",
            "hover:border-emerald-400/35 hover:bg-emerald-400/[0.09] hover:text-emerald-200",
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Ongea nasi WhatsApp
        </a>

        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-ink-4">
          <MapPin className="h-3 w-3 shrink-0" />
          {/* Just the address: the brand is already the first thing in this
              column, and prefixing it here pushed the street name off the end. */}
          <span className="truncate">{KHAKI_CONFIG.location.address}</span>
        </p>

        {/* Real profiles, checked against the live pages. Instagram and TikTok
            share the handle; YouTube does not use the underscore. */}
        <div className="mt-2.5 flex items-center justify-center gap-1">
          {[
            { href: KHAKI_CONFIG.social.instagram, label: "Instagram", Icon: Instagram },
            { href: KHAKI_CONFIG.social.tiktok, label: "TikTok", Icon: Music2 },
            { href: KHAKI_CONFIG.social.youtube, label: "YouTube", Icon: Youtube },
          ]
            .filter((entry) => entry.href)
            .map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${studioName} kwenye ${label}`}
                title={`${studioName} kwenye ${label}`}
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-4 transition-colors duration-2 hover:bg-white/[0.055] hover:text-gold-300"
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </a>
            ))}
        </div>

        <AppearanceDisclosure />
        <Link
          href="/admin"
          /* See the header link: the settings route is never worth prefetching. */
          prefetch={false}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] text-ink-2 transition duration-2 ease-fluid hover:bg-white/[0.055] hover:text-ink"
        >
          <Settings2 className="h-4 w-4" />
          Mipangilio ya Studio
        </Link>
      </div>
    </div>
  );
}

/** Desktop header title — which conversation you are currently in. */
function ActiveConversationTitle() {
  const { active } = useConversations();

  if (!active?.title) {
    return <span aria-hidden className="hidden flex-1 lg:block" />;
  }

  return (
    <span className="hidden min-w-0 flex-1 truncate px-1 text-[13.5px] font-medium text-ink-2 lg:block">
      {active.title}
    </span>
  );
}

/** One saved conversation. Focus works alongside hover for the delete action. */
function ConversationRow({
  conversation,
  onNavigate,
}: {
  conversation: StoredConversation;
  onNavigate?: () => void;
}) {
  const { active, select, remove } = useConversations();
  const isActive = active?.id === conversation.id;
  const [armed, setArmed] = useState(false);

  // A 36px trash button at the edge of a row's tap area is easy to hit by
  // accident, and deleting a conversation cannot be undone. First tap arms it,
  // second tap deletes, and it disarms itself after a few seconds.
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 3500);
    return () => window.clearTimeout(id);
  }, [armed]);

  return (
    <div
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
        aria-current={isActive ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-left"
      >
        {/* One line, not two. Two-line rows plus a delete button showed about
            five conversations on a phone; this shows roughly nine, and the
            relative time reads fine right-aligned. */}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[13.5px] leading-tight",
            isActive ? "text-ink" : "text-ink-2",
          )}
        >
          {conversation.title}
        </span>
        <span
          className={cn(
            /*
             * Fixed-width, right-aligned time slot.
             *
             * Left to size itself, "sasa hivi" pushed the title's truncation
             * point further left than "Jana" did, so no two rows ended in the
             * same place and the column read as ragged. A fixed lane means
             * every title truncates at the same x.
             */
            "w-[54px] shrink-0 text-right text-[11px] tabular-nums text-ink-4 transition-opacity duration-1",
            "group-hover/thread:opacity-0 group-focus-within/thread:opacity-0",
          )}
        >
          {formatRelative(conversation.updatedAt)}
        </span>
      </button>

      <IconButton
        label={armed ? `Thibitisha kufuta "${conversation.title}"` : `Futa "${conversation.title}"`}
        size="sm"
        onClick={() => (armed ? remove(conversation.id) : setArmed(true))}
        className={cn(
          "mr-1.5 transition-opacity duration-1 hover:text-red-300",
          armed
            ? "bg-red-500/15 text-red-300 opacity-100 ring-1 ring-red-400/40"
            : "opacity-0 group-hover/thread:opacity-100 focus-visible:opacity-100 max-sm:opacity-100",
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
}

/** Appearance controls live inline in the drawer on phones. */
function AppearanceDisclosure() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] text-ink-2 transition duration-2 ease-fluid hover:bg-white/[0.055] hover:text-ink"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="flex-1 text-left">Mwonekano</span>
        <ChevronDown
          className={cn("h-4 w-4 text-ink-4 transition-transform duration-2", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="anim-rise mb-1 rounded-xl bg-white/[0.025] px-3 py-3">
          <AppearancePanel />
        </div>
      )}
    </div>
  );
}
