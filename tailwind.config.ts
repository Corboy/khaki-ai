import type { Config } from "tailwindcss";
// Container queries are a first-class feature in Tailwind v4, but this project
// is on v3.4, where `@container` and the `@[21rem]:` variants generate nothing
// at all — silently, with no warning at build time. The components that need
// them (the sidebar contact buttons) then fall back to their narrowest layout
// and the failure looks like a styling choice rather than a missing plugin.
// `pnpm audit:classes` is what caught it: 14 `@[21rem]:*` tokens producing no
// CSS. Do not remove this without checking that audit passes.
import containerQueries from "@tailwindcss/container-queries";

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
        /*
         * The elevation scale matches `globals.css` exactly: three steps, all
         * of them reachable.
         *
         * Steps 1 and 5 were declared here and in the stylesheet and used by
         * nothing — no `bg-obsidian-1`, no `bg-obsidian-5`. `audit:css` flagged
         * the variables as defined-but-unused, which is the project's stated
         * bar for a dead token. They are gone rather than kept "for
         * completeness", because an unreferenced rung on a contrast ladder
         * invites someone to use a value nobody measured.
         *
         * `bg-obsidian-3` is the only elevation class currently in the tree.
         */
        obsidian: {
          2: "rgb(var(--k-elev-2) / <alpha-value>)",
          3: "rgb(var(--k-elev-3) / <alpha-value>)",
          4: "rgb(var(--k-elev-4) / <alpha-value>)",
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
        /*
         * Fluid display scale.
         *
         * Each step is a `clamp()` rather than a fixed size with a `sm:`
         * override, so text reflows continuously as the window resizes
         * instead of snapping at one breakpoint. The `vw` term is chosen so
         * the middle range lands on the value a designer would have picked
         * for that width; the clamp bounds are the phone and desktop ends.
         *
         * Source: linear.app's 13-token display/text split, reduced to the
         * steps this interface actually uses.
         */
        hero: ["clamp(2.125rem, 1.3rem + 3.9vw, 4.5rem)", { lineHeight: "1.02", letterSpacing: "-0.042em", fontWeight: "660" }],
        display: ["clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem)", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "640" }],
        title: ["clamp(1.125rem, 1.05rem + 0.4vw, 1.375rem)", { lineHeight: "1.24", letterSpacing: "-0.022em", fontWeight: "620" }],
        lead: ["clamp(1rem, 0.95rem + 0.4vw, 1.1875rem)", { lineHeight: "1.6", letterSpacing: "-0.012em" }],
        /* 16px floor on inputs/body is also what stops iOS Safari zooming
           when a field takes focus — see the note in globals.css. */
        body: ["clamp(0.96875rem, 0.95rem + 0.12vw, 1rem)", { lineHeight: "1.66", letterSpacing: "-0.008em" }],
        caption: ["0.8125rem", { lineHeight: "1.5", letterSpacing: "-0.004em" }],
        micro: ["0.71875rem", { lineHeight: "1.35", letterSpacing: "0.14em" }],
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
        halo: {
          "0%,100%": { opacity: "0.34", transform: "scale(0.94)" },
          "50%": { opacity: "0.72", transform: "scale(1.08)" },
        },
        spin: { to: { transform: "rotate(360deg)" } },
        caret: {
          "0%,45%": { opacity: "1" },
          "55%,100%": { opacity: "0.08" },
        },
        /* Scoped motion effects; each has a real consumer. */

        /* Waveform used by the pricing-card signal while it is generated. */
        wave: {
          "0%,100%": { transform: "scaleY(0.22)" },
          "50%": { transform: "scaleY(1)" },
        },

        /* Diagonal specular sweep across a surface. */
        sheen: {
          from: { transform: "translate3d(-140%,0,0) rotate(8deg)" },
          to: { transform: "translate3d(240%,0,0) rotate(8deg)" },
        },

      },
      animation: {
        /* Focused effects: enter, reveal, logo halo, text caret, and tool-card signal. */
        rise: "rise var(--dur-3) var(--ease-out-expo) both",
        fade: "fade var(--dur-2) var(--ease-fluid) both",
        halo: "halo 3.6s var(--ease-in-out-soft) infinite",
        spin: "spin 3.6s linear infinite",
        caret: "caret 1.05s steps(1,end) infinite",
        wave: "wave 1.1s var(--ease-in-out-soft) infinite",
        sheen: "sheen 3.4s var(--ease-in-out-soft) infinite",
      },
    },
  },
  plugins: [containerQueries],
};

export default config;
