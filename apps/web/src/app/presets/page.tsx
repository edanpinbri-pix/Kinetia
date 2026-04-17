"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePresetStore } from "@/stores/preset-store";
import { AppHeader } from "@/components/app-header/AppHeader";
import { PresetCard } from "@/components/preset-card/PresetCard";
import type { MicroJsonPreset, PresetCategory } from "@kinetia/shared-types";

const CATEGORIES: { value: PresetCategory | "all"; label: string }[] = [
  { value: "all",        label: "All" },
  { value: "entrance",   label: "Entrance" },
  { value: "exit",       label: "Exit" },
  { value: "emphasis",   label: "Emphasis" },
  { value: "loop",       label: "Loop" },
  { value: "transition", label: "Transition" },
];

export default function PresetsPage() {
  const supabase = createClient();
  const { presets, filters, loading, selected, setPresets, setFilters, setLoading, setSelected, filtered } =
    usePresetStore();
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("presets")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) {
        setPresets(data.map((row) => row.micro_json as MicroJsonPreset));
      }
      setLoading(false);
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copyJSON(preset: MicroJsonPreset) {
    void navigator.clipboard.writeText(JSON.stringify(preset, null, 2));
    setCopyMsg(preset.id);
    setTimeout(() => setCopyMsg(null), 1500);
  }

  const list = filtered();

  return (
    <main className="min-h-screen bg-surface">
      <AppHeader
        title="Preset Library"
        subtitle={`${list.length} preset${list.length !== 1 ? "s" : ""}`}
        actions={
          <a href="/train" className="text-sm bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-md transition-colors">
            + Train new
          </a>
        }
      />

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar filters */}
        <aside className="w-56 shrink-0 border-r border-surface-border p-5 space-y-6 overflow-y-auto">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Category</p>
            <div className="space-y-0.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setFilters({ category: cat.value })}
                  className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors
                    ${filters.category === cat.value
                      ? "bg-brand-950/50 text-brand-400 font-medium"
                      : "text-zinc-400 hover:text-white hover:bg-surface-card"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main grid + detail panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Search */}
            <div className="mb-6">
              <input
                type="search"
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                placeholder="Search presets…"
                className="w-full max-w-sm bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass rounded-xl p-5 animate-pulse h-40" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-zinc-500 text-sm">No presets found.</p>
                <a href="/train" className="text-brand-400 text-sm hover:text-brand-300 mt-2 inline-block">
                  Train your first preset →
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((p) => (
                  <PresetCard
                    key={p.id}
                    preset={p}
                    selected={selected?.id === p.id}
                    onClick={() => setSelected(selected?.id === p.id ? null : p)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <aside className="w-80 shrink-0 border-l border-surface-border overflow-y-auto p-6 space-y-6">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-white text-sm">{selected.meta.name}</h2>
                <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white text-lg leading-none">
                  ×
                </button>
              </div>

              {/* Physics values */}
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Physics</p>
                <div className="space-y-2.5">
                  {(Object.entries(selected.physics) as [string, number][]).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400 capitalize">{key}</span>
                      <span className="text-white font-mono text-xs">{val.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracks */}
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Tracks ({selected.tracks.length})
                </p>
                <div className="space-y-1">
                  {selected.tracks.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-mono">{t.property}</span>
                      <span className="text-zinc-600">{t.keyframes.length}kf</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target constraints */}
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Layer types</p>
                <div className="flex flex-wrap gap-1">
                  {selected.targetConstraints.layerTypes.map((lt) => (
                    <span key={lt} className="text-[10px] text-zinc-400 bg-surface-border rounded px-2 py-0.5">
                      {lt}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => copyJSON(selected)}
                className="w-full py-2 bg-surface-card hover:bg-surface-elevated border border-surface-border text-sm text-white rounded-lg transition-colors"
              >
                {copyMsg === selected.id ? "Copied!" : "Copy JSON"}
              </button>
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}
