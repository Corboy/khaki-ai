"use client";

import React, { FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessagePrimitive } from "@assistant-ui/react";

export const MarkdownText: FC = () => {
  return (
    <div className="prose prose-invert max-w-none text-[15px] leading-7 text-zinc-100 prose-p:my-2 prose-headings:text-white prose-strong:text-khaki-gold-light prose-code:rounded prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:text-khaki-gold prose-ul:my-2 prose-li:my-0.5">
      <MessagePrimitive.Content
        components={{
          Text: ({ text }) => (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {text}
            </ReactMarkdown>
          ),
        }}
      />
    </div>
  );
};
