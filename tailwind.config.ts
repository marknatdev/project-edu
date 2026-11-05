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
        indigo: {
          500: "#6366F1",
          DEFAULT: "#6366F1",
          600: "#4F46E5",
        },
        pink: {
          500: "#EC4899",
          DEFAULT: "#EC4899",
        },
        mint: {
          500: "#10B981",
          DEFAULT: "#10B981",
        },
        amber: {
          500: "#F59E0B",
          DEFAULT: "#F59E0B",
        },
        red: {
          500: "#EF4444",
          DEFAULT: "#EF4444",
        },
      },
      fontFamily: {
        prompt: ["var(--font-prompt)", "sans-serif"],
        jakarta: ["var(--font-plus-jakarta)", "sans-serif"],
        sans: ["var(--font-prompt)", "var(--font-plus-jakarta)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
