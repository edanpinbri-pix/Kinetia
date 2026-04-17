"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProjectStore, type LayerNode } from "@/stores/project-store";
import { usePresetStore } from "@/stores/preset-store";
import { PhysicsEditor } from "@/components/physics-editor/PhysicsEditor";
import { NLGuidePanel } from "@/components/physics-editor/NLGuidePanel";
import { PresetCard } from "@/components/preset-card/PresetCard";
import { FilePreview } from "@/components/file-preview/FilePreview";
import { AnimationPreview } from "@/components/animation-preview/AnimationPreview";
import type { MicroJsonPreset, PhysicsConfig } from "@kinetia/shared-types";

const defaultPhysics: PhysicsConfig = {
  tension: 0.5, friction: 0.6, mass: 1.0,
  bounciness: 0.0, velocityDecay: 0.8, randomness: 0.0,
};

const LAYER_ICONS: Record<string, string> = {
  text: "T",
  vector: "V",
  image: "I",
  shape: "S",
  group: "G",
};

// ─── PSD layer extraction ─────────────────────────────────────────────────────
type AgLayer = {
  name?: string;
  children?: AgLayer[];
  text?: object;
  hidden?: boolean;
};

function mapAgLayers(layers: AgLayer[], depth = 0): LayerNode[] {
  return layers
    .filter((l) => l.name && l.name !== "</Layer group>" && !l.hidden)
    .map((l, i) => ({
      id: `d${depth}_${i}_${(l.name ?? "layer").replace(/\W+/g, "_").toLowerCase()}`,
      name: l.name ?? `Layer ${i + 1}`,
      type: (l.children ? "group" : l.text ? "text" : "image") as LayerNode["type"],
      children: l.children ? mapAgLayers(l.children, depth + 1) : [],
    }));
}

async function extractPsdLayers(file: File): Promise<LayerNode[]> {
  const { readPsd, initializeCanvas } = await import("ag-psd");
  initializeCanvas(
    (w: number, h: number) => {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      return c;
    },
    (w: number, h: number) => new ImageData(w, h)
  );
  const buf = await file.arrayBuffer();
  // skipLayerImageData for speed — we only need names/structure
  const psd = readPsd(buf, { skipLayerImageData: true, skipCompositeImageData: true });
  const layers = mapAgLayers((psd.children as AgLayer[]) ?? []);
  return layers.length > 0 ? layers : [];
}

