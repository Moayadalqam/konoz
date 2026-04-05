"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function WelcomeOverlay({ name, role }: { name: string; role: string }) {
  const [phase, setPhase] = useState<"show" | "exit" | "done">("done");

  useEffect(() => {
    const key = `kunoz-welcome-${Date.now().toString().slice(0, -5)}`;
    if (sessionStorage.getItem("kunoz-welcome-shown")) {
      return;
    }
    sessionStorage.setItem("kunoz-welcome-shown", "1");
    setPhase("show");

    const exitTimer = setTimeout(() => setPhase("exit"), 2200);
    const doneTimer = setTimeout(() => setPhase("done"), 2800);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  const firstName = name.split(" ")[0];
  const roleLabel =
    role === "admin"
      ? "Administrator"
      : role === "hr_officer"
      ? "HR Officer"
      : role === "supervisor"
      ? "Supervisor"
      : "Employee";

  return (
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center transition-opacity duration-600 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(13,5,8,0.95) 0%, rgba(0,0,0,0.98) 100%)",
      }}
    >
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Logo */}
        <div className="welcome-logo-enter">
          <Image
            src="/images/logo.png"
            alt="Kunoz"
            width={64}
            height={76}
            className="opacity-80 w-auto h-auto"
          />
        </div>

        {/* Welcome text */}
        <div className="welcome-text-enter space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-white/40">
            Welcome back
          </p>
          <h2
            className="font-heading text-3xl font-semibold"
            style={{
              background:
                "linear-gradient(135deg, #D4A843 0%, #F0D68A 50%, #D4A843 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {firstName}
          </h2>
          <p className="text-xs uppercase tracking-widest text-white/30">
            {roleLabel}
          </p>
        </div>

        {/* Gold line */}
        <div className="welcome-line-enter">
          <div
            className="h-px w-20"
            style={{
              background:
                "linear-gradient(90deg, transparent, #D4A843, transparent)",
            }}
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes welcomeLogoEnter {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 0.8;
            transform: translateY(0);
          }
        }
        @keyframes welcomeTextEnter {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes welcomeLineEnter {
          0% {
            opacity: 0;
            transform: scaleX(0);
          }
          100% {
            opacity: 1;
            transform: scaleX(1);
          }
        }
        .welcome-logo-enter {
          animation: welcomeLogoEnter 0.6s ease-out forwards;
        }
        .welcome-text-enter {
          opacity: 0;
          animation: welcomeTextEnter 0.6s ease-out 0.3s forwards;
        }
        .welcome-line-enter {
          opacity: 0;
          animation: welcomeLineEnter 0.5s ease-out 0.7s forwards;
        }
      `}</style>
    </div>
  );
}
