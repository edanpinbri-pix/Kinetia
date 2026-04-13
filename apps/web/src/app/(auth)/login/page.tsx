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

type Mode = "login" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.replace("/projects");
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
  }

  if (mode === "forgot") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <BackArrow />
          <div className="text-center mb-8">
            <span className="font-quinque text-2xl text-gradient">Kinetia</span>
            <p className="text-sm text-zinc-400 mt-2">Recupera tu contraseña</p>
          </div>

          {resetSent ? (
            <div className="glass rounded-xl p-6 text-center space-y-3">
              <p className="text-white text-sm font-medium">Revisa tu correo</p>
              <p className="text-zinc-400 text-xs">Enviamos un enlace a <strong>{email}</strong></p>
              <button
                onClick={() => { setMode("login"); setResetSent(false); }}
                className="text-brand-400 hover:text-brand-300 text-xs transition-colors"
              >
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleForgot(e)} className="glass rounded-xl p-6 space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="tu@correo.com"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "Enviando…" : "Enviar enlace"}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-zinc-500 mt-4">
            <button onClick={() => setMode("login")} className="text-brand-400 hover:text-brand-300">
              Volver al inicio de sesión
            </button>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <BackArrow />
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-gradient">Kinetia</span>
          <p className="text-sm text-zinc-400 mt-2">Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={(e) => void handleLogin(e)} className="glass rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-zinc-400">Contraseña</label>
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-4">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-brand-400 hover:text-brand-300">
            Crear una
          </Link>
        </p>
      </div>
    </main>
  );
}
