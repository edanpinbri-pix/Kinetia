"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AppHeader({ title, subtitle, actions }: Props) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="border-b border-surface-border px-8 py-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="font-quinque text-sm text-gradient shrink-0">K</Link>
        <span className="text-surface-border">|</span>
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <button
          onClick={() => void handleLogout()}
          className="text-xs text-zinc-500 hover:text-red-400 transition-colors px-3 py-1.5 border border-surface-border hover:border-red-900 rounded-lg"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
