import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        surface: {
          50: "#18181c",
          100: "#141417",
          200: "#101013",
          300: "#09090b",
          card: "#121216",
          subtle: "#1c1c22",
          apple: "#1c1c1e",
        },
        khaki: {
          gold: "#D4AF37",
          "gold-light": "#F5D061",
          "gold-dark": "#996515",
          "gold-glow": "rgba(212, 175, 55, 0.22)",
          muted: "#8e8e93",
          border: "rgba(255, 255, 255, 0.08)",
          "border-gold": "rgba(212, 175, 55, 0.35)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      boxShadow: {
        gold: "0 0 25px -4px rgba(212, 175, 55, 0.25)",
        "gold-lg": "0 0 40px -4px rgba(212, 175, 55, 0.38)",
        card: "0 8px 30px rgba(0, 0, 0, 0.6)",
        "apple-glass": "0 8px 32px 0 rgba(0, 0, 0, 0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-subtle": "pulseSubtle 3s ease-in-out infinite",
        soundwave: "soundwave 0.8s ease-in-out infinite alternate",
        "float-gentle": "floatGentle 4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.65" },
        },
        soundwave: {
          "0%": { height: "20%" },
          "100%": { height: "100%" },
        },
        floatGentle: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
