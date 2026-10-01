import { CheckoutButton } from "@/components/checkout-button";
import { SiteHeader } from "@/components/site-header";
import { PUBLIC_PLANS } from "@/lib/plans";
import { cn } from "cn";

export default function PricingPage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col dot-grid">
      <SiteHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-10">
        <div className="max-w-xl">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Pricing
          </p>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Credits for every chat
          </h1>
          <p className="mt-4 text-muted-foreground">
            Each agent or workspace message uses one credit. Free includes 5 chats on a single
            window; paid plans add more credits and concurrent browsers.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {PUBLIC_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={cn(
                "flex flex-col rounded-xl border border-border bg-card/60 p-6 backdrop-blur-sm",
                plan.id === "plus" && "ring-1 ring-foreground/15",
              )}
            >
              <h2 className="text-lg font-medium">{plan.name}</h2>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-medium tracking-tight">{plan.priceLabel}</span>
                {plan.id !== "free" && (
                  <span className="text-sm text-muted-foreground">/ month</span>
                )}
              </p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-foreground">·</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {plan.id === "free" ? (
                  <p className="text-center text-sm text-muted-foreground">Included when you sign in</p>
                ) : (
                  <CheckoutButton
                    plan={plan.id}
                    label={`Get ${plan.name}`}
                    className="w-full"
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
