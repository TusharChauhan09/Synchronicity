"use client";

import { motion } from "motion/react";
import type { ChatMessage } from "@/lib/session-types";
import { ChatMarkdown } from "./chat-markdown";

type ChatMessageBubbleProps = {
  message: ChatMessage;
  agentLabel: string;
  accentColor?: string | null;
};

export function ChatMessageBubble({ message, agentLabel, accentColor }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`flex min-w-0 max-w-[92%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <span className="px-1 text-[11px] text-muted-foreground">{isUser ? "You" : agentLabel}</span>
        <div
          className={`rounded-2xl px-3.5 py-2.5 ${
            isUser
              ? "rounded-br-md bg-[oklch(0.86_0.02_285)] text-[oklch(0.16_0.01_285)]"
              : "rounded-bl-md border border-white/8 bg-[oklch(0.16_0.01_285)]"
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
