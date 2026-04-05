"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"splash" | "exit" | "done">("splash");

  useEffect(() => {
    // Check if splash was already shown this session
    if (sessionStorage.getItem("kunoz-splash-shown")) {
      setPhase("done");
      return;
    }

    // Show splash for 3 seconds, then fade out
    const timer = setTimeout(() => {
      setPhase("exit");
      sessionStorage.setItem("kunoz-splash-shown", "1");
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase === "exit") {
      const timer = setTimeout(() => setPhase("done"), 500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  if (phase === "done") return <>{children}</>;

  return (
    <>
      {/* Splash overlay */}
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
          phase === "exit" ? "opacity-0" : "opacity-100"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at center, #1a0a10 0%, #0d0508 100%)",
        }}
      >
        {/* Crimson glow behind logo */}
        <div
          className="absolute w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: "#B8163A" }}
        />

        {/* Logo container with animation */}
        <div className="relative flex flex-col items-center gap-6">
          {/* Logo with brush reveal */}
          <div className="splash-logo-reveal relative">
            <Image
              src="/images/logo.png"
              alt="Kunoz"
              width={200}
              height={240}
              priority
              className="drop-shadow-2xl w-auto h-auto"
            />
          </div>

          {/* Brand name fades in after logo */}
          <div className="splash-text-reveal">
            <h1
              className="font-heading text-2xl font-light tracking-[0.3em] uppercase"
              style={{
                background: "linear-gradient(135deg, #D4A843 0%, #F0D68A 50%, #D4A843 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              KUNOZ
            </h1>
          </div>

          {/* Subtle gold line */}
          <div className="splash-line-reveal">
            <div
              className="h-px w-24"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, #D4A843 50%, transparent 100%)",
              }}
            />
          </div>
        </div>
      </div>

      {/* App content hidden behind splash */}
      <div className="invisible">{children}</div>

      <style jsx global>{`
        @keyframes splashLogoReveal {
          0% {
            opacity: 0;
            filter: blur(20px);
            transform: scale(0.8);
          }
          40% {
            opacity: 0.6;
            filter: blur(8px);
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            filter: blur(0);
            transform: scale(1);
          }
        }

        @keyframes splashTextReveal {
          0% {
            opacity: 0;
            letter-spacing: 0.8em;
          }
          100% {
            opacity: 1;
            letter-spacing: 0.3em;
          }
        }

        @keyframes splashLineReveal {
          0% {
            opacity: 0;
            transform: scaleX(0);
          }
          100% {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        .splash-logo-reveal {
          animation: splashLogoReveal 1.8s cubic-bezier(0.16, 1, 0.3, 1)
            forwards;
        }

        .splash-text-reveal {
          opacity: 0;
          animation: splashTextReveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) 1s
            forwards;
        }

        .splash-line-reveal {
          opacity: 0;
          animation: splashLineReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.6s
            forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .splash-logo-reveal,
          .splash-text-reveal,
          .splash-line-reveal {
            animation: none;
            opacity: 1;
            filter: none;
            transform: none;
          }
        }
      `}</style>
    </>
  );
}
