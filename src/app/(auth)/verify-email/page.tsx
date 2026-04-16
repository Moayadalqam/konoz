"use client";

import Link from "next/link";
import { Mail } from "lucide-react";

export default function VerifyEmailPage() {
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
        We sent a verification link to your email. Click the link to activate your account.
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
