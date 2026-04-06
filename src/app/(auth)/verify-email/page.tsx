"use client";

import Link from "next/link";
import { Mail } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="rounded-xl bg-card ring-1 ring-border p-8 shadow-sm text-center">
      <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Mail className="h-6 w-6 text-primary" />
      </div>
      <h2 className="font-heading text-xl font-semibold text-foreground">
        Check your email
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-[320px] mx-auto">
        We sent a verification link to your email. Click the link to activate your account.
      </p>
      <div className="mt-6">
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-muted px-6 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
