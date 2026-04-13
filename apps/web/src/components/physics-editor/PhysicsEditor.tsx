"use client";

import type { PhysicsConfig } from "@kinetia/shared-types";

const PARAMS: { key: keyof PhysicsConfig; label: string; min: number; max: number; step: number }[] = [
  { key: "tension",       label: "Tension",        min: 0, max: 1,  step: 0.01 },
  { key: "friction",      label: "Friction",        min: 0, max: 1,  step: 0.01 },
  { key: "mass",          label: "Mass",            min: 0.1, max: 10, step: 0.1 },
  { key: "bounciness",    label: "Bounciness",      min: 0, max: 1,  step: 0.01 },
  { key: "velocityDecay", label: "Velocity decay",  min: 0, max: 1,  step: 0.01 },
  { key: "randomness",    label: "Randomness",      min: 0, max: 1,  step: 0.01 },
];

interface Props {
  physics: PhysicsConfig;
  onChange: (updated: PhysicsConfig) => void;
  disabled?: boolean;
}

export function PhysicsEditor({ physics, onChange, disabled }: Props) {
  function set(key: keyof PhysicsConfig, value: number) {
    onChange({ ...physics, [key]: value });
  }

  return (
    <div className="space-y-4">
      {PARAMS.map(({ key, label, min, max, step }) => {
        const val = physics[key];
        const pct = ((val - min) / (max - min)) * 100;

        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-zinc-400">{label}</label>
              <span className="text-xs text-white font-mono">{val.toFixed(key === "mass" ? 1 : 2)}</span>
            </div>
            <div className="relative h-5 flex items-center">
              {/* Track */}
              <div className="absolute inset-x-0 h-1 bg-surface-border rounded-full overflow-hidden">
                <div className="h-full bg-brand-600 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              {/* Native range */}
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={val}
                disabled={disabled}
                onChange={(e) => set(key, parseFloat(e.target.value))}
                className="relative w-full appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3.5
                  [&::-webkit-slider-thumb]:h-3.5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:shadow-sm
                  [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-brand-500
                  [&::-moz-range-thumb]:w-3.5
                  [&::-moz-range-thumb]:h-3.5
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-white
                  [&::-moz-range-thumb]:border-2
                  [&::-moz-range-thumb]:border-brand-500
                  [&::-moz-range-thumb]:border-solid"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
