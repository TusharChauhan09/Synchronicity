import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

const plan = {
  name: "Pro",
  price: "$20",
  period: "/ month",
  description: "Full browser agent workspace with human-in-the-loop control.",
  features: [
    "Unlimited agent sessions",
    "Human takeover for CAPTCHAs & logins",
    "Persistent browser profiles",
    "Priority support",
  ],
};

export default function PricingPage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col dot-grid">
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-2 rounded-full bg-foreground" />
          <span className="text-sm font-medium tracking-tight">Synchronicity</span>
        </Link>
        <Link href="/workspace" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Workspace
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-10">
        <div className="max-w-xl">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Pricing
          </p>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Simple plans for browser automation
          </h1>
          <p className="mt-4 text-muted-foreground">
            Subscribe to unlock the full workspace. Payments are handled securely by Dodo
            Payments.
          </p>
        </div>

        <article className="mt-12 max-w-md rounded-xl border border-border bg-card/60 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-medium">{plan.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
          <p className="mt-6 flex items-baseline gap-1">
            <span className="text-4xl font-medium tracking-tight">{plan.price}</span>
            <span className="text-sm text-muted-foreground">{plan.period}</span>
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            {plan.features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="text-foreground">·</span>
                {feature}
              </li>
            ))}
          </ul>
          <CheckoutButton className="mt-8" label="Subscribe with Dodo" />
        </article>
      </main>
    </div>
  );
}
