import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

type SuccessPageProps = {
  searchParams: Promise<{ status?: string; session_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const succeeded = params.status === "success";

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 dot-grid">
      <div className="max-w-md rounded-xl border border-border bg-card/60 p-8 text-center backdrop-blur-sm">
        <h1 className="text-2xl font-medium tracking-tight">
          {succeeded ? "Payment received" : "Checkout complete"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {succeeded
            ? "Thanks for subscribing. Access will be activated once the payment webhook is confirmed."
            : "Your checkout session has ended. If you completed payment, access will update shortly."}
        </p>
        {params.session_id && (
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            Session: {params.session_id}
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/workspace" className={cn(buttonVariants({ size: "lg" }))}>
            Open workspace
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
