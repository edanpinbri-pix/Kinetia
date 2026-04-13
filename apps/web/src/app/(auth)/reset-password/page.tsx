"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const BackArrow = () => (
  <Link href="/" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-8">
    <svg viewBox="0 0 8 8" fill="currentColor" className="w-2.5 h-2.5">
      <rect x="4" y="0" width="2" height="2"/>
      <rect x="2" y="2" width="2" height="2"/>
      <rect x="0" y="3" width="2" height="2"/>
      <rect x="2" y="4" width="2" height="2"/>
      <rect x="4" y="6" width="2" height="2"/>
    </svg>
    Volver al inicio
  </Link>
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => router.push("/projects"), 2000);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <BackArrow />
        <div className="text-center mb-8">
          <span className="font-quinque text-2xl text-gradient">Kinetia</span>
          <p className="text-sm text-zinc-400 mt-2">Establece una nueva contraseña</p>
        </div>

        {done ? (
          <div className="glass rounded-xl p-6 text-center space-y-2">
            <p className="text-white text-sm font-medium">¡Contraseña actualizada!</p>
            <p className="text-zinc-400 text-xs">Redirigiendo…</p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleReset(e)} className="glass rounded-xl p-6 space-y-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
                placeholder="Mín. 8 caracteres"
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5">Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repite la contraseña"
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? "Actualizando…" : "Actualizar contraseña"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
