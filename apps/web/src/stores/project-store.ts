import { create } from "zustand";
import type { MicroJsonPreset, PhysicsConfig } from "@kinetia/shared-types";

export interface LayerNode {
  id: string;
  name: string;
  type: "text" | "vector" | "image" | "shape" | "group";
  children?: LayerNode[];
  presetId?: string;
  overrides?: Partial<PhysicsConfig>;
}

export interface Project {
  id: string;
  name: string;
  status: "idle" | "parsing" | "ready" | "exporting";
  sourceFileUrl?: string;
  sourceFileType?: "psd" | "ai";
  layerTree: LayerNode[];
  createdAt: string;
}

interface ProjectStore {
  projects: Project[];
  active: Project | null;
  selectedLayerId: string | null;
  nlPrompt: string;
  nlLoading: boolean;

  setProjects: (p: Project[]) => void;
  setActive: (p: Project | null) => void;
  setSelectedLayer: (id: string | null) => void;
  assignPreset: (layerId: string, preset: MicroJsonPreset) => void;
  applyOverrides: (layerId: string, overrides: Partial<PhysicsConfig>) => void;
  setNLPrompt: (v: string) => void;
  setNLLoading: (v: boolean) => void;
  updateLayer: (layerId: string, update: Partial<LayerNode>) => void;
}

function patchLayer(nodes: LayerNode[], id: string, update: Partial<LayerNode>): LayerNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...update };
    if (n.children) return { ...n, children: patchLayer(n.children, id, update) };
    return n;
  });
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  active: null,
  selectedLayerId: null,
  nlPrompt: "",
  nlLoading: false,

  setProjects: (projects) => set({ projects }),
  setActive: (active) => set({ active, selectedLayerId: null }),
  setSelectedLayer: (selectedLayerId) => set({ selectedLayerId }),
  setNLPrompt: (nlPrompt) => set({ nlPrompt }),
  setNLLoading: (nlLoading) => set({ nlLoading }),

  assignPreset: (layerId, preset) => {
    const { active } = get();
    if (!active) return;
    const layerTree = patchLayer(active.layerTree, layerId, { presetId: preset.id });
    set({ active: { ...active, layerTree } });
  },

  applyOverrides: (layerId, overrides) => {
    const { active } = get();
    if (!active) return;
    const layerTree = patchLayer(active.layerTree, layerId, { overrides });
    set({ active: { ...active, layerTree } });
  },

  updateLayer: (layerId, update) => {
    const { active } = get();
    if (!active) return;
    const layerTree = patchLayer(active.layerTree, layerId, update);
    set({ active: { ...active, layerTree } });
  },
}));
