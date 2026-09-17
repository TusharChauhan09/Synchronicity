import Link from "next/link";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";

const features = [
  {
    title: "Human-in-the-loop",
    description:
      "CAPTCHAs, logins, and verification walls pause the agent and hand control to you.",
  },
  {
    title: "Persistent sessions",
    description:
      "Browser profile and cookies carry across runs — fewer bot-detection hits.",
  },
  {
    title: "Stays on screen",
    description:
      "When a task finishes, the browser stays open so you can inspect the result.",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col dot-grid">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 glow-top" />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="size-2 rounded-full bg-foreground" />
          <span className="text-sm font-medium tracking-tight">Synchronicity</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm">Docs</Button>
          <Link href="/workspace" className={cn(buttonVariants({ size: "sm" }))}>
            Get started
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-16">
        <div className="max-w-2xl">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Browser agents
          </p>
          <h1 className="text-4xl font-medium tracking-tight text-foreground sm:text-5xl sm:leading-[1.1]">
            Automate the browser.
            <br />
            <span className="text-muted-foreground">Pause for humans.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
            Synchronicity runs web tasks with an AI agent, hands control back when
            something needs a person, and keeps the session alive when it&apos;s done.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/workspace" className={cn(buttonVariants({ size: "lg" }))}>
              Open workspace
            </Link>
            <Link href="/pricing" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              View pricing
            </Link>
          </div>
        </div>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm"
            >
              <h2 className="text-sm font-medium tracking-tight">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </section>

      </main>
    </div>
  );
}
