"use client";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "./field";
import { GoogleButton } from "./google-button";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { authErrorMessage, establishSession } from "@/lib/auth-client";

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function finish(created: boolean) {
    router.push(created ? "/?welcome=1" : "/");
    router.refresh();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName")).trim().slice(0, 40);
    const password = String(form.get("password"));
    if (password.length < 8) return setError("Password must be at least 8 characters");

    setError(null);
    setPending(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        String(form.get("email")),
        password,
      );
      await updateProfile(cred.user, { displayName }).catch(() => undefined);
      sendEmailVerification(cred.user).catch(() => undefined);
      const { created } = await establishSession(cred.user, displayName);
      finish(created);
    } catch (e) {
      setError(authErrorMessage(e));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Display name" name="displayName" type="text" placeholder="Whiskers" required maxLength={40} autoComplete="nickname" />
      <Field label="Email" name="email" type="email" placeholder="cat@example.com" required autoComplete="email" />
      <Field label="Password" name="password" type="password" placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" />
      {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating your account…" : "Claim 10,000 welcome coins"}
      </Button>
      <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-text-muted">
        <span className="h-px flex-1 bg-ink-600" /> or <span className="h-px flex-1 bg-ink-600" />
      </div>
      <GoogleButton onDone={finish} onError={setError} />
      <p className="text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-gold-300 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
