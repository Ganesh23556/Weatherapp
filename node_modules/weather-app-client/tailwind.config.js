/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
      }
    }
  },
  plugins: []
};

