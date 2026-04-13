"use client";

import type { MicroJsonPreset } from "@kinetia/shared-types";

const CATEGORY_LABELS: Record<string, string> = {
  entrance: "Entrance",
  exit: "Exit",
  emphasis: "Emphasis",
  loop: "Loop",
  transition: "Transition",
};

const CATEGORY_COLORS: Record<string, string> = {
  entrance: "text-emerald-400 bg-emerald-950/50 border-emerald-900",
  exit: "text-red-400 bg-red-950/50 border-red-900",
  emphasis: "text-yellow-400 bg-yellow-950/50 border-yellow-900",
  loop: "text-sky-400 bg-sky-950/50 border-sky-900",
  transition: "text-purple-400 bg-purple-950/50 border-purple-900",
};

interface Props {
  preset: MicroJsonPreset;
  selected?: boolean;
  onClick?: () => void;
}

export function PresetCard({ preset, selected, onClick }: Props) {
  const catColor = CATEGORY_COLORS[preset.meta.category] ?? "text-zinc-400 bg-zinc-900 border-zinc-800";
  const confidence = Math.round(preset.meta.confidence * 100);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left glass rounded-xl p-5 transition-all duration-200 hover:border-brand-700 focus:outline-none
        ${selected ? "border-brand-500 ring-1 ring-brand-500/30" : "border-surface-border"}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">{preset.meta.name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{preset.meta.duration}ms · {preset.meta.fps}fps</p>
        </div>
        <span className={`shrink-0 text-[10px] font-medium border rounded-full px-2 py-0.5 ${catColor}`}>
          {CATEGORY_LABELS[preset.meta.category] ?? preset.meta.category}
        </span>
      </div>

      {/* Physics mini-bars */}
      <div className="space-y-1.5 mb-4">
        {(["tension", "friction", "bounciness"] as const).map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 w-14 capitalize">{key}</span>
            <div className="flex-1 h-1 bg-surface-border rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full"
                style={{ width: `${preset.physics[key] * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tags + confidence */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {preset.meta.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] text-zinc-500 bg-surface-border rounded px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-zinc-600 shrink-0">{confidence}% confidence</span>
      </div>
    </button>
  );
}
