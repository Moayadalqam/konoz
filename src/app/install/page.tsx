"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

const ACCESS_CODE = "516278";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Phase = "code" | "welcome" | "ready";

export default function InstallPage() {
  const [phase, setPhase] = useState<Phase>("code");
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Capture install prompt
  useEffect(() => {
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !("MSStream" in window);
    setIsIOS(ios);

    if (!ios) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (code === ACCESS_CODE) {
        setError(false);
        setPhase("welcome");
        // Transition to ready after 2.5s
        setTimeout(() => setPhase("ready"), 2500);
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    },
    [code]
  );

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 30% 40%, #1a0a10 0%, #0d0508 60%, #000 100%)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/3 h-96 w-96 rounded-full opacity-10 blur-3xl"
        style={{ backgroundColor: "#B8163A" }}
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full opacity-8 blur-3xl"
        style={{ backgroundColor: "#D4A843" }}
      />

      {/* ───────── CODE ENTRY ───────── */}
      {phase === "code" && (
        <div className="relative z-10 flex flex-col items-center gap-8 px-6 animate-in fade-in duration-500">
          {/* Logo */}
          <Image
            src="/images/logo.png"
            alt="Konouz"
            width={90}
            height={108}
            priority
            className="drop-shadow-lg w-auto h-auto"
          />

          {/* Title */}
          <div className="text-center space-y-2">
            <h1
              className="font-heading text-2xl font-semibold tracking-[0.12em]"
              style={{
                background:
                  "linear-gradient(135deg, #D4A843 0%, #F0D68A 50%, #D4A843 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              KONOUZ SUITE
            </h1>
            <p className="text-xs tracking-widest uppercase text-white/35">
              Enter your access code
            </p>
          </div>

          {/* Code form */}
          <form onSubmit={handleSubmit} className="w-full max-w-[280px] space-y-4">
            <div className={shake ? "animate-shake" : ""}>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ""));
                  setError(false);
                }}
                placeholder="------"
                autoFocus
                className={`w-full h-14 rounded-xl border text-center text-2xl font-mono tracking-[0.5em] bg-white/5 backdrop-blur-sm text-white placeholder:text-white/15 focus:outline-none transition-colors ${
                  error
                    ? "border-red-500/50 focus:border-red-500/70 focus:ring-1 focus:ring-red-500/30"
                    : "border-white/10 focus:border-[#D4A843]/50 focus:ring-1 focus:ring-[#D4A843]/30"
                }`}
              />
              {error && (
                <p className="mt-2 text-center text-xs text-red-400">
                  Invalid code. Please try again.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={code.length < 6}
              className="group relative w-full h-12 rounded-xl font-medium text-sm tracking-wide uppercase overflow-hidden transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #B8163A 0%, #8B1030 100%)",
                color: "#fff",
              }}
            >
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                background: "linear-gradient(135deg, #C92040 0%, #B8163A 100%)",
              }} />
              <span className="relative">Verify</span>
            </button>
          </form>

          {/* Gold line */}
          <div
            className="h-px w-16"
            style={{
              background:
                "linear-gradient(90deg, transparent, #D4A843, transparent)",
            }}
          />
        </div>
      )}

      {/* ───────── WELCOME + LOADING ───────── */}
      {phase === "welcome" && (
        <div className="relative z-10 flex flex-col items-center gap-8 px-6 animate-in fade-in duration-700">
          {/* Logo pulse */}
          <div className="welcome-logo-pulse">
            <Image
              src="/images/logo.png"
              alt="Konouz"
              width={80}
              height={96}
              className="drop-shadow-2xl w-auto h-auto"
            />
          </div>

          {/* Welcome text */}
          <div className="welcome-text-fade text-center space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-white/40">
              Welcome
            </p>
            <h2
              className="font-heading text-3xl sm:text-4xl font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, #D4A843 0%, #F0D68A 40%, #D4A843 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Mr. Moawia
            </h2>
          </div>

          {/* Loading bar */}
          <div className="welcome-bar-fade w-48">
            <div className="relative h-0.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="absolute inset-y-0 left-0 rounded-full animate-install-loading"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #D4A843, transparent)",
                  width: "40%",
                }}
              />
            </div>
            <p className="mt-3 text-center text-[10px] uppercase tracking-[0.3em] text-white/25">
              Preparing your suite
            </p>
          </div>
        </div>
      )}

      {/* ───────── DOWNLOAD READY ───────── */}
      {phase === "ready" && (
        <div className="relative z-10 flex flex-col items-center gap-10 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Logo with ™ */}
          <div className="relative">
            <Image
              src="/images/logo.png"
              alt="Konouz"
              width={100}
              height={120}
              className="drop-shadow-2xl w-auto h-auto"
            />
            <span
              className="absolute -top-1 -right-5 text-xs font-medium"
              style={{ color: "#D4A843" }}
            >
              ™
            </span>
          </div>

          {/* Brand name */}
          <div className="text-center space-y-1">
            <h2
              className="font-heading text-xl font-semibold tracking-[0.15em]"
              style={{
                background:
                  "linear-gradient(135deg, #D4A843 0%, #F0D68A 50%, #D4A843 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              KONOUZ SUITE™
            </h2>
            <p className="text-xs text-white/30">Workforce Management</p>
          </div>

          {/* Download button */}
          {isIOS ? (
            <div className="w-full max-w-xs space-y-4">
              <button
                onClick={() => {
                  // On iOS, guide user through Share > Add to Home Screen
                  alert(
                    "Tap the Share button (□↑) at the bottom of Safari, then tap \"Add to Home Screen\""
                  );
                }}
                className="group relative w-full h-14 rounded-2xl font-medium text-sm tracking-wide overflow-hidden transition-all duration-500 active:scale-[0.98]"
                style={{
                  background:
                    "linear-gradient(135deg, #B8163A 0%, #8B1030 100%)",
                  color: "#fff",
                  boxShadow: "0 0 40px rgba(184,22,58,0.3)",
                }}
              >
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background:
                      "linear-gradient(135deg, #C92040 0%, #B8163A 100%)",
                  }}
                />
                <span className="relative flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Press Here to Download
                </span>
              </button>

              {/* iOS instructions */}
              <div className="rounded-xl border border-white/8 bg-white/5 backdrop-blur-sm p-4">
                <p className="text-xs text-white/50 text-center leading-relaxed">
                  Tap <strong className="text-white/70">Share</strong> (□↑) at
                  the bottom of Safari, then select{" "}
                  <strong className="text-white/70">
                    &quot;Add to Home Screen&quot;
                  </strong>
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleInstall}
              disabled={!deferredPrompt}
              className="group relative w-full max-w-xs h-14 rounded-2xl font-medium text-sm tracking-wide overflow-hidden transition-all duration-500 active:scale-[0.98] disabled:opacity-40"
              style={{
                background:
                  "linear-gradient(135deg, #B8163A 0%, #8B1030 100%)",
                color: "#fff",
                boxShadow: "0 0 40px rgba(184,22,58,0.3)",
              }}
            >
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "linear-gradient(135deg, #C92040 0%, #B8163A 100%)",
                }}
              />
              <span className="relative flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Press Here to Download
              </span>
            </button>
          )}

          {/* Gold line */}
          <div
            className="h-px w-20"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(212,168,67,0.3), transparent)",
            }}
          />

          <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">
            Konouz Suite™ — All Rights Reserved
          </p>
        </div>
      )}

      {/* Animations */}
      <style jsx global>{`
        @keyframes installLoading {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(350%);
          }
        }
        .animate-install-loading {
          animation: installLoading 1.2s ease-in-out infinite;
        }

        @keyframes welcomeLogoPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.9;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }
        .welcome-logo-pulse {
          animation: welcomeLogoPulse 1.5s ease-in-out infinite;
        }

        .welcome-text-fade {
          opacity: 0;
          animation: fadeSlideUp 0.8s ease-out 0.3s forwards;
        }
        .welcome-bar-fade {
          opacity: 0;
          animation: fadeSlideUp 0.6s ease-out 0.8s forwards;
        }

        @keyframes fadeSlideUp {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(-8px);
          }
          40% {
            transform: translateX(8px);
          }
          60% {
            transform: translateX(-6px);
          }
          80% {
            transform: translateX(6px);
          }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
