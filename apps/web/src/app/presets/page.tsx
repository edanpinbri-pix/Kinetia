"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppHeader } from "@/components/app-header/AppHeader";

type Preset = {
  id: string;
  name: string;
  description?: string;
  category: string;
  isolation_prompt: string;
  physics: Record<string, number | string>;
  expression_template: string;
  duration_ms?: number;
  fps?: number;
  confidence?: number;
  status: string;
  created_at: string;
};

const CATEGORIES = [
  { value: "all",       label: "Todos" },
  { value: "entrance",  label: "Entrada" },
  { value: "exit",      label: "Salida" },
  { value: "bounce",    label: "Rebote" },
  { value: "inertia",   label: "Inercia" },
  { value: "loop",      label: "Loop" },
  { value: "custom",    label: "Custom" },
];

export default function PresetsPage() {
  const supabase = createClient();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Preset | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [copyMsg, setCopyMsg] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("physics_presets")
      .select("*")
      .eq("status", "ready")
      .order("created_at", { ascending: false });
    if (data) setPresets(data as Preset[]);
    setLoading(false);
  }

  const list = presets.filter((p) => {
    const matchCat = category === "all" || p.category === category;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.isolation_prompt.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function copyExpression(p: Preset) {
    void navigator.clipboard.writeText(p.expression_template);
    setCopyMsg(true);
    setTimeout(() => setCopyMsg(false), 1500);
  }

  return (
    <main className="min-h-screen bg-surface">
      <AppHeader
        title="Biblioteca de Presets"
        subtitle={`${list.length} preset${list.length !== 1 ? "s" : ""}`}
        actions={
          <a href="/train" className="text-sm bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-md transition-colors">
            + Entrenar
          </a>
        }
      />

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-surface-border p-5 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Categoría</p>
            <div className="space-y-0.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors
                    ${category === cat.value
                      ? "bg-brand-950/50 text-brand-400 font-medium"
                      : "text-zinc-400 hover:text-white hover:bg-surface-card"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Grid + detail */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar presets…"
              className="w-full max-w-sm bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors mb-6"
            />

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass rounded-xl p-5 animate-pulse h-36" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-zinc-500 text-sm">Sin presets.</p>
                <a href="/train" className="text-brand-400 text-sm hover:text-brand-300 mt-2 inline-block">
                  Entrenar el primero →
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(selected?.id === p.id ? null : p)}
                    className={`text-left glass rounded-xl p-5 border transition-all hover:border-brand-700
                      ${selected?.id === p.id ? "border-brand-600 bg-brand-950/20" : "border-surface-border"}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs text-brand-400 font-medium uppercase">{p.category}</span>
                      <span className="text-[10px] text-zinc-600 font-mono">
                        {p.confidence ? `${(p.confidence * 100).toFixed(0)}%` : "–"}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">{p.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{p.isolation_prompt}</p>
                    <div className="mt-3 flex gap-3 text-[10px] text-zinc-600 font-mono">
                      {p.duration_ms && <span>{p.duration_ms}ms</span>}
                      {p.fps && <span>{p.fps}fps</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <aside className="w-80 shrink-0 border-l border-surface-border overflow-y-auto p-6 space-y-6">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-white text-sm">{selected.name}</h2>
                <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white text-lg leading-none">×</button>
              </div>

              <div className="bg-surface rounded-lg p-3 text-xs text-zinc-400 italic leading-relaxed">
                "{selected.isolation_prompt}"
              </div>

              {/* Physics values */}
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Física extraída</p>
                <div className="space-y-2">
                  {Object.entries(selected.physics)
                    .filter(([, v]) => typeof v === "number")
                    .map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400 capitalize">{key}</span>
                        <span className="text-white font-mono text-xs">{(val as number).toFixed(3)}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Expression preview */}
              {selected.expression_template && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Expresión AE</p>
                  <pre className="text-[10px] text-zinc-400 bg-surface rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                    {selected.expression_template.slice(0, 400)}{selected.expression_template.length > 400 ? "…" : ""}
                  </pre>
                </div>
              )}

              <button
                onClick={() => copyExpression(selected)}
                className="w-full py-2 bg-surface-card hover:bg-surface-elevated border border-surface-border text-sm text-white rounded-lg transition-colors"
              >
                {copyMsg ? "¡Copiado!" : "Copiar expresión AE"}
              </button>
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}
