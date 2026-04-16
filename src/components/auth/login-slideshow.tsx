"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

const slides = [
  "/images/slideshow/slide-1.jpg",
  "/images/slideshow/slide-2.png",
  "/images/slideshow/slide-3.jpeg",
];

export function LoginSlideshow() {
  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState(1);
  const [transitioning, setTransitioning] = useState(false);

  const advance = useCallback(() => {
    const nextIndex = (current + 1) % slides.length;
    setNext(nextIndex);
    setTransitioning(true);

    const timer = setTimeout(() => {
      setCurrent(nextIndex);
      setTransitioning(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [current]);

  useEffect(() => {
    const interval = setInterval(advance, 5000);
    return () => clearInterval(interval);
  }, [advance]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Current slide */}
      <Image
        src={slides[current]}
        alt=""
        fill
        className="object-cover"
        priority={current === 0}
        sizes="100vw"
      />

      {/* Next slide (fades in on top) */}
      {transitioning && (
        <Image
          src={slides[next]}
          alt=""
          fill
          className="object-cover animate-slideshow-fade"
          sizes="100vw"
        />
      )}

      {/* Subtle Ken Burns zoom on current */}
      <style jsx global>{`
        @keyframes slideshowFade {
          0% {
            opacity: 0;
            transform: scale(1.04);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-slideshow-fade {
          animation: slideshowFade 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(13,5,8,0.82) 0%, rgba(26,10,16,0.7) 40%, rgba(13,5,8,0.85) 100%)",
        }}
      />

      {/* Subtle crimson vignette */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(184,22,58,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Bottom dots indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all duration-500"
            style={{
              width: i === current ? "24px" : "8px",
              backgroundColor:
                i === current ? "#D4A843" : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
