"use client";

import { useState, useEffect, useCallback } from "react";

/* ─── 8-bit SVG icons ─────────────────────────────────────── */
const IconBrain = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <rect x="4" y="0" width="2" height="2"/><rect x="8" y="0" width="2" height="2"/>
    <rect x="2" y="2" width="2" height="2"/><rect x="6" y="2" width="2" height="2"/><rect x="10" y="2" width="2" height="2"/>
    <rect x="0" y="4" width="2" height="2"/><rect x="4" y="4" width="2" height="2"/><rect x="8" y="4" width="2" height="2"/><rect x="12" y="4" width="2" height="2"/>
    <rect x="0" y="6" width="2" height="2"/><rect x="4" y="6" width="2" height="2"/><rect x="8" y="6" width="2" height="2"/><rect x="12" y="6" width="2" height="2"/>
    <rect x="2" y="8" width="4" height="2"/><rect x="8" y="8" width="4" height="2"/>
    <rect x="4" y="10" width="2" height="2"/><rect x="8" y="10" width="2" height="2"/>
    <rect x="6" y="12" width="4" height="2"/>
    <rect x="8" y="14" width="2" height="2"/>
  </svg>
);

const IconBolt = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <rect x="8" y="0" width="4" height="2"/>
    <rect x="6" y="2" width="4" height="2"/>
    <rect x="4" y="4" width="4" height="2"/>
    <rect x="2" y="6" width="8" height="2"/>
    <rect x="6" y="8" width="4" height="2"/>
    <rect x="4" y="10" width="4" height="2"/>
    <rect x="2" y="12" width="4" height="2"/>
    <rect x="0" y="14" width="4" height="2"/>
  </svg>
);

const IconCrosshair = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <rect x="6" y="0" width="4" height="2"/>
    <rect x="4" y="2" width="2" height="2"/><rect x="10" y="2" width="2" height="2"/>
    <rect x="2" y="4" width="2" height="2"/><rect x="12" y="4" width="2" height="2"/>
    <rect x="0" y="6" width="2" height="2"/><rect x="6" y="6" width="4" height="2"/><rect x="14" y="6" width="2" height="2"/>
    <rect x="0" y="8" width="2" height="2"/><rect x="6" y="8" width="4" height="2"/><rect x="14" y="8" width="2" height="2"/>
    <rect x="2" y="10" width="2" height="2"/><rect x="12" y="10" width="2" height="2"/>
    <rect x="4" y="12" width="2" height="2"/><rect x="10" y="12" width="2" height="2"/>
    <rect x="6" y="14" width="4" height="2"/>
  </svg>
);

const IconLayers = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <rect x="4" y="0" width="8" height="2"/>
    <rect x="2" y="2" width="12" height="2"/>
    <rect x="0" y="4" width="16" height="2"/>
    <rect x="4" y="8" width="8" height="2"/>
    <rect x="2" y="10" width="12" height="2"/>
    <rect x="0" y="12" width="16" height="2"/>
  </svg>
);

const IconFilm = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <rect x="0" y="0" width="2" height="16"/>
    <rect x="14" y="0" width="2" height="16"/>
    <rect x="2" y="0" width="12" height="2"/>
    <rect x="2" y="14" width="12" height="2"/>
    <rect x="2" y="2" width="2" height="3"/>
    <rect x="6" y="2" width="2" height="3"/>
    <rect x="10" y="2" width="2" height="3"/>
    <rect x="2" y="11" width="2" height="3"/>
    <rect x="6" y="11" width="2" height="3"/>
    <rect x="10" y="11" width="2" height="3"/>
    <rect x="4" y="5" width="8" height="6"/>
  </svg>
);

const IconPlug = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <rect x="4" y="0" width="2" height="4"/>
    <rect x="10" y="0" width="2" height="4"/>
    <rect x="2" y="4" width="12" height="4"/>
    <rect x="4" y="8" width="8" height="2"/>
    <rect x="6" y="10" width="4" height="2"/>
    <rect x="6" y="12" width="2" height="2"/>
    <rect x="8" y="12" width="2" height="2"/>
    <rect x="6" y="14" width="4" height="2"/>
  </svg>
);

