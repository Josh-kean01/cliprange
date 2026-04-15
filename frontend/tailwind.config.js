/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        canvas: "var(--color-canvas)",
        "canvas-top": "var(--color-canvas-top)",
        panel: "var(--surface-strong)",
        "panel-soft": "var(--surface-soft)",
        "panel-inset": "var(--surface-inset)",
        ink: "var(--text-primary)",
        muted: "var(--text-muted)",
        border: "var(--border-subtle)",
        accent: {
          start: "var(--accent-start)",
          end: "var(--accent-end)",
        },
      },
      borderRadius: {
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
        hero: "var(--radius-hero)",
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        "panel-soft": "var(--shadow-panel-soft)",
        hero: "var(--shadow-hero)",
        dialog: "var(--shadow-dialog)",
        button: "var(--shadow-button)",
      },
    },
  },
  plugins: [],
};
