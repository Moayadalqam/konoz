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
      className="group relative w-full h-11 rounded-lg font-medium text-sm tracking-wide uppercase overflow-hidden transition-all duration-300 disabled:opacity-50"
      style={{
        background: "linear-gradient(135deg, #B8163A 0%, #8B1030 100%)",
        color: "#fff",
      }}
    >
      {/* Gold shimmer on hover */}
      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
        background: "linear-gradient(135deg, #B8163A 0%, #C92040 40%, #B8163A 100%)",
      }} />
      <span className="relative">
        {pending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Sign In"}
      </span>
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
        className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-4 pr-10 text-sm text-white placeholder:text-white/30 focus:border-[#D4A843]/50 focus:outline-none focus:ring-1 focus:ring-[#D4A843]/30 transition-colors backdrop-blur-sm"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
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
    <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-300">
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
    <div className="rounded-2xl border border-white/8 bg-black/30 backdrop-blur-xl p-8 shadow-2xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-heading text-xl font-semibold text-white">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-white/40">
          Sign in to your account to continue.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        {/* URL-based error */}
        <ErrorBanner searchParams={searchParams} />

        {/* Server action error */}
        {state.error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-300">
            {state.error}
          </div>
        )}

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-white/50">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
            className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-[#D4A843]/50 focus:outline-none focus:ring-1 focus:ring-[#D4A843]/30 transition-colors backdrop-blur-sm"
          />
          {state.fieldErrors?.email && (
            <p className="text-xs text-red-400">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-white/50">
              Password
            </label>
            <Link
              href="/reset-password"
              className="text-xs text-[#D4A843]/60 hover:text-[#D4A843] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput />
          {state.fieldErrors?.password && (
            <p className="text-xs text-red-400">
              {state.fieldErrors.password[0]}
            </p>
          )}
        </div>

        {/* Gold divider */}
        <div className="h-px w-full" style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(212,168,67,0.2) 50%, transparent 100%)",
        }} />

        <SubmitButton />
      </form>

      <p className="mt-5 text-center text-sm text-white/35">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-[#D4A843]/70 hover:text-[#D4A843] transition-colors"
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
