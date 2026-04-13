import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans:   ["var(--font-lexend)", "system-ui", "sans-serif"],
        quinque: ["var(--font-quinque)", "monospace"],
      },
      colors: {
        brand: {
          50:  "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d7fd",
          300: "#a5bcfb",
          400: "#7f96f7",
          500: "#5f72f0",
          600: "#4a55e4",
          700: "#3b42ca",
          800: "#3138a4",
          900: "#2c3482",
          950: "#1b1f4e",
        },
        surface: {
          DEFAULT: "#0f1117",
          elevated: "#181c27",
          card: "#1e2235",
          border: "#2a2f47",
          muted: "#3a4060",
        },
      },
      animation: {
        "fade-in":    "fadeIn 0.2s ease-out",
        "slide-up":   "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "spin-slow":  "spin 2s linear infinite",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;
