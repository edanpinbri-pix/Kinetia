"use client";

import { useEffect, useRef } from "react";
import type { PhysicsConfig } from "@kinetia/shared-types";

interface Props {
  physics: PhysicsConfig;
  layerName: string;
}

/** Spring simulation: returns y positions from 0→1 (offscreen→final) */
function simulateSpring(physics: PhysicsConfig, frames = 90): number[] {
  const stiffness = physics.tension * 300 + 30;
  const damping = physics.friction * 30 + 3;
  const mass = Math.max(0.1, physics.mass);

  let pos = 0;
  let vel = 0;
  const dt = 1 / 60;
  const result: number[] = [];

  for (let i = 0; i < frames; i++) {
    const force = stiffness * (1 - pos) - damping * vel;
    vel += (force / mass) * dt;
    vel *= (1 - physics.velocityDecay * 0.05);
    // bounciness: add oscillation overshoot
    if (physics.bounciness > 0 && pos > 1 && vel < 0) {
      vel *= -(physics.bounciness * 0.8);
    }
    pos += vel * dt;
    result.push(Math.min(Math.max(pos, -0.2), 1.5));
  }
  return result;
}

export function AnimationPreview({ physics, layerName }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const framesRef = useRef<number[]>([]);
  const frameIdxRef = useRef(0);

  useEffect(() => {
    framesRef.current = simulateSpring(physics);
    frameIdxRef.current = 0;

    function tick() {
      const el = boxRef.current;
      if (!el) return;

      const frames = framesRef.current;
      const idx = frameIdxRef.current;

      if (idx < frames.length) {
        const progress = frames[idx]!;
        // Animate from bottom: translateY(60px → 0px), opacity 0→1
        const translateY = (1 - progress) * 60;
        const opacity = Math.min(1, progress * 2);
        el.style.transform = `translateY(${translateY}px)`;
        el.style.opacity = String(opacity);
        frameIdxRef.current++;
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Loop after short pause
        setTimeout(() => {
          frameIdxRef.current = 0;
          rafRef.current = requestAnimationFrame(tick);
        }, 1200);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [physics]);

  return (
    <div className="relative w-full h-32 bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center border border-surface-border">
      {/* Grid dots background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #444 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      />
      {/* Animated element */}
      <div
        ref={boxRef}
        className="relative z-10 px-5 py-2.5 rounded-lg bg-brand-600/90 border border-brand-500/50 shadow-lg shadow-brand-900/40"
        style={{ opacity: 0, transform: "translateY(60px)", willChange: "transform, opacity" }}
      >
        <span className="text-white text-sm font-medium tracking-wide">{layerName}</span>
      </div>
    </div>
  );
}
