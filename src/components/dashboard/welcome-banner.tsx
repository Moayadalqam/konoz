"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeBannerProps {
  name: string;
  role: string;
  message: string;
}

export function WelcomeBanner({ name, message }: WelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "relative rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent",
        "border border-primary/20 p-4 md:p-5",
        "animate-in fade-in slide-in-from-bottom-2 duration-500"
      )}
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <p className="font-heading text-lg font-semibold text-foreground">
        Welcome back, {name}
      </p>
      <p className="mt-1 text-sm text-muted-foreground pr-8">{message}</p>
    </div>
  );
}
