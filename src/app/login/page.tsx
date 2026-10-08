import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/casino/logo";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  // Guests can still visit to create a real account.
  if (user && !user.isGuest) redirect("/");

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <Logo size="lg" className="mb-6" />
      <Card className="w-full">
        <h1 className="mb-1 font-display text-2xl font-bold text-text-primary">Welcome back</h1>
        <p className="mb-6 text-sm text-text-muted">Sign in to play with your virtual coins.</p>
        <LoginForm />
      </Card>
    </div>
  );
}
