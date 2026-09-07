"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DemoLoginPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignedIn(true);
  }

  return (
    <main className="grid min-h-svh place-items-center bg-zinc-100 px-4">
      <Card className="w-full max-w-sm bg-white">
        <CardHeader>
          <CardDescription>Synchronicity demo</CardDescription>
          <CardTitle>{signedIn ? "You are signed in" : "Sign in"}</CardTitle>
        </CardHeader>
        <CardContent>
          {signedIn ? (
            <p className="text-muted-foreground" data-testid="signed-in">
              Signed in as {email || "demo user"}. The agent can continue from here.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  defaultValue="demo"
                  required
                />
              </div>
              <Button type="submit">Sign in</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
