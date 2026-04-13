import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kinetia — AI Animation Ecosystem",
  description: "Learn motion from videos. Generate smart presets. Export to After Effects.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-surface font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
