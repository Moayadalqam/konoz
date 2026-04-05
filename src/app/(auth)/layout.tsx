import type { Metadata } from "next";
import Image from "next/image";
import { LoginSlideshow } from "@/components/auth/login-slideshow";

export const metadata: Metadata = {
  title: "Kunoz — Sign In",
  description: "Access your Kunoz workforce attendance account.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh">
      {/* Slideshow background — full page */}
      <LoginSlideshow />

      {/* Content layer */}
      <div className="relative z-10 flex min-h-dvh w-full flex-col items-center justify-center px-4 py-12 sm:px-6">
        {/* Logo + brand */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <Image
            src="/images/logo.png"
            alt="Kunoz"
            width={80}
            height={96}
            priority
            className="drop-shadow-lg w-auto h-auto"
          />
          <div className="flex flex-col items-center gap-1">
            <h1
              className="font-heading text-2xl font-semibold tracking-[0.15em]"
              style={{
                background:
                  "linear-gradient(135deg, #D4A843 0%, #F0D68A 50%, #D4A843 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              KUNOZ
            </h1>
            <p className="text-xs tracking-widest uppercase text-white/50">
              Workforce Management
            </p>
          </div>
        </div>

        {/* Card container */}
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}
