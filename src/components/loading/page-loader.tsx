"use client";

import Image from "next/image";

export function PageLoader() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Logo with pulse */}
        <div className="animate-pulse">
          <Image
            src="/images/logo.png"
            alt="Loading"
            width={48}
            height={56}
            className="opacity-60 w-auto h-auto"
          />
        </div>
        {/* Gold bar animation */}
        <div className="relative h-0.5 w-16 overflow-hidden rounded-full bg-primary/10">
          <div
            className="absolute inset-y-0 left-0 w-1/2 rounded-full animate-loading-bar"
            style={{
              background: "linear-gradient(90deg, transparent, #D4A843, transparent)",
            }}
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes loadingBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-loading-bar {
          animation: loadingBar 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
