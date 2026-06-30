import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Severity / status palette used across findings & POA&Ms
        cat1: "#dc2626",
        cat2: "#ea580c",
        cat3: "#ca8a04",
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d4d9e3",
          300: "#aeb7c9",
          400: "#8290a9",
          500: "#61708c",
          600: "#4c5972",
          700: "#3e485d",
          800: "#363e4f",
          900: "#1f2533",
          950: "#13171f",
        },
      },
    },
  },
  plugins: [],
};

export default config;
