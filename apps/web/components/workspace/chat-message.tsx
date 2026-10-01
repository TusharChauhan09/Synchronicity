"use client";

import { motion } from "motion/react";
import type { ChatMessage } from "@/lib/session-types";
import { ChatMarkdown } from "./chat-markdown";

type ChatMessageBubbleProps = {
  message: ChatMessage;
  agentLabel: string;
};

export function ChatMessageBubble({ message, agentLabel }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`flex w-full max-w-full min-w-0 overflow-hidden ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex min-w-0 max-w-[92%] flex-col gap-1 overflow-hidden ${
          isUser ? "ml-auto w-fit items-end" : "w-full items-start"
        }`}
      >
        <span className="px-1 text-[11px] text-muted-foreground">{isUser ? "You" : agentLabel}</span>
        <div
          className={`max-w-full min-w-0 overflow-hidden break-words rounded-2xl px-3.5 py-2.5 ${
            isUser ? "w-fit" : "w-full"
          } ${
            isUser
              ? "rounded-br-md bg-workspace-user-bubble text-workspace-user-bubble-fg"
              : "rounded-bl-md border border-workspace-subtle-border bg-workspace-agent-bubble"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.6]">{message.content}</p>
          ) : (
            <ChatMarkdown content={message.content} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
