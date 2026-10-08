"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { loginAction } from "@/server/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await loginAction({
        email: formData.get("email"),
        password: formData.get("password"),
      });
      if (result.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(result.error?.message ?? "Sign in failed");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-text-secondary">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="cat@example.com"
          className="w-full rounded-xl border border-ink-600 bg-ink-800/70 px-4 py-3 text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-text-secondary">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          placeholder="Your password"
          className="w-full rounded-xl border border-ink-600 bg-ink-800/70 px-4 py-3 text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
        />
      </label>
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-text-muted">
        New here?{" "}
        <Link href="/register" className="text-gold-300 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
