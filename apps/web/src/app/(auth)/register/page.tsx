"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
        <div className="text-center mb-8">
          <span className="font-quinque text-2xl text-gradient">Kinetia</span>
          <p className="text-sm text-zinc-400 mt-2">Create your account</p>
        </div>

        <form onSubmit={(e) => void handleRegister(e)} className="glass rounded-xl p-6 space-y-4">
          {[
            { label: "Name", value: name, setter: setName, type: "text", placeholder: "Your name" },
            { label: "Email", value: email, setter: setEmail, type: "email", placeholder: "you@example.com" },
            { label: "Password", value: password, setter: setPassword, type: "password", placeholder: "Min. 8 characters" },
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
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-4">
          Have an account?{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
