"use client";

import { useEffect, useRef, useState } from "react";

interface FilePreviewProps {
  url: string;
  fileType: "psd" | "ai";
}

export function FilePreview({ url, fileType }: FilePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void render();

    async function render() {
      setLoading(true);
      setError(null);
      try {
        if (fileType === "psd") {
          await renderPsd();
        } else {
          await renderAi();
        }
      } catch (err) {
        console.error("[FilePreview]", err);
        setError(err instanceof Error ? err.message : "Error al renderizar archivo");
      } finally {
        setLoading(false);
      }
    }

    async function renderPsd() {
      const { readPsd, initializeCanvas } = await import("ag-psd");
      // Browser init — no Node canvas package needed
      initializeCanvas(
        (w: number, h: number) => {
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          return c;
        },
        (w: number, h: number) => new ImageData(w, h)
      );

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const buf = await res.arrayBuffer();
      const psd = readPsd(buf);

      const canvas = canvasRef.current;
      if (!canvas) return;

      if (psd.canvas) {
        canvas.width = psd.canvas.width;
        canvas.height = psd.canvas.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(psd.canvas, 0, 0);
      } else {
        // No composite canvas — draw placeholder with dimensions
        canvas.width = psd.width || 800;
        canvas.height = psd.height || 600;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#5f72f0";
        ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PSD", canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = "#71717a";
        ctx.font = "14px monospace";
        ctx.fillText(`${psd.width} × ${psd.height}px`, canvas.width / 2, canvas.height / 2 + 20);
      }
    }

    async function renderAi() {
      // AI files are PDF-based — use pdfjs-dist
      const pdfjsLib = await import("pdfjs-dist");
      // Serve worker locally from public/ — no CDN dependency
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const loadingTask = pdfjsLib.getDocument({ url, withCredentials: false });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const container = containerRef.current;
      const maxW = container ? container.clientWidth - 32 : 800;
      const maxH = container ? container.clientHeight - 32 : 600;

      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(maxW / baseViewport.width, maxH / baseViewport.height, 2);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, fileType]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-auto bg-[#0d0d0d]"
      style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #1f1f1f 1px, transparent 0)", backgroundSize: "24px 24px" }}
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-brand-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-500">Renderizando {fileType.toUpperCase()}…</p>
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center gap-2 p-6 rounded-xl border border-red-900/40 bg-red-950/20 max-w-xs text-center">
          <span className="text-2xl">⚠</span>
          <p className="text-xs text-red-400">{error}</p>
          <p className="text-xs text-zinc-600">Preview no disponible para este archivo</p>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-full shadow-2xl transition-opacity duration-300 ${loading ? "opacity-0" : "opacity-100"}`}
          style={{ imageRendering: "auto" }}
        />
      )}
    </div>
  );
}
