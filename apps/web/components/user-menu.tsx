"use client";

import { useRouter } from "next/navigation";
import { Sparkles, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useBilling } from "@/hooks/use-billing";
import { authClient } from "@repo/auth/client";

function initials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

type UserMenuProps = {
  align?: "start" | "center" | "end";
};

export function UserMenu({ align = "end" }: UserMenuProps) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { billing } = useBilling();

  if (isPending) {
    return <div className="size-8 shrink-0 rounded-full bg-muted/60" aria-hidden />;
  }

  if (!session) {
    return (
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Sign in
      </button>
    );
  }

  const user = session.user;

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account menu"
      >
        <Avatar size="default" className="size-8 cursor-pointer">
          <AvatarImage src={user.image ?? undefined} alt={user.name} />
          <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="!w-64 min-w-64 max-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="px-2 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <Sparkles className="size-3.5" />
              Credits
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {billing ? billing.creditsRemaining : "—"}
            </span>
          </div>
          <p className="mt-1.5">
            Plan:{" "}
            <span className="font-medium text-foreground">{billing?.planName ?? "Free"}</span>
          </p>
        </div>
        <DropdownMenuSeparator />
        <div className="px-1 py-1">
          <ThemeToggle showLabel className="w-full justify-start px-1.5" />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/pricing")}>
            Manage subscription
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
