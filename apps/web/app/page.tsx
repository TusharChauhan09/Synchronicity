import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="dark min-h-svh bg-background text-foreground">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <p className="text-sm text-muted-foreground">Synchronicity</p>
        <Link href="/workspace" className={cn(buttonVariants())}>
          Open workspace
        </Link>
      </nav>
      <section className="mx-auto max-w-5xl px-6 pt-16">
        <p className="mb-3 text-sm text-muted-foreground">Phase 1 demo</p>
        <h1 className="max-w-xl text-4xl font-medium tracking-tight text-balance md:text-5xl">
          An agent that drives a real browser.
        </h1>
        <p className="mt-4 max-w-lg text-muted-foreground leading-relaxed">
          Prompt on the right. Watch the left. When login or anything sensitive
          comes up, the agent pauses, you take over, then Continue from the same
          step.
        </p>
        <Link href="/workspace" className={cn(buttonVariants(), "mt-8")}>
          Open workspace
        </Link>
      </section>
    </div>
  );
}
