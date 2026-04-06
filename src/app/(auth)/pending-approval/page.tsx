import type { Metadata } from "next";
import { Clock } from "lucide-react";

import { signOutAction } from "@/actions/auth";

export const metadata: Metadata = {
  title: "Kunoz — Pending Approval",
};

export default function PendingApprovalPage() {
  return (
    <div className="rounded-xl bg-card ring-1 ring-border p-8 shadow-sm text-center">
      <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15">
        <Clock className="h-6 w-6 text-accent-foreground" />
      </div>
      <h2 className="font-heading text-xl font-semibold text-foreground">
        Account Pending Approval
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-[320px] mx-auto">
        Your registration is being reviewed. You&apos;ll receive an email once approved.
      </p>
      <div className="mt-6">
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-muted px-6 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
