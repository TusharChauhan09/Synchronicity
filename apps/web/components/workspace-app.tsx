"use client";

import Link from "next/link";
import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type WheelEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  continueSession,
  createSession,
  getSession,
  sendControl,
  sendPrompt,
} from "@/lib/client/api";
import type { SessionSnapshot } from "@/lib/session/types";
import { cn } from "@/lib/utils";
import { mapClickToViewport } from "@/lib/viewport";

const PLACEHOLDER = "Go to http://localhost:3000/demo-login and sign in";

export function WorkspaceApp() {
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [prompt, setPrompt] = useState("");
  const [typeBuffer, setTypeBuffer] = useState("");
  const [bootError, setBootError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    createSession()
      .then((next) => {
        if (!cancelled) {
          setSession(next);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setBootError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session?.id) {
      return;
    }
    const timer = window.setInterval(() => {
      getSession(session.id)
        .then(setSession)
        .catch(() => undefined);
    }, 800);
    return () => window.clearInterval(timer);
  }, [session?.id]);

  useEffect(() => {
    const node = logRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [session?.messages.length]);

  const paused = session?.status === "awaiting_user";
  const busy = session?.status === "running";

  async function onSend(event: FormEvent) {
    event.preventDefault();
    if (!session || busy || paused || !prompt.trim()) {
      return;
    }
    const text = prompt.trim();
    setPrompt("");
    setSession(await sendPrompt(session.id, text));
  }

  async function onContinue() {
    if (!session || !paused) {
      return;
    }
    setSession(await continueSession(session.id));
  }

  async function onBrowserClick(event: MouseEvent<HTMLImageElement>) {
    if (!session || !paused) {
      return;
    }
    const point = mapClickToViewport(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
    );
    if (!point) {
      return;
    }
    setSession(await sendControl(session.id, { type: "click", ...point }));
  }

  async function onBrowserWheel(event: WheelEvent<HTMLImageElement>) {
    if (!session || !paused) {
      return;
    }
    event.preventDefault();
    const point = mapClickToViewport(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
    );
    if (!point) {
      return;
    }
    setSession(
      await sendControl(session.id, {
        type: "scroll",
        x: point.x,
        y: point.y,
        deltaY: event.deltaY,
      }),
    );
  }

  async function onTypeSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session || !paused || !typeBuffer) {
      return;
    }
    const text = typeBuffer;
    setTypeBuffer("");
    setSession(await sendControl(session.id, { type: "type", text }));
  }

  async function onTypeKey(event: KeyboardEvent<HTMLInputElement>) {
    if (!session || !paused) {
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && typeBuffer === "") {
      event.preventDefault();
      setSession(await sendControl(session.id, { type: "keypress", keys: ["enter"] }));
    }
  }

  const statusLabel =
    session?.status === "running"
      ? "Agent running"
      : session?.status === "awaiting_user"
        ? "Your turn"
        : session?.status === "error"
          ? "Error"
          : "Idle";

  const statusVariant =
    session?.status === "error"
      ? "destructive"
      : session?.status === "running"
        ? "secondary"
        : "outline";

  return (
    <div className="dark grid h-svh grid-rows-[auto_1fr] bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-2">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
        >
          Synchronicity
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          <p className="truncate text-xs text-muted-foreground">
            {session?.currentUrl ?? "Starting…"}
          </p>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-1 md:grid-cols-[4fr_1fr]">
        <section className="relative grid min-w-0 place-items-center bg-black">
          {session?.screenshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.screenshot}
              alt="Live browser"
              className={cn(
                "size-full object-contain",
                paused ? "cursor-crosshair" : "cursor-default",
              )}
              onClick={onBrowserClick}
              onWheel={onBrowserWheel}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {bootError ?? "Launching browser…"}
            </p>
          )}
          {paused ? (
            <p className="absolute bottom-4 left-4 rounded-lg border border-amber-500/30 bg-background/80 px-3 py-1.5 text-xs text-amber-400">
              You have control — click the page, type below, then Continue.
            </p>
          ) : null}
        </section>

        <aside className="grid min-h-0 grid-rows-[1fr_auto] border-t bg-card md:border-t-0 md:border-l">
          <ScrollArea className="min-h-0">
            <div ref={logRef} className="flex flex-col gap-4 p-4">
              {session?.messages.map((message) => (
                <article key={message.id}>
                  <p className="mb-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                    {message.role}
                  </p>
                  <p
                    className={cn(
                      "text-sm leading-relaxed whitespace-pre-wrap",
                      message.role === "system" && "text-muted-foreground",
                    )}
                  >
                    {message.content}
                  </p>
                </article>
              ))}
            </div>
          </ScrollArea>

          {paused ? (
            <div className="grid gap-2 border-t p-3">
              <form onSubmit={onTypeSubmit}>
                <Input
                  value={typeBuffer}
                  onChange={(event) => setTypeBuffer(event.target.value)}
                  onKeyDown={onTypeKey}
                  placeholder="Type into the page"
                />
              </form>
              <Button type="button" onClick={onContinue}>
                Continue
              </Button>
            </div>
          ) : (
            <form className="grid gap-2 border-t p-3" onSubmit={onSend}>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={PLACEHOLDER}
                rows={3}
                disabled={busy || !session}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void onSend(event as unknown as FormEvent);
                  }
                }}
              />
              <Button type="submit" disabled={busy || !session || !prompt.trim()}>
                Send
              </Button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
