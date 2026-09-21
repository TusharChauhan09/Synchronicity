"use client";

import { Fragment, useMemo } from "react";

type InlinePart =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string };

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push({ type: "bold", value: token.slice(2, -2) });
    } else if (token.startsWith("`")) {
      parts.push({ type: "code", value: token.slice(1, -1) });
    } else if (token.startsWith("*")) {
      parts.push({ type: "italic", value: token.slice(1, -1) });
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: "text", value: text }];
}

function InlineContent({ text }: { text: string }) {
  const parts = useMemo(() => parseInline(text), [text]);

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "bold") {
          return (
            <strong key={index} className="font-semibold text-foreground">
              {part.value}
            </strong>
          );
        }
        if (part.type === "italic") {
          return (
            <em key={index} className="text-foreground/85">
              {part.value}
            </em>
          );
        }
        if (part.type === "code") {
          return (
            <code
              key={index}
              className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-foreground/90"
            >
              {part.value}
            </code>
          );
        }
        return <Fragment key={index}>{part.value}</Fragment>;
      })}
    </>
  );
}

type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "heading"; level: number; text: string }
  | { type: "list"; items: string[] }
  | { type: "comment"; text: string }
  | { type: "hr" };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let listBuffer: string[] | null = null;

  const flushList = () => {
    if (listBuffer?.length) {
      blocks.push({ type: "list", items: listBuffer });
      listBuffer = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList();
      blocks.push({ type: "hr" });
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading?.[1] && heading[2]) {
      flushList();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      continue;
    }

    if (trimmed.startsWith("//")) {
      flushList();
      blocks.push({ type: "comment", text: trimmed.slice(2).trim() || trimmed });
      continue;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bullet?.[1]) {
      if (!listBuffer) listBuffer = [];
      listBuffer.push(bullet[1]);
      continue;
    }

    flushList();
    const last = blocks[blocks.length - 1];
    if (last?.type === "paragraph") {
      last.lines.push(trimmed);
    } else {
      blocks.push({ type: "paragraph", lines: [trimmed] });
    }
  }

  flushList();
  return blocks;
}

export function ChatMarkdown({ content }: { content: string }) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className="space-y-2.5 text-[13px] leading-[1.65] text-foreground/92">
      {blocks.map((block, index) => {
        if (block.type === "hr") {
          return <hr key={index} className="border-border/60" />;
        }
        if (block.type === "heading") {
          const size =
            block.level === 1 ? "text-[15px] font-semibold" : "text-[14px] font-medium";
          return (
            <p key={index} className={`${size} tracking-tight text-foreground`}>
              <InlineContent text={block.text} />
            </p>
          );
        }
        if (block.type === "comment") {
          return (
            <p
              key={index}
              className="rounded-md border border-border/40 bg-muted/30 px-2.5 py-1.5 text-[12px] italic text-muted-foreground"
            >
              <InlineContent text={block.text} />
            </p>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={index} className="ml-1 space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/35" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <InlineContent text={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                <InlineContent text={line} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
