"use client";

import { useEffect, useRef } from "react";
import type { Mood } from "@/lib/mood";

const L = { x: 72, y: 112 };
const R = { x: 128, y: 112 };

function Eyes({ mood }: { mood: Mood }) {
  const stroke = { stroke: "#fff", strokeWidth: 8, strokeLinecap: "round" as const, fill: "none" };
  switch (mood) {
    case "happy":
      return (
        <g className="eyes-static">
          <path d="M-11 5 Q0 -9 11 5" transform={`translate(${L.x} ${L.y})`} {...stroke} />
          <path d="M-11 5 Q0 -9 11 5" transform={`translate(${R.x} ${R.y})`} {...stroke} />
        </g>
      );
    case "sad":
      return (
        <g className="eyes-static">
          <path d="M-10 6 L10 -5" transform={`translate(${L.x} ${L.y})`} {...stroke} />
          <path d="M-10 -5 L10 6" transform={`translate(${R.x} ${R.y})`} {...stroke} />
          <path className="tear" d="M0 0 C-4 6 -4 10 0 10 C4 10 4 6 0 0Z" transform={`translate(${L.x + 4} ${L.y + 14})`} fill="#fff" />
        </g>
      );
    case "angry":
      return (
        <g className="eyes-static">
          <path d="M-11 -6 L11 5" transform={`translate(${L.x} ${L.y})`} {...stroke} />
          <path d="M-11 5 L11 -6" transform={`translate(${R.x} ${R.y})`} {...stroke} />
        </g>
      );
    case "surprised":
      return (
        <g className="eyes-static">
          <circle cx={L.x} cy={L.y} r="10" fill="#fff" />
          <circle cx={R.x} cy={R.y} r="10" fill="#fff" />
        </g>
      );
    case "sleepy":
      return (
        <g className="eyes-static">
          <path d="M-11 0 H11" transform={`translate(${L.x} ${L.y})`} {...stroke} />
          <path d="M-11 0 H11" transform={`translate(${R.x} ${R.y})`} {...stroke} />
          <text className="zzz" x="150" y="78" fill="#999" fontSize="22" fontWeight="700">z</text>
          <text className="zzz z2" x="164" y="62" fill="#bbb" fontSize="16" fontWeight="700">z</text>
        </g>
      );
    default:
      return (
        <g className="eyes-blink">
          <rect x={L.x - 7} y={L.y - 15} width="14" height="30" rx="7" fill="#fff" />
          <rect x={R.x - 7} y={R.y - 15} width="14" height="30" rx="7" fill="#fff" />
        </g>
      );
  }
}

export function Mascot({
  mood, size = 170, bump = 0,
}: { mood: Mood; size?: number; bump?: number }) {
  const ref = useRef<SVGSVGElement>(null);

  // olhos/rosto seguem o dedo ou o cursor
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        el.style.setProperty("--fx", `${Math.max(-1, Math.min(1, dx * 2.2)) * 7}px`);
        el.style.setProperty("--fy", `${Math.max(-1, Math.min(1, dy * 2.2)) * 5}px`);
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, []);

  return (
    <svg
      ref={ref}
      key={bump}
      className={`mascot mood-${mood} ${bump ? "hop" : ""}`}
      width={size}
      height={size * 0.93}
      viewBox="0 0 200 186"
      role="img"
      aria-label={`Mascote ${mood}`}
    >
      <g className="m-body">
        <path className="ear ear-l" d="M44 66 C38 40 46 20 58 18 C70 18 84 36 90 48 Z" fill="#111" />
        <path className="ear ear-r" d="M156 66 C162 40 154 20 142 18 C130 18 116 36 110 48 Z" fill="#111" />
        <path d="M100 40 C152 36 188 72 188 114 C188 152 152 176 100 176 C48 176 12 152 12 114 C12 72 48 36 100 40 Z" fill="#111" />
        <g className="face">
          <Eyes mood={mood} />
        </g>
      </g>
    </svg>
  );
}
