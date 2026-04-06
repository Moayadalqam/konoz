import type { Metadata } from "next";
import Image from "next/image";

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
    <div className="relative flex min-h-dvh flex-col bg-background">
      {/* Crimson top accent bar */}
      <div className="h-1 w-full bg-primary" />

      {/* Content layer */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        {/* Logo + brand */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <Image
            src="/images/logo.png"
            alt="Kunoz"
            width={80}
            height={96}
            priority
            className="w-auto h-auto"
          />
          <div className="flex flex-col items-center gap-1">
            <h1 className="font-heading text-2xl font-semibold tracking-[0.15em] text-primary">
              KUNOZ
            </h1>
            <p className="text-xs tracking-widest uppercase text-muted-foreground">
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
