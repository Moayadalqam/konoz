"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { updatePasswordAction, type ActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full h-10" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        "Update password"
      )}
    </Button>
  );
}

function PasswordInput({
  name,
  id,
  placeholder,
}: {
  name: string;
  id: string;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete="new-password"
        required
        className="h-10 pr-10"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

export default function UpdatePasswordPage() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updatePasswordAction,
    {}
  );

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12 sm:px-6">
      {/* Matches the (auth) layout background */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(168deg, oklch(0.97 0.003 247) 0%, oklch(0.995 0 0) 50%, oklch(0.97 0.008 192 / 0.3) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Wordmark */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-primary">
          KUNOZ
        </h1>
        <p className="text-sm text-muted-foreground">
          Workforce Attendance Management
        </p>
      </div>

      <div className="w-full max-w-[440px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Set a new password</CardTitle>
            <CardDescription>
              Choose a strong password for your Kunoz account.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={formAction} className="flex flex-col gap-4">
              {state.error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {state.error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">New Password</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="Min 8 characters"
                />
                {state.fieldErrors?.password && (
                  <p className="text-sm text-destructive">
                    {state.fieldErrors.password[0]}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <PasswordInput
                  id="confirm_password"
                  name="confirm_password"
                  placeholder="Repeat your password"
                />
                {state.fieldErrors?.confirm_password && (
                  <p className="text-sm text-destructive">
                    {state.fieldErrors.confirm_password[0]}
                  </p>
                )}
              </div>

              <SubmitButton />
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
