"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppHeader } from "@/components/app-header/AppHeader";

type JobStatus = "idle" | "extracting" | "analyzing" | "done" | "error";

async function extractFrames(file: File, maxFrames = 12): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const frames: string[] = [];

    video.src = URL.createObjectURL(file);
    video.muted = true;

    video.onloadedmetadata = () => {
      canvas.width  = Math.min(video.videoWidth, 640);
      canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
      const interval = video.duration / maxFrames;

      let i = 0;
      function seekNext() {
        if (i >= maxFrames) {
          URL.revokeObjectURL(video.src);
          resolve(frames);
          return;
        }
        video.currentTime = i * interval;
        i++;
      }

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/png").split(",")[1]!);
        seekNext();
      };

      seekNext();
    };

    video.onerror = reject;
    video.load();
  });
}

export default function TrainPage() {
  const [file, setFile] = useState<File | null>(null);
  const [presetName, setPresetName] = useState("");
  const [status, setStatus] = useState<JobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [resultId, setResultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setStatus("extracting");
    setProgress(0);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Upload video to Supabase Storage
      setProgress(10);
      const ext = file.name.split(".").pop();
      const storagePath = `videos/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("kinetia-uploads")
        .upload(storagePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("kinetia-uploads")
        .getPublicUrl(storagePath);

      // 2. Create training job record
      const { data: job, error: jobError } = await supabase
        .from("training_jobs")
        .insert({ user_id: user.id, video_url: publicUrl, status: "queued" })
        .select()
        .single();
      if (jobError) throw jobError;

      setProgress(20);
      setStatus("extracting");

      // 3. Extract frames in browser
      const frames = await extractFrames(file, 12);
      setProgress(45);
      setStatus("analyzing");

      // 4. Subscribe to realtime progress
      const channel = supabase
        .channel(`job-${job.id}`)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "training_jobs",
          filter: `id=eq.${job.id}`,
        }, (payload) => {
          const updated = payload.new as { status: string; progress: number; result_preset_id: string };
          setProgress(updated.progress);
          if (updated.status === "completed") {
            setResultId(updated.result_preset_id);
            setStatus("done");
            channel.unsubscribe();
          }
          if (updated.status === "failed") {
            setStatus("error");
            channel.unsubscribe();
          }
        })
        .subscribe();

      // 5. Call Edge Function
      const { error: fnError } = await supabase.functions.invoke("analyze-video", {
        body: {
          frames,
          frameCount: frames.length,
          fps: 30,
          jobId: job.id,
          userId: user.id,
          presetName: presetName || undefined,
        },
      });

      if (fnError) throw fnError;

    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-surface">
      <AppHeader title="Train AI" subtitle="Upload a reference video to generate a motion preset" />

      <div className="max-w-2xl mx-auto px-8 py-12">
        {status === "idle" || status === "error" ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0] ?? null); }}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
                ${file ? "border-brand-500 bg-brand-950/20" : "border-surface-border hover:border-surface-muted"}`}
            >
              <input ref={fileRef} type="file" accept=".mp4,.mov,.webm" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <div className="text-4xl mb-4">{file ? "🎬" : "⬆"}</div>
              {file ? (
                <><p className="font-medium text-white">{file.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p></>
              ) : (
                <><p className="text-zinc-300 font-medium">Drop a video or click to browse</p>
                  <p className="text-xs text-zinc-500 mt-1">MP4, MOV, WEBM · max 500MB</p></>
              )}
            </div>

            <div>
              <label className="text-sm text-zinc-400 block mb-1.5">Preset name (optional)</label>
              <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g. Elastic bounce entrance"
                className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors" />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button type="submit" disabled={!file}
              className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white font-medium rounded-lg transition-colors">
              Analyze video
            </button>
          </form>
        ) : (
          <div className="glass rounded-xl p-8 text-center space-y-6">
            <div className="text-5xl">
              {status === "done" ? "✅" : status === "extracting" ? "🎞" : "🔬"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">
                {status === "done" ? "Preset generated!" :
                 status === "extracting" ? "Extracting frames…" : "Claude is analyzing motion…"}
              </h2>
              <p className="text-sm text-zinc-400">
                {status === "extracting" ? "Reading video frames in your browser." :
                 status === "analyzing" ? "Claude Vision is extracting easing curves and physics." :
                 "Your motion preset is ready in the Preset Library."}
              </p>
            </div>

            {status !== "done" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Progress</span><span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-surface-border rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {status === "done" && (
              <a href="/presets" className="inline-block px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors">
                View in Preset Library →
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
