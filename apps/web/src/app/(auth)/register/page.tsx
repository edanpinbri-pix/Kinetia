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

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/projects");
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <BackArrow />
        <div className="text-center mb-8">
          <span className="font-quinque text-2xl text-gradient">Kinetia</span>
          <p className="text-sm text-zinc-400 mt-2">Crea tu cuenta</p>
        </div>

        <form onSubmit={(e) => void handleRegister(e)} className="glass rounded-xl p-6 space-y-4">
          {[
            { label: "Nombre", value: name, setter: setName, type: "text", placeholder: "Tu nombre" },
            { label: "Correo", value: email, setter: setEmail, type: "email", placeholder: "tu@correo.com" },
            { label: "Contraseña", value: password, setter: setPassword, type: "password", placeholder: "Mín. 8 caracteres" },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-xs text-zinc-400 block mb-1.5">{field.label}</label>
              <input
                type={field.type}
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                required
                placeholder={field.placeholder}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          ))}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-4">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300">Iniciar sesión</Link>
        </p>
      </div>
    </main>
  );
}
