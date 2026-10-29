"use client";

import { useEffect, useRef } from "react";

const colors = ["#FF9900", "#000026", "#EF765E", "#25D366", "#FFD166", "#4CC9F0"];

/**
 * Pluie de confettis (une seule fois, environ 3 secondes), dessinée sur un canevas posé au-dessus de la
 * page et transparent aux clics. Rien ne s'anime si l'utilisateur a demandé moins d'animations.
 */
export function Confetti({ pieces = 160, durationMs = 3200 }: { pieces?: number; durationMs?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ratio = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const width = window.innerWidth;
    const particles = Array.from({ length: pieces }, (_, index) => ({
      // Deux canons, en bas à gauche et à droite, qui tirent vers le centre.
      x: index % 2 ? width * 0.15 : width * 0.85,
      y: window.innerHeight * 0.75,
      vx: (index % 2 ? 1 : -1) * (2 + Math.random() * 7),
      vy: -(9 + Math.random() * 9),
      size: 6 + Math.random() * 6,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: colors[index % colors.length],
      round: Math.random() < 0.3,
    }));

    const start = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const elapsed = now - start;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - durationMs * 0.7) / (durationMs * 0.3));
      for (const particle of particles) {
        particle.vy += 0.32;
        particle.vx *= 0.99;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.spin;
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.fillStyle = particle.color;
        if (particle.round) {
          context.beginPath();
          context.arc(0, 0, particle.size / 2.4, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
        }
        context.restore();
      }
      if (elapsed < durationMs) frame = requestAnimationFrame(draw);
      else context.clearRect(0, 0, canvas.width, canvas.height);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [pieces, durationMs]);

  return <canvas aria-hidden="true" className="confetti-canvas" ref={ref} />;
}
