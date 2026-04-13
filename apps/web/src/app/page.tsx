import Link from "next/link";

const FEATURES = [
  { icon: "🧠", title: "Learn from references", description: "Upload MP4 videos — Kinetia extracts the motion skeleton using Claude Vision. Easing, velocity, bounce — not pixels." },
  { icon: "⚡", title: "Physics-driven presets", description: "Every preset is a mathematical description of motion. Apply it to any PSD layer and the physics engine handles the rest." },
  { icon: "🎯", title: "Natural language control", description: 'Tell Kinetia "make it softer and floatier" — the AI translates your words into precise physics modifier changes.' },
  { icon: "📐", title: "Smart layer mapping", description: "Kinetia reads your PSD/AI hierarchy and automatically matches presets to the right layer types." },
  { icon: "🎬", title: "Export to After Effects", description: "One-click export generates a fully editable AE project with live text, editable vectors, and injected expressions." },
  { icon: "🔌", title: "Native AE plugin", description: "Import Kinetia packages directly into After Effects and fine-tune physics without breaking the animation." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="border-b border-surface-border px-8 py-4 flex items-center justify-between">
        <span className="font-quinque text-xl text-gradient">Kinetia</span>
        <div className="flex gap-3 items-center">
          <Link href="/presets" className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">Presets</Link>
          <Link href="/train"   className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">Train</Link>
          <Link href="/login"   className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">Login</Link>
          <Link href="/projects" className="text-sm bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-md transition-colors">Open Studio</Link>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-8 py-24">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-brand-400 bg-brand-950/50 border border-brand-900 rounded-full px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-slow" />
            AI-powered motion design
          </div>
          <h1 className="font-quinque text-5xl md:text-7xl tracking-tight leading-none mb-6">
            <span className="text-white">Animate</span>{" "}
            <span className="text-gradient">at the speed</span>
            <br />
            <span className="text-white">of thought</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Upload video references. Kinetia learns your motion style, generates intelligent
            presets, and exports a fully editable After Effects project.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/train" className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors">
              Start training
            </Link>
            <Link href="/presets" className="px-6 py-3 bg-surface-card hover:bg-surface-elevated text-white border border-surface-border rounded-lg font-medium transition-colors">
              Browse presets
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-surface-border px-8 py-16">
        <div className="max-w-6xl mx-auto grid-12">
          {FEATURES.map((f) => (
            <div key={f.title} className="col-span-12 md:col-span-4 glass rounded-xl p-6">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
