"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "./field";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { authErrorMessage } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    setError(null);
    setPending(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      setSent(true);
    } catch (e) {
      // Don't reveal whether an address is registered.
      const code = (e as { code?: string }).code;
      if (code === "auth/user-not-found") setSent(true);
      else setError(authErrorMessage(e));
    }
    setPending(false);
  }

  if (sent)
    return (
      <p role="status" className="rounded-lg bg-win/10 px-3 py-3 text-sm text-text-secondary">
        If an account exists for that email, a reset link is on its way.{" "}
        <Link href="/login" className="text-gold-300 hover:underline">Back to sign in</Link>
      </p>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" name="email" type="email" required placeholder="cat@example.com" autoComplete="email" />
      {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-text-muted">
        <Link href="/login" className="text-gold-300 hover:underline">Back to sign in</Link>
      </p>
    </form>
  );
}
