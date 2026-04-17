// ─── Kinetia v2 Core Types ────────────────────────────────────────────────────
// Physics preset: the central data contract between Web App and AE Plugin.

export type PresetCategory =
  | "entrance"
  | "exit"
  | "bounce"
  | "inertia"
  | "loop"
  | "custom";

export type PhysicsType = "spring" | "bounce" | "inertia" | "ease";

export type AEProperty =
  | "position.x"
  | "position.y"
  | "scale.x"
  | "scale.y"
  | "scale.uniform"
  | "rotation"
  | "opacity"
  | "anchorPoint.x"
  | "anchorPoint.y";

// ─── Physics ──────────────────────────────────────────────────────────────────

export interface PhysicsConfig {
  type: PhysicsType;
  /** Spring stiffness 0–1 */
  tension: number;
  /** Damping / friction 0–1 */
  friction: number;
  /** Mass / inertia 0.1–10 */
  mass: number;
  /** Max displacement in pixels */
  amplitude: number;
  /** Oscillation frequency in Hz */
  frequency: number;
  /** Exponential decay rate 0–1 */
  decay: number;
  easing: {
    /** Cubic bezier control points */
    bezier: [number, number, number, number];
  };
}

export const DEFAULT_PHYSICS_V2: PhysicsConfig = {
  type: "spring",
  tension: 0.5,
  friction: 0.6,
  mass: 1.0,
  amplitude: 60,
  frequency: 2.0,
  decay: 0.8,
  easing: { bezier: [0.25, 0.1, 0.25, 1.0] },
};

// ─── Pseudo Effect Controls (editable nodes in AE) ───────────────────────────

export interface PseudoEffectControl {
  name: string;
  matchName: string;   // e.g. "com.kinetia.spring.tension"
  type: "slider" | "angle" | "checkbox" | "point";
  defaultValue: number;
  min?: number;
  max?: number;
}

export interface PseudoEffectDef {
  name: string;         // e.g. "Kinetia Spring"
  matchName: string;    // e.g. "com.kinetia.spring"
  controls: PseudoEffectControl[];
}

// ─── Physics Preset ───────────────────────────────────────────────────────────

export interface PhysicsPreset {
  version: "2.0.0";
  id: string;
  userId: string;

  name: string;
  description?: string;
  category: PresetCategory;

  // Analysis source
  isolationPrompt: string;
  videoUrl?: string;

  // Physics extracted by CV pipeline
  physics: PhysicsConfig;

  // AE integration
  expressionTemplate: string;  // JS string injected as AE expression
  pseudoEffectDef?: PseudoEffectDef;

  // Metadata
  thumbnailUrl?: string;
  durationMs: number;
  fps: number;
  confidence: number;
  status: "processing" | "ready" | "failed";
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── AE Expression context passed to templates ───────────────────────────────

export interface AEExpressionContext {
  preset: PhysicsPreset;
  targetProperty: AEProperty;
  /** Layer in-point offset in seconds */
  inPointOffset?: number;
}
