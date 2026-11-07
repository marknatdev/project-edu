import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System v2 semantic tokens (src/app/globals.css).
        bg: token("bg"),
        surface: { DEFAULT: token("surface"), 2: token("surface2") },
        separator: token("separator"),
        control: token("control"),
        ink: { DEFAULT: token("ink"), 2: token("ink2"), 3: token("ink3") },
        accent: { DEFAULT: token("accent"), press: token("accent-press"), tint: token("accent-tint"), text: token("accent-text"), on: token("on-accent") },
        good: { DEFAULT: token("good"), tint: token("good-tint") },
        caution: { DEFAULT: token("caution"), tint: token("caution-tint") },
        risk: { DEFAULT: token("risk"), tint: token("risk-tint") },
        // Legacy v1 brand colours, still used by pages not yet restyled.
        indigo: { 500: "#6366F1", DEFAULT: "#6366F1", 600: "#4F46E5" },
        pink: { 500: "#EC4899", DEFAULT: "#EC4899" },
        mint: { 500: "#10B981", DEFAULT: "#10B981" },
        amber: { 500: "#F59E0B", DEFAULT: "#F59E0B" },
        red: { 500: "#EF4444", DEFAULT: "#EF4444" },
      },
      fontFamily: {
        head: ["var(--font-head)", "var(--font-body)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        // v1 class names map to the v2 heading face.
        prompt: ["var(--font-head)", "var(--font-body)", "sans-serif"],
        jakarta: ["var(--font-head)", "var(--font-body)", "sans-serif"],
      },
      fontSize: {
        // v2 type ramp (Figma text styles v2/*): size, line-height.
        display: ["2.75rem", { lineHeight: "3.625rem", fontWeight: "600" }],
        "large-title": ["2rem", { lineHeight: "2.75rem", fontWeight: "600" }],
        title: ["1.5rem", { lineHeight: "2.125rem", fontWeight: "600" }],
        headline: ["1.125rem", { lineHeight: "1.75rem", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.625rem" }],
        callout: ["0.875rem", { lineHeight: "1.375rem" }],
        caption: ["0.8125rem", { lineHeight: "1.25rem", fontWeight: "500" }],
      },
      boxShadow: {
        e1: "0 1px 3px rgb(0 0 0 / 0.06)",
        e2: "0 4px 16px rgb(0 0 0 / 0.08)",
        e3: "0 12px 40px rgb(0 0 0 / 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
