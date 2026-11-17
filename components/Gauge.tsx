"use client";

import { Mascot } from "./Mascot";
import type { Mood } from "@/lib/mood";

const R = 128;
const C = 150;
const START = 145; // graus, sentido horário a partir de +x
const SWEEP = 250;

function pt(deg: number) {
  const a = (deg * Math.PI) / 180;
  return [C + R * Math.cos(a), C + R * Math.sin(a)];
}
const [x1, y1] = pt(START);
const [x2, y2] = pt(START + SWEEP);
const ARC = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 1 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;

/** remaining: fração restante do teto (0..1). */
export function Gauge({ remaining, over, mood, bump }: { remaining: number; over: boolean; mood: Mood; bump: number }) {
  const v = Math.max(0, Math.min(1, remaining));
  return (
    <div className="gauge">
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <path d={ARC} className="g-track" pathLength={100} />
        <path d={ARC} className={`g-bar ${over ? "over" : ""}`} pathLength={100}
          strokeDasharray={`${over ? 100 : v * 100} 100`} />
      </svg>
      <div className="gauge-mascot">
        <Mascot mood={mood} bump={bump} size={168} />
      </div>
    </div>
  );
}
