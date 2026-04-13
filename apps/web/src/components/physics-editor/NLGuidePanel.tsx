"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PhysicsConfig } from "@kinetia/shared-types";

interface Props {
  currentPhysics: PhysicsConfig;
  layerMappingId: string;
  onApplied: (updated: PhysicsConfig) => void;
}

export function NLGuidePanel({ currentPhysics, layerMappingId, onApplied }: Props) {
  const supabase = createClient();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PhysicsConfig | null>(null);

  async function handleGuide() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/guide-preset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            prompt: prompt.trim(),
            currentPhysics,
            layerMappingId,
          }),
        }
      );

      if (!res.ok) throw new Error(await res.text());
      const { physics } = await res.json() as { physics: PhysicsConfig };
      setLastResult(physics);
      onApplied(physics);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">AI Guide</p>

      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleGuide();
          }}
          placeholder='e.g. "Make it softer and floatier"'
          rows={3}
          className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white
            placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
        />
        <span className="absolute bottom-2 right-2 text-[10px] text-zinc-600">⌘↵</span>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {lastResult && (
        <p className="text-xs text-emerald-400">Physics updated.</p>
      )}

      <button
        onClick={() => void handleGuide()}
        disabled={!prompt.trim() || loading}
        className="w-full py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? "Thinking…" : "Apply"}
      </button>

      <p className="text-[10px] text-zinc-600 leading-relaxed">
        AI modifies only the 6 physics parameters. Keyframes and easing curves are preserved.
      </p>
    </div>
  );
}
