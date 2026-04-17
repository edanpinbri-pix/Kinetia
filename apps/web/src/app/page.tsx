"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FeaturesCarousel } from "@/components/features-carousel/FeaturesCarousel";

const SECTIONS = ["inicio", "funciones", "ae-plugin"];

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
              {label === "ae-plugin" ? "Plugin AE" : label}
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
          <Link href="/login" className="text-sm bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-md transition-colors">
            Iniciar sesión
          </Link>
          <span className="w-px h-4 bg-surface-border hidden md:block" />
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/train" className="text-xs text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-card">
              <span className="text-zinc-600 mr-1">1.</span>Entrenar
            </Link>
            <Link href="/presets" className="text-xs text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-card">
              <span className="text-zinc-600 mr-1">2.</span>Presets
            </Link>
            <button onClick={() => scrollTo(2)} className="text-xs text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-card">
              <span className="text-zinc-600 mr-1">3.</span>Plugin AE
            </button>
          </nav>
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
          <h1 className="font-quinque text-[clamp(1.8rem,5vw,3.5rem)] tracking-tight leading-tight mb-6">
            <span className="text-white">Anima a la velocidad</span>
            <br />
            <span className="text-gradient">del pensamiento</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Sube un video de referencia. Kinetia extrae la física del movimiento,
            genera presets inteligentes y los aplica directamente en After Effects.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/train" className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors">
              Comenzar entrenamiento
            </Link>
            <button onClick={() => scrollTo(2)} className="px-6 py-3 bg-surface-card hover:bg-surface-elevated text-white border border-surface-border rounded-lg font-medium transition-colors">
              Descargar plugin AE
            </button>
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
          <div className="flex-1 text-left max-w-sm relative z-20">
            <p className="text-xs font-medium text-brand-400 uppercase tracking-widest mb-4">Funciones</p>
            <h2 className="font-quinque text-2xl text-white leading-snug mb-4">
              Todo lo que necesitas para animar mejor
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Del video de referencia al export en After Effects — Kinetia maneja todo el pipeline
              de movimiento con IA en cada paso.
            </p>
          </div>
          <div className="flex-1 flex justify-center w-full overflow-hidden">
            <FeaturesCarousel />
          </div>
        </div>
      </section>

      {/* AE Plugin */}
      <section
        id="ae-plugin"
        ref={(el) => { sectionRefs.current[2] = el; }}
        className="border-t border-surface-border px-8 py-20 min-h-[70vh] flex items-center"
      >
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-brand-400 uppercase tracking-widest mb-3">Plugin</p>
            <h2 className="font-quinque text-3xl text-white leading-snug mb-4">
              Kinetia para After Effects
            </h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              Panel nativo que sincroniza tus presets y los aplica directamente a las capas
              de tu composición — sin hornear keyframes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Download card */}
            <div className="glass rounded-2xl p-8 border border-surface-border flex flex-col gap-5">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Descarga</p>
                <h3 className="text-lg font-semibold text-white">kinetia.zxp</h3>
                <p className="text-xs text-zinc-500 mt-1">After Effects 2022 · macOS &amp; Windows</p>
              </div>

              <a
                href="https://github.com/kitifica/kinetia/releases/latest/download/kinetia.zxp"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Descargar plugin
              </a>

              <p className="text-[10px] text-zinc-600">
                Instalar con{" "}
                <a href="https://aescripts.com/zxpinstaller/" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300">
                  ZXP Installer
                </a>
                {" "}de aescripts.com
              </p>
            </div>

            {/* Install steps */}
            <div className="glass rounded-2xl p-8 border border-surface-border flex flex-col gap-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Instalación</p>
              <ol className="space-y-3">
                {[
                  { n: "1", text: "Descarga e instala ZXP Installer de aescripts.com" },
                  { n: "2", text: "Arrastra kinetia.zxp a ZXP Installer" },
                  { n: "3", text: "Reinicia After Effects" },
                  { n: "4", text: "Abre: Window → Extensions → Kinetia" },
                  { n: "5", text: "Inicia sesión con tu cuenta de Kinetia" },
                ].map((step) => (
                  <li key={step.n} className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-brand-950/60 border border-brand-900 text-brand-400 text-[10px] font-medium flex items-center justify-center shrink-0 mt-0.5">
                      {step.n}
                    </span>
                    <span className="text-sm text-zinc-400">{step.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* What it does */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: "⚡",
                title: "Sincronización en tiempo real",
                desc: "Los presets generados en la web aparecen instantáneamente en el panel de AE.",
              },
              {
                icon: "🎛️",
                title: "Nodos editables",
                desc: "Se crean sliders en el panel de Efectos: tensión, fricción, amplitud y más.",
              },
              {
                icon: "🔢",
                title: "Expresiones matemáticas",
                desc: "No keyframes. Física pura en JS que AE evalúa en tiempo real.",
              },
            ].map((item) => (
              <div key={item.title} className="glass rounded-xl p-5 border border-surface-border">
                <span className="text-2xl mb-3 block">{item.icon}</span>
                <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
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
