"use client";

import { Suspense, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { loginAction, type ActionState } from "@/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm tracking-wide uppercase transition-colors duration-200 hover:bg-primary/90 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Sign In"}
    </button>
  );
}

function PasswordInput() {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id="password"
        name="password"
        type={visible ? "text" : "password"}
        placeholder="Enter your password"
        autoComplete="current-password"
        required
        className="w-full h-11 rounded-lg border border-border bg-background px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ErrorBanner({ searchParams }: { searchParams: URLSearchParams }) {
  const errorParam = searchParams.get("error");
  if (!errorParam) return null;

  const messages: Record<string, string> = {
    rejected:
      "Your registration was rejected by an administrator. Contact support if you believe this is a mistake.",
    auth_callback_failed:
      "We couldn't verify your email. The link may have expired — try again.",
  };

  const message = messages[errorParam] ?? "An authentication error occurred.";

  return (
    <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
      {message}
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction] = useActionState<ActionState, FormData>(
    loginAction,
    {}
  );

  return (
    <div className="rounded-xl bg-card ring-1 ring-border p-8 shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your account to continue.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        {/* URL-based error */}
        <ErrorBanner searchParams={searchParams} />

        {/* Server action error */}
        {state.error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
            {state.error}
          </div>
        )}

        {/* Email */}
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

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <Link
              href="/reset-password"
              className="text-xs text-primary/70 hover:text-primary transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput />
          {state.fieldErrors?.password && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.password[0]}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-border" />

        <SubmitButton />
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
