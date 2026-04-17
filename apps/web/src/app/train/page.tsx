"use client";

export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppHeader } from "@/components/app-header/AppHeader";

type FlowStatus = "idle" | "extracting" | "analyzing" | "done" | "error";

// ─── Extract frames from video ────────────────────────────────────────────────
async function extractFrames(file: File, maxFrames = 12): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const frames: string[] = [];

    video.src = URL.createObjectURL(file);
    video.muted = true;

    video.onloadedmetadata = () => {
      canvas.width  = Math.min(video.videoWidth, 640);
      canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
      const interval = video.duration / maxFrames;
      let i = 0;

      function seekNext() {
        if (i >= maxFrames) { URL.revokeObjectURL(video.src); resolve(frames); return; }
        video.currentTime = i * interval;
        i++;
      }
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1]!;
        if (b64.length > 100) frames.push(b64);
        seekNext();
      };
      seekNext();
    };
    video.onerror = reject;
    video.load();
  });
}

// ─── Train Page ───────────────────────────────────────────────────────────────
export default function TrainPage() {
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [presetName, setPresetName] = useState("");
  const [isolationPrompt, setIsolationPrompt] = useState("");
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !isolationPrompt.trim()) return;

    setStatus("extracting");
    setProgress(0);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión");

      // 1. Create physics_preset row in processing state
      const { data: preset, error: insertErr } = await supabase
        .from("physics_presets")
        .insert({
          user_id: user.id,
          name: presetName.trim() || "Preset sin nombre",
          isolation_prompt: isolationPrompt.trim(),
          video_url: file.name,
          status: "processing",
          expression_template: "",
          physics: {},
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      setProgress(15);

      // 2. Extract frames client-side
      const frames = await extractFrames(file, 12);
      if (!frames.length) throw new Error("No se pudieron extraer frames del video");
      setProgress(35);
      setStatus("analyzing");

      // 3. Subscribe to realtime updates on the preset row
      const channel = supabase
        .channel(`preset-${preset.id}`)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "physics_presets",
          filter: `id=eq.${preset.id}`,
        }, (payload) => {
          const row = payload.new as { status: string };
          if (row.status === "ready") {
            setPresetId(preset.id);
            setProgress(100);
            setStatus("done");
            channel.unsubscribe();
          }
          if (row.status === "failed") {
            setStatus("error");
            setError("El análisis falló. Intenta con otro video o prompt.");
            channel.unsubscribe();
          }
        })
        .subscribe();

      // 4. Call analyze-video edge function
      const { data: { session } } = await supabase.auth.getSession();
      const { error: fnErr } = await supabase.functions.invoke("analyze-video", {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: {
          frames,
          frameCount: frames.length,
          fps: 30,
          presetId: preset.id,
          userId: user.id,
          presetName: presetName.trim() || "Preset sin nombre",
          isolationPrompt: isolationPrompt.trim(),
        },
      });

      if (fnErr) throw fnErr;
      setProgress(60);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-surface">
      <AppHeader title="Entrenar IA" subtitle="Sube un video de referencia para generar un preset de física" />

      <div className="max-w-2xl mx-auto px-8 py-12">
        {(status === "idle" || status === "error") ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0] ?? null); }}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                ${file ? "border-brand-500 bg-brand-950/20" : "border-surface-border hover:border-zinc-600"}`}
            >
              <input ref={fileRef} type="file" accept=".mp4,.mov,.webm" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <div className="text-4xl mb-3">{file ? "🎬" : "⬆"}</div>
              {file ? (
                <>
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </>
              ) : (
                <>
                  <p className="text-zinc-300 font-medium">Arrastra un video o haz clic para explorar</p>
                  <p className="text-xs text-zinc-500 mt-1">MP4, MOV, WEBM · máx 500MB</p>
                </>
              )}
            </div>

            {/* Isolation prompt — the key input */}
            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-1.5">
                ¿Qué elemento analizar?
                <span className="text-brand-400 ml-1">*</span>
              </label>
              <textarea
                value={isolationPrompt}
                onChange={(e) => setIsolationPrompt(e.target.value)}
                required
                rows={3}
                placeholder='Ej: "Analiza el rebote de la esfera roja en los primeros 2 segundos" o "Extrae la física de entrada del texto principal"'
                className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white
                  placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
              />
              <p className="text-xs text-zinc-600 mt-1">
                La IA aislará el elemento y extraerá tensión, fricción, rebote y easing.
              </p>
            </div>

            {/* Preset name */}
            <div>
              <label className="text-sm text-zinc-400 block mb-1.5">Nombre del preset</label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Ej: Entrada elástica logo"
                className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white
                  placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={!file || !isolationPrompt.trim()}
              className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white font-medium rounded-lg transition-colors"
            >
              Analizar video →
            </button>
          </form>

        ) : (
          /* Processing / Done state */
          <div className="glass rounded-xl p-8 text-center space-y-6">
            <div className="text-5xl">
              {status === "done" ? "✅" : status === "extracting" ? "🎞" : "🔬"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">
                {status === "done"
                  ? "¡Preset generado!"
                  : status === "extracting"
                  ? "Extrayendo frames…"
                  : "Claude analiza la física del movimiento…"}
              </h2>
              <p className="text-sm text-zinc-400">
                {status === "extracting"
                  ? "Leyendo frames del video en tu navegador."
                  : status === "analyzing"
                  ? `Aislando: "${isolationPrompt}" · Extrayendo curvas de velocidad y física.`
                  : "Preset listo en tu biblioteca. Ábrelo desde After Effects."}
              </p>
            </div>

            {status !== "done" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Progreso</span><span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-surface-border rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-brand-500 transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {status === "done" && (
              <div className="flex gap-3 justify-center">
                <a
                  href="/presets"
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Ver en biblioteca →
                </a>
                <button
                  onClick={() => { setStatus("idle"); setFile(null); setIsolationPrompt(""); setPresetName(""); setPresetId(null); }}
                  className="px-6 py-2.5 border border-surface-border text-zinc-400 hover:text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Analizar otro
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