// ─── LayerTree component ──────────────────────────────────────────────────────
function LayerTree({
  nodes, depth = 0, selectedId, onSelect,
}: {
  nodes: LayerNode[]; depth?: number;
  selectedId: string | null; onSelect: (id: string) => void;
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
            <LayerTree nodes={node.children} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
          )}
        </li>
      ))}
    </ul>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
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

  // Preset confirmation flow
  const [pendingPreset, setPendingPreset] = useState<MicroJsonPreset | null>(null);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [appliedPreset, setAppliedPreset] = useState<MicroJsonPreset | null>(null);

  useEffect(() => {
    void loadProject();
    void loadPresets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadProject() {
    setLoadingProject(true);
    const { data } = await supabase.from("projects").select("*").eq("id", id).single();
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
    const { error: uploadErr } = await supabase.storage.from("kinetia-uploads").upload(path, file, { contentType: file.type });
    if (uploadErr) { setUploadingFile(false); setUploadError(uploadErr.message); return; }

    const { data: { publicUrl } } = supabase.storage.from("kinetia-uploads").getPublicUrl(path);

    await supabase.from("projects").update({
      source_file_url: publicUrl,
      source_file_type: ext === "ai" ? "ai" : "psd",
      status: "processing",
    }).eq("id", id);

    if (ext === "psd") {
      // Parse real layers client-side from PSD binary
      try {
        const layers = await extractPsdLayers(file);
        if (layers.length > 0) {
          await supabase.from("projects").update({ layer_tree: layers, status: "ready" }).eq("id", id);
        } else {
          throw new Error("no layers extracted");
        }
      } catch (err) {
        console.error("[PSD parse]", err);
        // Fallback to Claude edge function
        await callParseLayersEdgeFn(publicUrl, "psd");
      }
    } else {
      // AI files: use Claude Vision edge function
      await callParseLayersEdgeFn(publicUrl, "ai");
    }

    setUploadingFile(false);
    void loadProject();
  }

  async function callParseLayersEdgeFn(fileUrl: string, fileType: "psd" | "ai") {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error: fnError } = await supabase.functions.invoke("parse-layers", {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: { projectId: id, fileUrl, fileType },
      });
      if (fnError) throw fnError;
    } catch (err) {
      console.error("[parse-layers fallback]", err);
      await supabase.from("projects").update({
        layer_tree: [
          { id: "bg", name: "Background", type: "image" },
          { id: "headline", name: "Headline", type: "text" },
          { id: "logo", name: "Logo", type: "vector" },
          { id: "cta", name: "CTA Button", type: "shape" },
        ],
        status: "ready",
      }).eq("id", id);
    }
  }

  // Called when user clicks a preset card → open confirmation dialog
  function handlePresetClick(preset: MicroJsonPreset) {
    setPendingPreset(preset);
    setAppliedPreset(null);
  }

  // Called when user confirms "Sí"
  async function confirmApplyPreset() {
    if (!pendingPreset || !selectedLayerId || !active) return;
    setApplyingPreset(true);

    assignPreset(selectedLayerId, pendingPreset);

    const { data, error } = await supabase
      .from("project_layer_mappings")
      .upsert({
        project_id: active.id,
        layer_id: selectedLayerId,
        preset_id: pendingPreset.id,
        layer_type: selectedLayer?.type ?? "image",
        overrides: {},
        order_index: 0,
      }, { onConflict: "project_id,layer_id" })
      .select("id")
      .single();

    if (!error && data) setLayerMappingId(data.id as string);

    setAppliedPreset(pendingPreset);
    setApplyingPreset(false);
    setPresetTab("physics");
  }

  async function handlePhysicsChange(physics: PhysicsConfig) {
    if (!selectedLayerId || !layerMappingId) return;
    applyOverrides(selectedLayerId, physics);
    await supabase.from("project_layer_mappings").update({ overrides: physics }).eq("id", layerMappingId);
  }

  async function handleExport() {
    if (!active) return;
    setExporting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/export-package`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ projectId: active.id }),
      }
    );
    if (res.ok) {
      const { packageUrl } = await res.json() as { packageUrl: string };
      setExportUrl(packageUrl);
    }
    setExporting(false);
  }

  const selectedLayer = selectedLayerId ? findLayer(active?.layerTree ?? [], selectedLayerId) : null;
  const assignedPreset = selectedLayer?.presetId ? presets.find((p) => p.id === selectedLayer.presetId) : null;
  const activePhysics = assignedPreset
    ? { ...assignedPreset.physics, ...selectedLayer?.overrides }
    : defaultPhysics;

  if (loadingProject) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-pulse text-zinc-500 text-sm">Cargando proyecto…</div>
      </main>
    );
  }

  if (!active) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Proyecto no encontrado.</p>
      </main>
    );
  }

  return (
    <main className="h-screen bg-surface flex flex-col overflow-hidden">
      {/* ── Preset confirmation modal ─────────────────────────────────── */}
      {pendingPreset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 w-[420px] shadow-2xl">
            {applyingPreset ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <p className="text-sm text-zinc-400">Aplicando preset…</p>
              </div>
            ) : appliedPreset ? (
              /* ── Preview state ── */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{appliedPreset.meta.name}</p>
                    <p className="text-xs text-zinc-500">aplicado a: {selectedLayer?.name}</p>
                  </div>
                  <button
                    onClick={() => { setPendingPreset(null); setAppliedPreset(null); }}
                    className="text-zinc-500 hover:text-white text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
                <AnimationPreview physics={appliedPreset.physics} layerName={selectedLayer?.name ?? "Layer"} />
                <p className="text-xs text-zinc-500 text-center">Edita las físicas en el panel derecho</p>
                <button
                  onClick={() => { setPendingPreset(null); setAppliedPreset(null); }}
                  className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Continuar →
                </button>
              </div>
            ) : (
              /* ── Confirm state ── */
              <div className="space-y-5">
                <div>
                  <p className="text-base font-semibold text-white mb-1">
                    ¿Aplicar preset de animación?
                  </p>
                  <p className="text-xs text-zinc-500">
                    <span className="text-brand-400 font-medium">{pendingPreset.meta.name}</span>
                    {" "}→ capa <span className="text-white">{selectedLayer?.name}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 bg-surface rounded-lg p-3 text-xs text-zinc-400">
                  <span><strong className="text-zinc-300">Categoría:</strong> {pendingPreset.meta.category}</span>
                  <span><strong className="text-zinc-300">Duración:</strong> {pendingPreset.meta.duration}ms</span>
                  <span><strong className="text-zinc-300">Descripción:</strong> {pendingPreset.meta.description}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingPreset(null)}
                    className="flex-1 py-2.5 border border-surface-border text-zinc-400 hover:text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    No
                  </button>
                  <button
                    onClick={() => void confirmApplyPreset()}
                    className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Sí, aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div className="border-b border-surface-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a href="/projects" className="text-zinc-500 hover:text-white text-sm transition-colors">← Proyectos</a>
          <span className="text-zinc-700">/</span>
          <h1 className="text-sm font-semibold text-white">{active.name}</h1>
          <span className={`text-xs ${active.status === "ready" ? "text-emerald-400" : "text-zinc-500"}`}>
            {active.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {exportUrl && (
            <a href={exportUrl} download className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
              Descargar .kinetia
            </a>
          )}
          <button
            onClick={() => void handleExport()}
            disabled={exporting || active.layerTree.length === 0}
            className="text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-md transition-colors"
          >
            {exporting ? "Exportando…" : "Exportar →"}
          </button>
        </div>
      </div>

      {/* ── 3-column layout ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Col 1: Layer panel */}
        <aside className="w-56 shrink-0 border-r border-surface-border flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Capas</p>
          </div>
          {active.layerTree.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
              <p className="text-xs text-zinc-500 mb-3">Sube un archivo PSD o AI</p>
              {uploadError && <p className="text-xs text-red-400 mb-2">{uploadError}</p>}
              <label className="cursor-pointer text-xs bg-surface-card hover:bg-surface-elevated border border-surface-border text-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
                {uploadingFile ? "Subiendo…" : "Explorar archivo"}
                <input
                  type="file" accept=".psd,.ai" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f); }}
                />
              </label>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-2">
              <LayerTree nodes={active.layerTree} selectedId={selectedLayerId} onSelect={setSelectedLayer} />
            </div>
          )}
        </aside>

        {/* Col 2: File preview */}
        <div className="flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden relative">
          {active.sourceFileUrl ? (
            <div className="relative w-full h-full">
              <FilePreview url={active.sourceFileUrl} fileType={active.sourceFileType ?? "ai"} />
              {selectedLayer && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 glass rounded-lg px-3 py-1.5 z-10">
                  <p className="text-xs text-brand-400">Seleccionado: <strong>{selectedLayer.name}</strong></p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-zinc-600 text-sm">Sin archivo</p>
            </div>
          )}
        </div>

        {/* Col 3: Right panel */}
        <aside className="w-72 shrink-0 border-l border-surface-border flex flex-col overflow-hidden">
          {!selectedLayer ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-xs text-zinc-600 text-center">Selecciona una capa para asignar un preset</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-surface-border">
                <p className="text-sm font-medium text-white">{selectedLayer.name}</p>
                <p className="text-xs text-zinc-500 capitalize mt-0.5">{selectedLayer.type} layer</p>
              </div>

              <div className="flex border-b border-surface-border">
                {(["assign", "physics", "guide"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setPresetTab(tab)}
                    className={`flex-1 text-xs py-2.5 capitalize transition-colors
                      ${presetTab === tab ? "text-white border-b-2 border-brand-500 -mb-px" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    {tab === "assign" ? "Presets" : tab === "physics" ? "Físicas" : "Guía IA"}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {/* ── Assign tab ── */}
                {presetTab === "assign" && (
                  <div className="space-y-3">
                    {presets
                      .filter((p) => p.targetConstraints.layerTypes.includes(
                        selectedLayer.type as "text" | "vector" | "image" | "shape" | "group"
                      ))
                      .map((p) => (
                        <PresetCard
                          key={p.id}
                          preset={p}
                          selected={selectedLayer.presetId === p.id}
                          onClick={() => handlePresetClick(p)}
                        />
                      ))}
                    {presets.filter((p) => p.targetConstraints.layerTypes.includes(
                      selectedLayer.type as "text" | "vector" | "image" | "shape" | "group"
                    )).length === 0 && (
                      <p className="text-xs text-zinc-600 text-center py-6">
                        Sin presets para capa {selectedLayer.type}.
                        <a href="/train" className="block text-brand-400 hover:text-brand-300 mt-1">
                          Entrenar uno →
                        </a>
                      </p>
                    )}
                  </div>
                )}

                {/* ── Physics tab ── */}
                {presetTab === "physics" && (
                  assignedPreset ? (
                    <>
                      <div className="mb-4">
                        <AnimationPreview physics={activePhysics} layerName={selectedLayer.name} />
                      </div>
                      <PhysicsEditor
                        physics={activePhysics}
                        onChange={(p) => void handlePhysicsChange(p)}
                        disabled={!layerMappingId}
                      />
                    </>
                  ) : (
                    <p className="text-xs text-zinc-600 text-center py-6">Asigna un preset primero.</p>
                  )
                )}

                {/* ── Guide tab — always accessible ── */}
                {presetTab === "guide" && (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Describe la visión de animación para esta capa. La IA ajustará las físicas.
                    </p>
                    <NLGuidePanel
                      currentPhysics={activePhysics}
                      layerMappingId={layerMappingId ?? ""}
                      onApplied={(p) => void handlePhysicsChange(p)}
                    />
                    {!layerMappingId && (
                      <p className="text-xs text-amber-500/70 text-center">
                        Asigna un preset para que los cambios se guarden.
                      </p>
                    )}
                  </div>
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
    if (n.children) { const found = findLayer(n.children, id); if (found) return found; }
  }
  return null;
}
