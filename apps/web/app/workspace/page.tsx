"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SiteLoader } from "@/components/workspace/site-loader";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { authClient } from "@repo/auth/client";

export default function WorkspacePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login?next=/workspace");
    }
  }, [isPending, router, session]);

  if (isPending || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-background dot-grid">
        <SiteLoader label="Checking session" />
      </div>
    );
  }

  return <WorkspaceShell />;
}
