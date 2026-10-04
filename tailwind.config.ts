import type { Config } from "tailwindcss";

/**
 * Khaki AI — "Obsidian Atelier" tokens.
 * Colours that must react to the Studio Controls accent preset live in CSS
 * variables (see globals.css); everything else is a fixed obsidian ramp.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      /**
       * Every integer percentage, not just the default multiples of five.
       *
       * Tailwind only emits a colour opacity modifier (`ring-gold-500/22`) when
       * the value exists in the opacity scale. Without this, an off-scale value
       * is dropped silently and the utility falls back to its base colour —
       * which is why a gold ring rendered as Tailwind's default blue.
       */
      opacity: Object.fromEntries(
        Array.from({ length: 101 }, (_, percent) => [percent, String(percent / 100)]),
      ),
      colors: {
        void: "#000000",
        obsidian: {
          1: "rgb(var(--k-elev-1) / <alpha-value>)",
          2: "rgb(var(--k-elev-2) / <alpha-value>)",
          3: "rgb(var(--k-elev-3) / <alpha-value>)",
          4: "rgb(var(--k-elev-4) / <alpha-value>)",
          5: "rgb(var(--k-elev-5) / <alpha-value>)",
        },
        gold: {
          /* Every shade is declared in the `rgb(R G B / <alpha-value>)` form so
             opacity modifiers (`text-gold-300/70`) work on all of them, not
             just on the scale-driving 500. */
          50: "rgb(255 251 239 / <alpha-value>)",
          100: "rgb(255 244 207 / <alpha-value>)",
          200: "rgb(251 231 168 / <alpha-value>)",
          300: "rgb(242 212 122 / <alpha-value>)",
          400: "rgb(229 190 83 / <alpha-value>)",
          500: "rgb(var(--gold-rgb) / <alpha-value>)",
          600: "rgb(184 145 42 / <alpha-value>)",
          700: "rgb(141 108 23 / <alpha-value>)",
          800: "rgb(92 68 10 / <alpha-value>)",
        },
        ink: {
          DEFAULT: "var(--k-text)",
          2: "var(--k-text-2)",
          3: "var(--k-text-3)",
          4: "var(--k-text-4)",
        },
      },
      fontFamily: {
        sans: ["var(--font-ui)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "14px", letterSpacing: "0.06em" }],
      },
      borderRadius: {
        xs: "var(--r-xs)",
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        "2xl": "var(--r-2xl)",
      },
      boxShadow: {
        hair: "inset 0 1px 0 var(--k-specular)",
        lift: "0 18px 48px -24px rgba(0,0,0,0.9)",
        deep: "0 28px 70px -28px rgba(0,0,0,0.95)",
        gold: "0 0 30px -10px rgb(var(--gold-rgb) / 0.5)",
        "gold-lg": "0 0 60px -14px rgb(var(--gold-rgb) / 0.55)",
      },
      transitionTimingFunction: {
        fluid: "cubic-bezier(0.32, 0.72, 0, 1)",
        expo: "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.42, 0.64, 1)",
      },
      transitionDuration: {
        1: "140ms",
        2: "240ms",
        3: "420ms",
        4: "680ms",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translate3d(0,14px,0) scale(0.985)", filter: "blur(6px)" },
          to: { opacity: "1", transform: "none", filter: "blur(0)" },
        },
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
        breathe: {
          "0%,100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.045)" },
        },
        halo: {
          "0%,100%": { opacity: "0.34", transform: "scale(0.94)" },
          "50%": { opacity: "0.72", transform: "scale(1.08)" },
        },
        spin: { to: { transform: "rotate(360deg)" } },
        caret: {
          "0%,45%": { opacity: "1" },
          "55%,100%": { opacity: "0.08" },
        },
        vu: {
          "0%,100%": { transform: "scaleY(0.28)" },
          "50%": { transform: "scaleY(1)" },
        },
        shimmer: {
          from: { transform: "translateX(-120%)" },
          to: { transform: "translateX(220%)" },
        },
        "drift-a": {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(4%,-3%,0) scale(1.12)" },
        },
        "drift-b": {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1.08)" },
          "50%": { transform: "translate3d(-5%,4%,0) scale(1)" },
        },
      },
      animation: {
        rise: "rise var(--dur-3) var(--ease-out-expo) both",
        fade: "fade var(--dur-2) var(--ease-fluid) both",
        breathe: "breathe 4.2s var(--ease-in-out-soft) infinite",
        halo: "halo 3.6s var(--ease-in-out-soft) infinite",
        spin: "spin 3.6s linear infinite",
        caret: "caret 1.05s steps(1,end) infinite",
        vu: "vu 0.9s var(--ease-in-out-soft) infinite",
        shimmer: "shimmer 2.1s var(--ease-in-out-soft) infinite",
        "drift-a": "drift-a 26s var(--ease-in-out-soft) infinite",
        "drift-b": "drift-b 34s var(--ease-in-out-soft) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
