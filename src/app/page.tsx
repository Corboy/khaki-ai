"use client";

import { AmbientBackdrop } from "@/components/brand/ambient-backdrop";
import { KhakiMark } from "@/components/brand/khaki-mark";
import { ConversationsProvider, useConversations } from "@/components/chat/conversations-provider";
import { KhakiChatRuntime } from "@/components/chat/chat-runtime";
import { ChatThread, ThinkingAmbient } from "@/components/chat/thread";
import { AppShell } from "@/components/layout/app-shell";
import { StudioInfoProvider } from "@/components/studio-info";

/**
 * The studio assistant.
 *
 * `ConversationsProvider` owns the saved history; the runtime is keyed by the
 * active conversation so switching threads remounts it cleanly instead of
 * trying to re-point a live stream.
 */
export default function HomePage() {
  return (
    <ConversationsProvider>
      <StudioInfoProvider>
        <ChatWorkspace />
      </StudioInfoProvider>
    </ConversationsProvider>
  );
}

function ChatWorkspace() {
  const { active, ready } = useConversations();

  /*
   * First frame, before saved history has been read.
   *
   * This used to render the backdrop on its own — a pure black rectangle with
   * no logo, no chrome and no text, which is what a customer on a slow phone
   * connection saw first. Rendering the real shell instead means the header,
   * sidebar and mark are already in place when the conversation arrives, so the
   * app looks like it is waking up rather than failing to load.
   */
  if (!ready || !active) {
    return (
      <>
        <AmbientBackdrop intensity="quiet" />
        <AppShell>
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <KhakiMark size={54} halo priority />
            <p className="text-[13.5px] text-ink-3" role="status" aria-live="polite">
              Inapakia mazungumzo yako…
            </p>
          </div>
        </AppShell>
      </>
    );
  }

  return (
    <KhakiChatRuntime key={active.id} conversation={active}>
      <ThinkingAmbient />
      <AppShell>
        <ChatThread />
      </AppShell>
    </KhakiChatRuntime>
  );
}
