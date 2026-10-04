"use client";

import React from "react";
import { ChatGPT } from "@/components/assistant-ui/ChatGPT";

export default function HomePage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      <ChatGPT />
    </main>
  );
}
