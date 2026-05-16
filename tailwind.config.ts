import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        monad: {
          purple: "#8b5cf6",
          "purple-light": "#a78bfa",
          "purple-dark": "#6d28d9",
          cyan: "#22d3ee",
          "cyan-light": "#67e8f9",
          pink: "#ec4899",
          "pink-light": "#f472b6",
        },
        surface: {
          primary: "#0a0a12",
          secondary: "#12121f",
          card: "#161628",
          "card-hover": "#1c1c35",
          border: "#2a2a45",
          "border-light": "#3a3a5c",
        },
        text: {
          primary: "#e8e8f0",
          secondary: "#9898b0",
          muted: "#6b6b85",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139,92,246,0.15), transparent)",
        "card-shine":
          "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, transparent 50%, rgba(34,211,238,0.05) 100%)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(139,92,246,0.25)",
        "glow-cyan": "0 0 20px rgba(34,211,238,0.25)",
        "glow-pink": "0 0 20px rgba(236,72,153,0.25)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;