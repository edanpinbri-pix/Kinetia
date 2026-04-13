"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProjectStore, type LayerNode } from "@/stores/project-store";
import { usePresetStore } from "@/stores/preset-store";
import { PhysicsEditor } from "@/components/physics-editor/PhysicsEditor";
import { NLGuidePanel } from "@/components/physics-editor/NLGuidePanel";
import { PresetCard } from "@/components/preset-card/PresetCard";
import type { MicroJsonPreset, PhysicsConfig } from "@kinetia/shared-types";

const LAYER_ICONS: Record<string, string> = {
  text: "T",
  vector: "V",
  image: "I",
  shape: "S",
  group: "G",
};

function LayerTree({
  nodes,
  depth = 0,
  selectedId,
  onSelect,
}: {
  nodes: LayerNode[];
  depth?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul>
      {nodes.map((node) => (
        <li key={node.id}>
          <button
            onClick={() => onSelect(node.id)}
            className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors
              ${selectedId === node.id
                ? "bg-brand-950/50 text-brand-300"
                : "text-zinc-400 hover:text-white hover:bg-surface-card"}`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0
              ${node.presetId ? "bg-brand-600 text-white" : "bg-surface-border text-zinc-500"}`}>
              {LAYER_ICONS[node.type] ?? "?"}
            </span>
            <span className="truncate">{node.name}</span>
            {node.presetId && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
          </button>
          {node.children && node.children.length > 0 && (
            <LayerTree
              nodes={node.children}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function ProjectWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const { active, selectedLayerId, setActive, setSelectedLayer, assignPreset, applyOverrides } =
    useProjectStore();
  const { presets, setPresets } = usePresetStore();

  const [loadingProject, setLoadingProject] = useState(true);
  const [presetTab, setPresetTab] = useState<"assign" | "physics" | "guide">("assign");
  const [layerMappingId, setLayerMappingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    void loadProject();
    void loadPresets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadProject() {
    setLoadingProject(true);
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setActive({
        id: data.id,
        name: data.name,
        status: data.status,
        sourceFileUrl: data.source_file_url,
        sourceFileType: data.source_file_type,
        layerTree: data.layer_tree ?? [],
        createdAt: data.created_at,
      });
    }
    setLoadingProject(false);
  }

  async function loadPresets() {
    if (presets.length > 0) return;
    const { data } = await supabase.from("presets").select("*").order("created_at", { ascending: false });
    if (data) setPresets(data.map((r) => r.micro_json as MicroJsonPreset));
  }

  async function handleFileUpload(file: File) {
    if (!active) return;
    setUploadingFile(true);
    setUploadError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingFile(false); return; }

    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    const path = `files/${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kinetia-uploads").upload(path, file, { contentType: file.type });
    if (error) { setUploadingFile(false); setUploadError(error.message); return; }

    const { data: { publicUrl } } = supabase.storage.from("kinetia-uploads").getPublicUrl(path);

    // Save file URL first
    await supabase.from("projects").update({
      source_file_url: publicUrl,
      source_file_type: ext === "ai" ? "ai" : "psd",
      status: "processing",
    }).eq("id", id);

    // Call parse-layers edge function to detect layers with AI
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("parse-layers", {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        body: { projectId: id, fileUrl: publicUrl, fileType: ext === "ai" ? "ai" : "psd" },
      });
      if (fnError) throw fnError;
      console.log("[parse-layers] detected layers:", fnData);
    } catch (err) {
      // Fallback: basic layer tree if AI parsing fails
      await supabase.from("projects").update({
        layer_tree: [
          { id: "bg", name: "Background", type: "image" },
          { id: "headline", name: "Headline", type: "text" },
          { id: "logo", name: "Logo", type: "vector" },
          { id: "cta", name: "CTA Button", type: "shape" },
        ],
        status: "ready",
      }).eq("id", id);
      console.error("[parse-layers] fallback:", err);
    }

    setUploadingFile(false);
    void loadProject();
  }

  async function handleAssignPreset(preset: MicroJsonPreset) {
    if (!selectedLayerId || !active) return;
    assignPreset(selectedLayerId, preset);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("project_layer_mappings")
      .upsert({
        project_id: active.id,
        layer_id: selectedLayerId,
        preset_id: preset.id,
        layer_type: selectedLayer?.type ?? "image",
        overrides: {},
        order_index: 0,
      }, { onConflict: "project_id,layer_id" })
      .select("id")
      .single();

    if (!error && data) setLayerMappingId(data.id as string);
  }

  async function handlePhysicsChange(physics: PhysicsConfig) {
    if (!selectedLayerId || !layerMappingId) return;
    applyOverrides(selectedLayerId, physics);
    await supabase
      .from("project_layer_mappings")
      .update({ overrides: physics })
      .eq("id", layerMappingId);
  }

  async function handleExport() {
    if (!active) return;
    setExporting(true);
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/export-package`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ projectId: active.id }),
      }
    );

    if (res.ok) {
      const { packageUrl } = await res.json() as { packageUrl: string };
      setExportUrl(packageUrl);
    }
    setExporting(false);
  }

  const selectedLayer = selectedLayerId
    ? findLayer(active?.layerTree ?? [], selectedLayerId)
    : null;

  const assignedPreset = selectedLayer?.presetId
    ? presets.find((p) => p.id === selectedLayer.presetId)
    : null;

  if (loadingProject) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-pulse text-zinc-500 text-sm">Loading project…</div>
      </main>
    );
  }

  if (!active) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Project not found.</p>
      </main>
    );
  }

  return (
    <main className="h-screen bg-surface flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="border-b border-surface-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a href="/projects" className="text-zinc-500 hover:text-white text-sm transition-colors">
            ← Projects
          </a>
          <span className="text-zinc-700">/</span>
          <h1 className="text-sm font-semibold text-white">{active.name}</h1>
          <span className={`text-xs ${active.status === "ready" ? "text-emerald-400" : "text-zinc-500"}`}>
            {active.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {exportUrl && (
            <a
              href={exportUrl}
              download
              className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
            >
              Download .kinetia
            </a>
          )}
          <button
            onClick={() => void handleExport()}
            disabled={exporting || active.layerTree.length === 0}
            className="text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-md transition-colors"
          >
            {exporting ? "Exporting…" : "Export →"}
          </button>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Col 1: Layer panel */}
        <aside className="w-56 shrink-0 border-r border-surface-border flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Layers</p>
          </div>

          {active.layerTree.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
              <p className="text-xs text-zinc-500 mb-3">Upload PSD or AI file</p>
              {uploadError && <p className="text-xs text-red-400 mb-2">{uploadError}</p>}
              <label className="cursor-pointer text-xs bg-surface-card hover:bg-surface-elevated border border-surface-border text-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
                {uploadingFile ? "Uploading…" : "Browse file"}
                <input
                  type="file"
                  accept=".psd,.ai"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFileUpload(f);
                  }}
                />
              </label>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-2">
              <LayerTree
                nodes={active.layerTree}
                selectedId={selectedLayerId}
                onSelect={setSelectedLayer}
              />
            </div>
          )}
        </aside>

        {/* Col 2: Canvas preview */}
        <div className="flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden relative">
          {active.sourceFileUrl ? (
            <div className="relative w-full h-full flex flex-col">
              <iframe
                src={active.sourceFileUrl}
                className="flex-1 w-full border-0"
                title="File preview"
              />
              {selectedLayer && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 glass rounded-lg px-3 py-1.5">
                  <p className="text-xs text-brand-400">
                    Selected: <strong>{selectedLayer.name}</strong>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-zinc-600 text-sm">No file uploaded</p>
            </div>
          )}
        </div>

        {/* Col 3: Right panel */}
        <aside className="w-72 shrink-0 border-l border-surface-border flex flex-col overflow-hidden">
          {!selectedLayer ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-xs text-zinc-600 text-center">Select a layer to assign a preset</p>
            </div>
          ) : (
            <>
              {/* Layer info */}
              <div className="px-5 py-4 border-b border-surface-border">
                <p className="text-sm font-medium text-white">{selectedLayer.name}</p>
                <p className="text-xs text-zinc-500 capitalize mt-0.5">{selectedLayer.type} layer</p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-surface-border">
                {(["assign", "physics", "guide"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setPresetTab(tab)}
                    className={`flex-1 text-xs py-2.5 capitalize transition-colors
                      ${presetTab === tab
                        ? "text-white border-b-2 border-brand-500 -mb-px"
                        : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {presetTab === "assign" && (
                  <div className="space-y-3">
                    {presets
                      .filter((p) =>
                        p.targetConstraints.layerTypes.includes(
                          selectedLayer.type as "text" | "vector" | "image" | "shape" | "group"
                        )
                      )
                      .map((p) => (
                        <PresetCard
                          key={p.id}
                          preset={p}
                          selected={selectedLayer.presetId === p.id}
                          onClick={() => void handleAssignPreset(p)}
                        />
                      ))}
                    {presets.filter((p) =>
                      p.targetConstraints.layerTypes.includes(
                        selectedLayer.type as "text" | "vector" | "image" | "shape" | "group"
                      )
                    ).length === 0 && (
                      <p className="text-xs text-zinc-600 text-center py-6">
                        No presets for {selectedLayer.type} layers.
                        <a href="/train" className="block text-brand-400 hover:text-brand-300 mt-1">
                          Train one →
                        </a>
                      </p>
                    )}
                  </div>
                )}

                {presetTab === "physics" && (
                  assignedPreset ? (
                    <PhysicsEditor
                      physics={{ ...assignedPreset.physics, ...selectedLayer.overrides }}
                      onChange={(p) => void handlePhysicsChange(p)}
                      disabled={!layerMappingId}
                    />
                  ) : (
                    <p className="text-xs text-zinc-600 text-center py-6">
                      Assign a preset first.
                    </p>
                  )
                )}

                {presetTab === "guide" && (
                  assignedPreset && layerMappingId ? (
                    <NLGuidePanel
                      currentPhysics={{ ...assignedPreset.physics, ...selectedLayer.overrides }}
                      layerMappingId={layerMappingId}
                      onApplied={(p) => void handlePhysicsChange(p)}
                    />
                  ) : (
                    <p className="text-xs text-zinc-600 text-center py-6">
                      Assign a preset first.
                    </p>
                  )
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

function findLayer(nodes: LayerNode[], id: string): LayerNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findLayer(n.children, id);
      if (found) return found;
    }
  }
  return null;
}
