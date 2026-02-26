/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ember: {
          900: "#1d1512",
          700: "#4a2e26",
          500: "#8a4a2a",
        },
      },
      boxShadow: {
        frost: "0 10px 40px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};
