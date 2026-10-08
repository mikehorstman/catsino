import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/casino/logo";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <Logo size="lg" className="mb-6" />
      <Card className="w-full">
        <h1 className="mb-1 font-display text-2xl font-bold text-text-primary">Reset your password</h1>
        <p className="mb-6 text-sm text-text-muted">We&apos;ll email you a link to choose a new one.</p>
        <ForgotPasswordForm />
      </Card>
    </div>
  );
}