/* ─── Feature data ────────────────────────────────────────── */
const FEATURES = [
  {
    Icon: IconBrain,
    title: "Aprende de referencias",
    description: "Sube videos MP4 — Kinetia extrae el esqueleto de movimiento con Claude Vision. Easing, velocidad, rebote — no píxeles.",
    from: "#1b1f4e",
    to: "#2c3482",
    accent: "#7f96f7",
  },
  {
    Icon: IconBolt,
    title: "Presets basados en física",
    description: "Cada preset es una descripción matemática del movimiento. Aplícalo a cualquier capa PSD y el motor de físicas hace el resto.",
    from: "#0f1117",
    to: "#1e2235",
    accent: "#5f72f0",
  },
  {
    Icon: IconCrosshair,
    title: "Control por lenguaje natural",
    description: 'Dile a Kinetia "hazlo más suave y flotante" — la IA traduce tus palabras en cambios precisos de física.',
    from: "#1b1f4e",
    to: "#3b42ca",
    accent: "#a5bcfb",
  },
  {
    Icon: IconLayers,
    title: "Mapeo inteligente de capas",
    description: "Kinetia lee la jerarquía PSD/AI y asigna automáticamente los presets según el tipo de cada capa.",
    from: "#0f1117",
    to: "#2a2f47",
    accent: "#5f72f0",
  },
  {
    Icon: IconFilm,
    title: "Export a After Effects",
    description: "Un clic genera un proyecto AE 100% editable con textos vivos, vectores editables y expresiones inyectadas.",
    from: "#1b1f4e",
    to: "#2c3482",
    accent: "#7f96f7",
  },
  {
    Icon: IconPlug,
    title: "Plugin nativo para AE",
    description: "Importa paquetes Kinetia directamente en After Effects y ajusta la física sin romper la animación.",
    from: "#0f1117",
    to: "#3b42ca",
    accent: "#a5bcfb",
  },
];

const TRANSITION = "transform 0.6s cubic-bezier(0.4,0,0.2,1), opacity 0.6s cubic-bezier(0.4,0,0.2,1), filter 0.6s cubic-bezier(0.4,0,0.2,1)";

function cardStyle(pos: number): React.CSSProperties {
  const abs = Math.abs(pos);
  if (abs === 0) return {
    transform: "translateX(0%) scale(1.08)",
    opacity: 1,
    zIndex: 10,
    filter: "blur(0px)",
    transition: TRANSITION,
  };
  if (abs === 1) return {
    transform: `translateX(${pos > 0 ? "72%" : "-72%"}) scale(0.85)`,
    opacity: 0.65,
    zIndex: 5,
    filter: "blur(2px)",
    transition: TRANSITION,
  };
  if (abs === 2) return {
    transform: `translateX(${pos > 0 ? "130%" : "-130%"}) scale(0.65)`,
    opacity: 0.25,
    zIndex: 2,
    filter: "blur(4px)",
    transition: TRANSITION,
  };
  return {
    transform: "translateX(0%) scale(0.6)",
    opacity: 0,
    zIndex: 1,
    filter: "blur(6px)",
    transition: TRANSITION,
    pointerEvents: "none",
  };
}

export function FeaturesCarousel() {
  const [active, setActive] = useState(0);
  const total = FEATURES.length;

  const next = useCallback(() => setActive((p) => (p + 1) % total), [total]);
  const prev = useCallback(() => setActive((p) => (p - 1 + total) % total), [total]);

  useEffect(() => {
    const t = setInterval(next, 3200);
    return () => clearInterval(t);
  }, [next]);

  return (
    <div className="w-full flex flex-col items-center gap-8 select-none">
      {/* Carousel */}
      <div className="relative w-full max-w-sm md:max-w-md h-72" style={{ perspective: "1000px" }}>
        {FEATURES.map((f, i) => {
          const pos = ((i - active + total) % total + total) % total;
          const signed = pos > total / 2 ? pos - total : pos;
          const style = cardStyle(signed);
          const { Icon } = f;

          return (
            <div
              key={i}
              onClick={() => setActive(i)}
              className="absolute inset-0 rounded-2xl p-7 flex flex-col justify-between cursor-pointer border border-white/10"
              style={{
                ...style,
                background: `linear-gradient(135deg, ${f.from}, ${f.to})`,
              }}
            >
              <div style={{ color: f.accent }}>
                <Icon />
              </div>
              <div>
                <h3 className="font-quinque text-base text-white mb-2 leading-snug">{f.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{f.description}</p>
              </div>

              {/* Accent line */}
              <div className="absolute bottom-0 left-6 right-6 h-px rounded-full" style={{ background: f.accent, opacity: 0.4 }} />
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border text-zinc-400 hover:text-white hover:border-brand-500 transition-colors">
          <svg viewBox="0 0 8 8" fill="currentColor" className="w-3 h-3">
            <rect x="4" y="0" width="2" height="2"/>
            <rect x="2" y="2" width="2" height="2"/>
            <rect x="0" y="3" width="2" height="2"/>
            <rect x="2" y="4" width="2" height="2"/>
            <rect x="4" y="6" width="2" height="2"/>
          </svg>
        </button>

        <div className="flex gap-2">
          {FEATURES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="transition-all duration-300"
              style={{
                width: active === i ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: active === i ? "#5f72f0" : "#2a2f47",
              }}
            />
          ))}
        </div>

        <button onClick={next} className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border text-zinc-400 hover:text-white hover:border-brand-500 transition-colors">
          <svg viewBox="0 0 8 8" fill="currentColor" className="w-3 h-3">
            <rect x="0" y="0" width="2" height="2"/>
            <rect x="2" y="2" width="2" height="2"/>
            <rect x="4" y="3" width="2" height="2"/>
            <rect x="2" y="4" width="2" height="2"/>
            <rect x="0" y="6" width="2" height="2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
