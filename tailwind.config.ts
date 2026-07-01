import type { Config } from "tailwindcss";

/**
 * Design system CamAIvo — dark glassmorphism, accents chauds ivoiriens.
 * Les tokens sont doublés en CSS vars dans src/styles/index.css.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Fonds
        ink: {
          DEFAULT: "#0A0B0F", // fond principal
          soft: "#0E1117", // fin de dégradé
        },
        // Surfaces verre
        glass: {
          DEFAULT: "rgba(255,255,255,0.04)",
          border: "rgba(255,255,255,0.08)",
        },
        // Accent primaire — orange chaud (CTA swap)
        ember: {
          DEFAULT: "#FF5A1F",
          light: "#FF7A00",
        },
        // Statuts OK / "En direct"
        live: "#22C55E",
        // Badge cloud
        cloud: "#3B82F6",
        // Points / crédits (jeton doré)
        token: "#F5C242",
        // Texte
        snow: "#F5F7FA",
        muted: "#9AA0AA",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Ombre orange diffuse du gros bouton swap
        ember: "0 8px 32px -8px rgba(255,90,31,0.5)",
        emberSoft: "0 4px 24px -6px rgba(255,90,31,0.35)",
        glass: "0 8px 32px rgba(0,0,0,0.35)",
      },
      backgroundImage: {
        "ember-gradient": "linear-gradient(135deg, #FF5A1F 0%, #FF7A00 100%)",
        "ink-gradient": "linear-gradient(180deg, #0A0B0F 0%, #0E1117 100%)",
      },
      keyframes: {
        "pulse-live": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      animation: {
        "pulse-live": "pulse-live 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
