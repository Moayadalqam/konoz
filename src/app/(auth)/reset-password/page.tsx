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
      className="group relative w-full h-11 rounded-lg font-medium text-sm tracking-wide uppercase overflow-hidden transition-all duration-300 disabled:opacity-50"
      style={{
        background: "linear-gradient(135deg, #B8163A 0%, #8B1030 100%)",
        color: "#fff",
      }}
    >
      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
        background: "linear-gradient(135deg, #B8163A 0%, #C92040 40%, #B8163A 100%)",
      }} />
      <span className="relative">
        {pending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Send Reset Link"}
      </span>
    </button>
  );
}

function SuccessState() {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/30 backdrop-blur-xl p-8 shadow-2xl text-center">
      <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{
        background: "linear-gradient(135deg, rgba(184,22,58,0.15), rgba(212,168,67,0.15))",
      }}>
        <Mail className="h-6 w-6" style={{ color: "#D4A843" }} />
      </div>
      <h2 className="font-heading text-xl font-semibold text-white">
        Check your email
      </h2>
      <p className="mt-2 text-sm text-white/40 max-w-[320px] mx-auto">
        We sent a password reset link to your email. Follow the instructions to set a new password.
      </p>
      <div className="mt-6">
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
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
    <div className="rounded-2xl border border-white/8 bg-black/30 backdrop-blur-xl p-8 shadow-2xl">
      <div className="mb-6">
        <h2 className="font-heading text-xl font-semibold text-white">
          Reset your password
        </h2>
        <p className="mt-1 text-sm text-white/40">
          Enter the email linked to your account and we&apos;ll send you a reset link.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        {state.error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-300">
            {state.error}
          </div>
        )}

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

        {/* Gold divider */}
        <div className="h-px w-full" style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(212,168,67,0.2) 50%, transparent 100%)",
        }} />

        <SubmitButton />
      </form>

      <p className="mt-5 text-center text-sm text-white/35">
        Remember your password?{" "}
        <Link href="/login" className="font-medium text-[#D4A843]/70 hover:text-[#D4A843] transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
