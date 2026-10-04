"use client";

import { memo, useCallback, useState } from "react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import type {
  CodeHeaderProps,
  SyntaxHighlighterProps,
} from "@assistant-ui/react-markdown";
import { Check, Copy } from "lucide-react";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/** Copy-to-clipboard control shared by the code-fence header. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the button simply does nothing */
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Imenakiliwa" : label}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition",
        "hover:bg-white/[0.07] hover:text-ink active:scale-90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/70",
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-gold-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

/** Code fence: machined header, language plate, copy affordance. */
function KhakiSyntaxHighlighter({ components, language, code }: SyntaxHighlighterProps) {
  const { Pre, Code } = components;

  return (
    <div className="my-1 overflow-hidden rounded-lg border border-white/[0.09] bg-[#08080b]">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] bg-white/[0.02] px-3 py-1.5">
        <span className="plate-type text-ink-3">{language || "code"}</span>
        <CopyButton value={code} label="Nakili code" />
      </div>
      <Pre className="!my-0">
        <Code className={language ? `language-${language}` : undefined}>{code}</Code>
      </Pre>
    </div>
  );
}

function KhakiCodeHeader({ language }: CodeHeaderProps) {
  return <span className="plate-type text-ink-3">{language || "code"}</span>;
}

const COMPONENTS = {
  SyntaxHighlighter: KhakiSyntaxHighlighter,
  CodeHeader: KhakiCodeHeader,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-1 overflow-x-auto rounded-sm">
      <table>{children}</table>
    </div>
  ),
} as const;

const REMARK_PLUGINS = [remarkGfm];

/**
 * Assistant markdown.
 *
 * Memoised on purpose: during streaming this re-renders on every token, and the
 * parser is the most expensive thing in the transcript.
 */
export const MarkdownText = memo(function MarkdownText() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={REMARK_PLUGINS}
      components={COMPONENTS}
      className="k-prose"
      defer
    />
  );
});
