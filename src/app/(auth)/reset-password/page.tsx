"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";

import { resetPasswordAction, type ActionState } from "@/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm tracking-wide uppercase transition-colors duration-200 hover:bg-primary/90 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Send Reset Link"}
    </button>
  );
}

function SuccessState() {
  return (
    <div className="rounded-xl bg-card ring-1 ring-border p-8 shadow-sm text-center">
      <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Mail className="h-6 w-6 text-primary" />
      </div>
      <h2 className="font-heading text-xl font-semibold text-foreground">
        Check your email
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-[320px] mx-auto">
        We sent a password reset link to your email. Follow the instructions to set a new password.
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

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    {}
  );

  if (state.success) {
    return <SuccessState />;
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-border p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Reset your password
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the email linked to your account and we&apos;ll send you a reset link.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        {state.error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
            className="w-full h-11 rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
          />
          {state.fieldErrors?.email && (
            <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-border" />

        <SubmitButton />
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
