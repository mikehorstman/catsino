"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { registerAction } from "@/server/actions/auth";

export function RegisterForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await registerAction({
        email: formData.get("email"),
        displayName: formData.get("displayName"),
        password: formData.get("password"),
      });
      if (result.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(result.error?.message ?? "Registration failed");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <Field
        label="Display name"
        name="displayName"
        type="text"
        placeholder="Whiskers"
        required
      />
      <Field
        label="Email"
        name="email"
        type="email"
        placeholder="cat@example.com"
        required
      />
      <Field
        label="Password"
        name="password"
        type="password"
        placeholder="At least 8 characters"
        required
        minLength={8}
      />
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating your account…" : "Claim 10,000 welcome coins"}
      </Button>
      <p className="text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-gold-300 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    name: string;
  },
) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-text-secondary">
        {label}
      </span>
      <input
        {...rest}
        className="w-full rounded-xl border border-ink-600 bg-ink-800/70 px-4 py-3 text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
      />
    </label>
  );
}
