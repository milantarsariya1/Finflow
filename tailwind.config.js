/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#141b22',       // Dark obsidian slate
          panel: '#1f2933',    // Stormy charcoal slate
          card: '#293541',     // Deep Slate Card
          border: '#384959',   // Deep Charcoal Blue divider border (from palette)
          muted: '#6a89a7',    // Muted Steel Blue (from palette)
          text: '#bdddfc'      // Very Light Sky Blue text (from palette)
        },
        brand: {
          primary: '#88bdf2',  // Sky Blue highlight (from palette)
          secondary: '#6a89a7',// Steel Blue secondary (from palette)
          emerald: '#8fae98',  // Muted Sage Green (wealth/surplus)
          rose: '#cc8085'      // Muted Terracotta Rose (expenses/warnings)
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '16px',
        '3xl': '16px',
      }
    },
  },
  plugins: [],
}
