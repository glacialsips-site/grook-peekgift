'use client';

import { useEffect, useRef } from 'react';

// Tiny dependency-free confetti. Fires on mount, runs ~2.5s, cleans up.
export default function Confetti({ color = '#ff5a3c' }: { color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);

    const palette = [color, '#ffd23f', '#ffffff', '#39ff14', '#e0577a'];
    const particles: any[] = Array.from({ length: 140 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight * 0.4,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 6,
      g: 0.4,
      r: 3 + Math.random() * 5,
      color: palette[Math.floor(Math.random() * palette.length)],
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.25,
      life: 0
    }));

    let raf = 0;
    const start = performance.now();
    const dur = 2400;

    function tick(now: number) {
      const t = now - start;
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - t / dur);
        ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
        ctx.restore();
      }
      if (t < dur) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [color]);

  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-50" />;
}
