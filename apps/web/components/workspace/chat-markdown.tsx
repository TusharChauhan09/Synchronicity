"use client";

import { Fragment, type ReactNode } from "react";

type ChatMarkdownProps = {
  content: string;
};

type Block =
  | { type: "code"; lang: string; code: string }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "paragraph"; text: string };

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  const blocks = parseBlocks(content.trim());

  return (
    <div className="chat-md min-w-0 w-full max-w-full overflow-hidden space-y-2.5 break-words text-[13px] leading-[1.65] text-foreground/92">
      {blocks.map((block, index) => (
        <Fragment key={index}>{renderBlock(block)}</Fragment>
      ))}
    </div>
  );
}

function renderBlock(block: Block): ReactNode {
  if (block.type === "code") {
    return (
      <pre className="overflow-x-hidden whitespace-pre-wrap break-all rounded-lg border border-white/8 bg-[oklch(0.08_0.006_285)] px-3 py-2.5 font-mono text-[12px] leading-relaxed text-foreground/85">
        <code>{block.code}</code>
      </pre>
    );
  }

  if (block.type === "heading") {
    const size =
      block.level === 1 ? "text-[15px]" : block.level === 2 ? "text-[14px]" : "text-[13px]";
    return <p className={`${size} font-semibold tracking-tight text-foreground`}>{renderInline(block.text)}</p>;
  }

  if (block.type === "quote") {
    return (
      <blockquote className="border-l-2 border-white/20 pl-3 text-muted-foreground">
        {renderInline(block.text)}
      </blockquote>
    );
  }

  if (block.type === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag
        className={`min-w-0 max-w-full space-y-1 overflow-hidden pl-4 ${block.ordered ? "list-decimal" : "list-disc"} marker:text-muted-foreground`}
      >
        {block.items.map((item, index) => (
          <li key={index} className="min-w-0 pl-0.5">
            {renderInline(item)}
          </li>
        ))}
      </Tag>
    );
  }

  if (block.type === "paragraph") {
    if (!block.text) {
      return <div className="my-1 h-px bg-white/10" aria-hidden />;
    }
    return <p>{renderInline(block.text)}</p>;
  }

  return null;
}

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", lang, code: body.join("\n") });
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading?.[1] && heading[2]) {
      const level = heading[1].length as 1 | 2 | 3;
      blocks.push({
        type: "heading",
        level,
        text: heading[2],
      });
      i += 1;
      continue;
    }

    if (/^[-*_]{3,}$/.test(line.trim())) {
      blocks.push({ type: "paragraph", text: "" });
      i += 1;
      continue;
    }

    if (line.trim().startsWith("> ")) {
      const quote: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("> ")) {
        quote.push((lines[i] ?? "").trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i] ?? "";
        const match = isOrdered
          ? current.match(/^\s*\d+[.)]\s+(.+)$/)
          : current.match(/^\s*[-*]\s+(.+)$/);
        if (!match?.[1]) break;
        items.push(match[1]);
        i += 1;
      }
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length) {
      const current = lines[i] ?? "";
      if (
        !current.trim() ||
        current.trim().startsWith("```") ||
        current.match(/^(#{1,3})\s+/) ||
        current.trim().startsWith("> ") ||
        current.match(/^\s*[-*]\s+/) ||
        current.match(/^\s*\d+[.)]\s+/)
      ) {
        break;
      }
      paragraph.push(current);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks.length > 0 ? blocks : [{ type: "paragraph", text: source }];
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      nodes.push(<Fragment key={key++}>{text.slice(last, match.index)}</Fragment>);
    }

    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded-md bg-white/8 px-1 py-0.5 font-mono text-[12px] text-foreground"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("[") && token.includes("](")) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        nodes.push(
          <a
            key={key++}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="break-all underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
          >
            {link[1]}
          </a>,
        );
      }
    } else {
      nodes.push(
        <em key={key++} className="italic text-foreground/90">
          {token.slice(1, -1)}
        </em>,
      );
    }

    last = match.index + token.length;
  }

  if (last < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  }

  return nodes;
}
