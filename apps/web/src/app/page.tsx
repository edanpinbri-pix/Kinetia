"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FeaturesCarousel } from "@/components/features-carousel/FeaturesCarousel";

const SECTIONS = ["inicio", "funciones", "estudio"];

export default function HomePage() {
  const [active, setActive] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observers = sectionRefs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(i); },
        { threshold: 0.5 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  function scrollTo(i: number) {
    sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-surface-border px-8 py-4 flex items-center justify-between sticky top-0 z-50 bg-surface/90 backdrop-blur-md">
        <span className="font-quinque text-xl text-gradient">Kinetia</span>

        {/* Section arrows */}
        <div className="flex items-center gap-1">
          {SECTIONS.map((label, i) => (
            <button
              key={label}
              onClick={() => scrollTo(i)}
              className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors
                ${active === i
                  ? "text-white bg-surface-card border border-surface-border"
                  : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {label}
            </button>
          ))}
          <span className="w-px h-4 bg-surface-border mx-2" />
          <button onClick={() => scrollTo(Math.max(0, active - 1))} disabled={active === 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-surface-border text-zinc-500 hover:text-white disabled:opacity-30 transition-colors">
            <svg viewBox="0 0 6 10" fill="currentColor" className="w-2 h-2.5">
              <rect x="3" y="0" width="2" height="2"/><rect x="1" y="2" width="2" height="2"/>
              <rect x="0" y="4" width="2" height="2"/><rect x="1" y="6" width="2" height="2"/>
              <rect x="3" y="8" width="2" height="2"/>
            </svg>
          </button>
          <button onClick={() => scrollTo(Math.min(SECTIONS.length - 1, active + 1))} disabled={active === SECTIONS.length - 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-surface-border text-zinc-500 hover:text-white disabled:opacity-30 transition-colors">
            <svg viewBox="0 0 6 10" fill="currentColor" className="w-2 h-2.5">
              <rect x="0" y="0" width="2" height="2"/><rect x="2" y="2" width="2" height="2"/>
              <rect x="4" y="4" width="2" height="2"/><rect x="2" y="6" width="2" height="2"/>
              <rect x="0" y="8" width="2" height="2"/>
            </svg>
          </button>
        </div>

        <div className="flex gap-3 items-center">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">Iniciar sesión</Link>
          <Link href="/projects" className="text-sm bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-md transition-colors">Abrir Studio</Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        id="inicio"
        ref={(el) => { sectionRefs.current[0] = el; }}
        className="flex-1 flex flex-col items-center justify-center text-center px-8 py-24 min-h-screen"
      >
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-brand-400 bg-brand-950/50 border border-brand-900 rounded-full px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-slow" />
            Diseño de movimiento con IA
          </div>
          <h1 className="font-quinque text-5xl md:text-7xl tracking-tight leading-none mb-6">
            <span className="text-white">Anima</span>{" "}
            <span className="text-gradient">a la velocidad</span>
            <br />
            <span className="text-white">del pensamiento</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Sube videos de referencia. Kinetia aprende tu estilo de movimiento, genera presets
            inteligentes y exporta un proyecto 100% editable a After Effects.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/train" className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors">
              Comenzar entrenamiento
            </Link>
            <Link href="/presets" className="px-6 py-3 bg-surface-card hover:bg-surface-elevated text-white border border-surface-border rounded-lg font-medium transition-colors">
              Ver presets
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="funciones"
        ref={(el) => { sectionRefs.current[1] = el; }}
        className="border-t border-surface-border px-8 py-20 min-h-screen flex items-center"
      >
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16 w-full">
          <div className="flex-1 text-left max-w-sm">
            <p className="text-xs font-medium text-brand-400 uppercase tracking-widest mb-4">Funciones</p>
            <h2 className="font-quinque text-2xl text-white leading-snug mb-4">
              Todo lo que necesitas para animar mejor
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Del video de referencia al export en After Effects — Kinetia maneja todo el pipeline de movimiento con IA en cada paso.
            </p>
          </div>
          <div className="flex-1 flex justify-center w-full">
            <FeaturesCarousel />
          </div>
        </div>
      </section>

      {/* Studio CTA */}
      <section
        id="estudio"
        ref={(el) => { sectionRefs.current[2] = el; }}
        className="border-t border-surface-border px-8 py-20 min-h-[60vh] flex items-center justify-center"
      >
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <p className="text-xs font-medium text-brand-400 uppercase tracking-widest">Studio</p>
          <h2 className="font-quinque text-3xl text-white leading-snug">
            Listo para crear?
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
            Crea tu cuenta y empieza a entrenar Kinetia con tus propios videos de referencia.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors">
              Crear cuenta gratis
            </Link>
            <Link href="/login" className="px-6 py-3 bg-surface-card hover:bg-surface-elevated text-white border border-surface-border rounded-lg font-medium transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="font-quinque text-sm text-gradient">Kinetia</span>
        <p className="text-xs text-zinc-500 text-center">
          Herramienta diseñada por equipo de multimedia{" "}
          <Image
            src="/elaniin.svg"
            alt="elaniin"
            width={56}
            height={16}
            className="inline-block align-middle mx-1 opacity-70"
          />
          · Todos los derechos reservados 2026
        </p>
        <div className="flex gap-4 text-xs text-zinc-600">
          <Link href="/presets" className="hover:text-zinc-400 transition-colors">Presets</Link>
          <Link href="/train"   className="hover:text-zinc-400 transition-colors">Entrenar</Link>
          <Link href="/login"   className="hover:text-zinc-400 transition-colors">Acceder</Link>
        </div>
      </footer>
    </main>
  );
}
