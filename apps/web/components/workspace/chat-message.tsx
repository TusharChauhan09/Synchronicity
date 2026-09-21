"use client";

import { motion } from "motion/react";
import type { ChatMessage } from "@/lib/session-types";
import { ChatMarkdown } from "./chat-markdown";
import { Bot, User } from "lucide-react";

type ChatMessageBubbleProps = {
  message: ChatMessage;
  agentLabel: string;
  accentColor?: string | null;
};

export function ChatMessageBubble({ message, agentLabel, accentColor }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${
          isUser
            ? "border-foreground/15 bg-foreground text-background"
            : "border-border bg-card text-muted-foreground"
        }`}
        aria-hidden
      >
        {isUser ? <User className="size-3.5" strokeWidth={2} /> : <Bot className="size-3.5" strokeWidth={2} />}
      </div>

      <div className={`min-w-0 max-w-[min(100%,28rem)] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <span className="px-1 text-[11px] font-medium text-muted-foreground">
          {isUser ? "You" : agentLabel}
        </span>
        <div
          className={`rounded-2xl px-3.5 py-2.5 shadow-sm ${
            isUser
              ? "rounded-tr-md bg-foreground text-background"
              : "rounded-tl-md border border-border/80 bg-card/90"
          }`}
          style={
            !isUser && accentColor
              ? { boxShadow: `inset 3px 0 0 0 ${accentColor}` }
              : undefined
          }
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-[13px] leading-[1.6]">{message.content}</p>
          ) : (
            <ChatMarkdown content={message.content} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
