"use client";

import { AmbientBackdrop } from "@/components/brand/ambient-backdrop";
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

  // One frame, before localStorage has been read. Rendering the backdrop keeps
  // it visually identical to the app rather than a blank flash.
  if (!ready || !active) {
    return (
      <div className="h-[100dvh] w-full">
        <AmbientBackdrop intensity="quiet" />
      </div>
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
