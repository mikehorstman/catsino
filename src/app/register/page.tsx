import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/casino/logo";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <Logo size="lg" className="mb-6" />
      <Card className="w-full">
        <h1 className="mb-1 font-display text-2xl font-bold text-text-primary">
          Join Catsino
        </h1>
        <p className="mb-6 text-sm text-text-muted">
          New players receive 10,000 virtual Catsino Coins. No real money
          involved.
        </p>
        <RegisterForm />
      </Card>
    </div>
  );
}
