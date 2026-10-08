"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "./field";
import { GoogleButton } from "./google-button";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { authErrorMessage, establishSession, safeNext } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function finish(created: boolean) {
    router.push(created ? "/?welcome=1" : next);
    router.refresh();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    try {
      const cred = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        String(form.get("email")),
        String(form.get("password")),
      );
      const { created } = await establishSession(cred.user);
      finish(created);
    } catch (e) {
      setError(authErrorMessage(e));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" name="email" type="email" required placeholder="cat@example.com" autoComplete="email" />
      <Field label="Password" name="password" type="password" required placeholder="Your password" autoComplete="current-password" />
      <div className="-mt-2 text-right">
        <Link href="/forgot-password" className="text-sm text-gold-300 hover:underline">
          Forgot password?
        </Link>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-text-muted">
        <span className="h-px flex-1 bg-ink-600" /> or <span className="h-px flex-1 bg-ink-600" />
      </div>
      <GoogleButton onDone={finish} onError={setError} />
      <p className="text-center text-sm text-text-muted">
        New here?{" "}
        <Link href="/register" className="text-gold-300 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
