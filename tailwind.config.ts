import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Cabinet Grotesk", "Satoshi", "system-ui", "sans-serif"],
        sans: ["Cabinet Grotesk", "Satoshi", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
