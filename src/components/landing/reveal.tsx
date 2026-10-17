"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

type RevealProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  id?: string;
};

/** Fait apparaître un élément (fondu + flou) quand il entre à l'écran. Le style est dans landing.css (.lp-reveal). */
export function Reveal({ as: Tag = "div", children, className = "", id }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag className={`lp-reveal ${className}`.trim()} id={id} ref={ref}>
      {children}
    </Tag>
  );
}
