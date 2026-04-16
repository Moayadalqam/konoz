"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { signupAction, type ActionState } from "@/actions/auth";

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
        {pending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Create Account"}
      </span>
    </button>
  );
}

function PasswordInput({
  name,
  id,
  placeholder,
  autoComplete,
}: {
  name: string;
  id: string;
  placeholder: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
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

export default function SignupPage() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    signupAction,
    {}
  );

  return (
    <div className="rounded-2xl border border-white/8 bg-black/30 backdrop-blur-xl p-8 shadow-2xl">
      <div className="mb-6">
        <h2 className="font-heading text-xl font-semibold text-white">
          Create your account
        </h2>
        <p className="mt-1 text-sm text-white/40">
          Enter your details to get started with Kunoz.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {state.error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-300">
            {state.error}
          </div>
        )}

        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className="text-xs font-medium uppercase tracking-wider text-white/50">
            Full Name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            placeholder="Your full name"
            autoComplete="name"
            required
            className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-[#D4A843]/50 focus:outline-none focus:ring-1 focus:ring-[#D4A843]/30 transition-colors backdrop-blur-sm"
          />
          {state.fieldErrors?.full_name && (
            <p className="text-xs text-red-400">{state.fieldErrors.full_name[0]}</p>
          )}
        </div>

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
          <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-white/50">
            Password
          </label>
          <PasswordInput id="password" name="password" placeholder="Min 8 characters" autoComplete="new-password" />
          {state.fieldErrors?.password && (
            <p className="text-xs text-red-400">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm_password" className="text-xs font-medium uppercase tracking-wider text-white/50">
            Confirm Password
          </label>
          <PasswordInput id="confirm_password" name="confirm_password" placeholder="Repeat your password" autoComplete="new-password" />
          {state.fieldErrors?.confirm_password && (
            <p className="text-xs text-red-400">{state.fieldErrors.confirm_password[0]}</p>
          )}
        </div>

        {/* Gold divider */}
        <div className="h-px w-full" style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(212,168,67,0.2) 50%, transparent 100%)",
        }} />

        <SubmitButton />
      </form>

      <p className="mt-5 text-center text-sm text-white/35">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[#D4A843]/70 hover:text-[#D4A843] transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
