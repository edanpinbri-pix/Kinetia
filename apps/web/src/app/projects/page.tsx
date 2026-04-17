"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppHeader } from "@/components/app-header/AppHeader";
import type { Project } from "@/stores/project-store";

const STATUS_LABEL: Record<string, string> = {
  idle: "Ready",
  parsing: "Parsing…",
  ready: "Ready",
  exporting: "Exporting…",
};

const STATUS_COLOR: Record<string, string> = {
  idle: "text-zinc-500",
  parsing: "text-yellow-400",
  ready: "text-emerald-400",
  exporting: "text-brand-400",
};

export default function ProjectsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void loadProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProjects() {
    setLoading(true);
    const { data } = await supabase
      .from("projects")
      .select("id, name, status, source_file_type, created_at, layer_tree")
      .order("created_at", { ascending: false });

    if (data) {
      setProjects(data.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status as Project["status"],
        sourceFileType: r.source_file_type,
        layerTree: r.layer_tree ?? [],
        createdAt: r.created_at,
      })));
    }
    setLoading(false);
  }

  async function createProject() {
    if (!newName.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: newName.trim(), status: "draft", layer_tree: [] })
      .select("id")
      .single();

    setCreating(false);
    if (!error && data) {
      setShowModal(false);
      setNewName("");
      router.push(`/projects/${data.id}`);
    }
  }

  return (
    <main className="min-h-screen bg-surface">
      <AppHeader
        title="Projects"
        subtitle="Your animation projects"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="text-sm bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-md transition-colors"
          >
            + New project
          </button>
        }
      />

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-6 animate-pulse h-32" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-28">
            <p className="text-zinc-400 text-sm mb-4">No projects yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/projects/${p.id}`)}
                className="glass rounded-xl p-6 text-left hover:border-brand-700 transition-all duration-200 focus:outline-none"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-white text-sm leading-snug">{p.name}</h3>
                  <span className={`text-xs shrink-0 ${STATUS_COLOR[p.status] ?? "text-zinc-500"}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-600">
                  {p.sourceFileType && (
                    <span className="uppercase font-mono bg-surface-border rounded px-1.5 py-0.5">
                      {p.sourceFileType}
                    </span>
                  )}
                  <span>{p.layerTree.length} layers</span>
                  <span className="ml-auto">{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="glass rounded-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-white">New project</h2>

            <div>
              <label className="text-xs text-zinc-400 block mb-1.5">Project name</label>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void createProject(); }}
                placeholder="e.g. Brand launch 2026"
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setNewName(""); }}
                className="flex-1 py-2 border border-surface-border text-zinc-400 hover:text-white text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void createProject()}
                disabled={!newName.trim() || creating}
                className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
