import { create } from "zustand";
import type { MicroJsonPreset, PresetCategory } from "@kinetia/shared-types";

interface PresetFilters {
  category: PresetCategory | "all";
  search: string;
}

interface PresetStore {
  presets: MicroJsonPreset[];
  filters: PresetFilters;
  loading: boolean;
  selected: MicroJsonPreset | null;

  setPresets: (p: MicroJsonPreset[]) => void;
  setFilters: (f: Partial<PresetFilters>) => void;
  setLoading: (v: boolean) => void;
  setSelected: (p: MicroJsonPreset | null) => void;

  filtered: () => MicroJsonPreset[];
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  presets: [],
  filters: { category: "all", search: "" },
  loading: false,
  selected: null,

  setPresets: (presets) => set({ presets }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  setLoading: (loading) => set({ loading }),
  setSelected: (selected) => set({ selected }),

  filtered: () => {
    const { presets, filters } = get();
    return presets.filter((p) => {
      const matchCat = filters.category === "all" || p.meta.category === filters.category;
      const q = filters.search.toLowerCase();
      const matchSearch = !q ||
        p.meta.name.toLowerCase().includes(q) ||
        p.meta.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  },
}));
