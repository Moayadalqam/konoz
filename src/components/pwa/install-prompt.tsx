"use client";

import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "kunoz-install-dismissed";
const VISIT_KEY = "kunoz-visit-count";

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed or dismissed
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    if (isStandalone) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Visit counting
    const visits =
      parseInt(localStorage.getItem(VISIT_KEY) || "0", 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));
    if (visits < 2) return;

    // iOS detection
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !("MSStream" in window);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: initialize platform detection state on mount
    setIsIOS(ios);
    if (ios) {
      setShow(true);
      return;
    }

    // Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 inset-x-4 z-50 md:bottom-6 md:left-auto md:right-6 md:max-w-sm",
        "rounded-xl border border-border bg-card p-4 shadow-xl",
        "animate-in slide-in-from-bottom-4 fade-in duration-300"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          {isIOS ? (
            <Share className="size-5 text-primary" />
          ) : (
            <Download className="size-5 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm font-semibold text-foreground">
            Install Kunoz
          </p>
          {isIOS ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap <Share className="inline size-3" /> Share, then &ldquo;Add
              to Home Screen&rdquo;
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Install for quick access and offline use
            </p>
          )}

          {!isIOS && (
            <button
              onClick={handleInstall}
              className={cn(
                "mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground",
                "hover:bg-primary/90 transition-colors"
              )}
            >
              Install App
            </button>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
