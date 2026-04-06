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
      className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm tracking-wide uppercase transition-colors duration-200 hover:bg-primary/90 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Create Account"}
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

export default function SignupPage() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    signupAction,
    {}
  );

  return (
    <div className="rounded-xl bg-card ring-1 ring-border p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Create your account
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your details to get started with Kunoz.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {state.error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
            {state.error}
          </div>
        )}

        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Full Name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            placeholder="Your full name"
            autoComplete="name"
            required
            className="w-full h-11 rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
          />
          {state.fieldErrors?.full_name && (
            <p className="text-xs text-destructive">{state.fieldErrors.full_name[0]}</p>
          )}
        </div>

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
          <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Password
          </label>
          <PasswordInput id="password" name="password" placeholder="Min 8 characters" autoComplete="new-password" />
          {state.fieldErrors?.password && (
            <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm_password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Confirm Password
          </label>
          <PasswordInput id="confirm_password" name="confirm_password" placeholder="Repeat your password" autoComplete="new-password" />
          {state.fieldErrors?.confirm_password && (
            <p className="text-xs text-destructive">{state.fieldErrors.confirm_password[0]}</p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-border" />

        <SubmitButton />
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
