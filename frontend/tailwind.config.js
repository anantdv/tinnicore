/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#060816",
          900: "#0b1022",
          800: "#121a36",
          700: "#1d2950",
        },
        ember: {
          300: "#ffb08f",
          500: "#ff7b54",
          700: "#d14d2a",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.08), 0 24px 80px rgba(0,0,0,0.4)",
      },
      backgroundImage: {
        "mesh-grid":
          "radial-gradient(circle at top left, rgba(255,123,84,0.18), transparent 28%), radial-gradient(circle at top right, rgba(84,156,255,0.14), transparent 24%), linear-gradient(180deg, #0b1022 0%, #060816 100%)",
      },
    },
  },
  plugins: [],
};
