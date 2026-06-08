"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    const failsafe = setTimeout(() => setShown(true), 1100);
    return () => {
      io.disconnect();
      clearTimeout(failsafe);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(20px)",
        transition: `opacity .8s var(--peek-ease-reveal, cubic-bezier(.2,.7,.2,1)) ${delay}ms, transform .8s var(--peek-ease-reveal, cubic-bezier(.2,.7,.2,1)) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
