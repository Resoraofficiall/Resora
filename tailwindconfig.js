import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#0A0908",
        charcoal: "#141110",
        panel: "#18150F",
        gold: {
          DEFAULT: "#C6A567",
          light: "#E6D2A8",
          dark: "#8A7355",
        },
        ivory: "#EFE9DD",
        hairline: "#2A2622",
        bronze: "#8A7355",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.35em",
      },
      backgroundImage: {
        "gold-sweep":
          "linear-gradient(115deg, transparent 20%, rgba(198,165,103,0.35) 45%, rgba(230,210,168,0.6) 50%, rgba(198,165,103,0.35) 55%, transparent 80%)",
        "radial-glow":
          "radial-gradient(circle at 50% 30%, rgba(198,165,103,0.16), transparent 60%)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        pulseGold: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 3.5s linear infinite",
        floatSlow: "floatSlow 6s ease-in-out infinite",
        pulseGold: "pulseGold 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
