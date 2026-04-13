import type { MicroJsonPreset, PhysicsConfig } from "./micro-json.js";
import type { LayerType } from "./micro-json.js";

export interface PresetLibraryItem {
  id: string;
  userId: string;
  name: string;
  category: string;
  tags: string[];
  thumbnailUrl: string;
  duration: number;
  confidence: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  /** Full preset loaded on demand */
  preset?: MicroJsonPreset;
}

export interface LayerPresetMapping {
  id: string;
  projectId: string;
  layerId: string;
  layerType: LayerType;
  presetId: string | null;
  /** Per-layer overrides applied on top of the preset's PhysicsConfig */
  overrides: Partial<PhysicsConfig>;
  orderIndex: number;
}

export interface PresetCompatibility {
  presetId: string;
  layerType: LayerType;
  score: number;
  reason: string;
}
