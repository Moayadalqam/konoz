import type { Metadata } from "next";

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
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12 sm:px-6">
      {/* Subtle background — warm slate gradient, NOT blue-purple */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(168deg, oklch(0.97 0.003 247) 0%, oklch(0.995 0 0) 50%, oklch(0.97 0.008 192 / 0.3) 100%)",
        }}
      />

      {/* Faint grid texture for depth */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Wordmark */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <h1
          className="font-heading text-3xl font-bold tracking-tight text-primary"
          aria-label="Kunoz"
        >
          KUNOZ
        </h1>
        <p className="text-sm text-muted-foreground">
          Workforce Attendance Management
        </p>
      </div>

      {/* Card container */}
      <div className="w-full max-w-[440px]">{children}</div>
    </div>
  );
}
