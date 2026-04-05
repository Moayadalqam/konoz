import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";

import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Kunoz — Pending Approval",
};

export default function PendingApprovalPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
          <Clock className="h-6 w-6 text-warning" />
        </div>
        <CardTitle className="text-xl">Account Pending Approval</CardTitle>
        <CardDescription className="max-w-[320px]">
          Your registration is being reviewed. You&apos;ll receive an email once
          approved.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-3">
        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
        <Link
          href="/login"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
