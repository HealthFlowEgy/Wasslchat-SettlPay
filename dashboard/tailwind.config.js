module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { 50:'#f0fdf4', 100:'#dcfce7', 500:'#22c55e', 600:'#16a34a', 700:'#15803d' },
        surface: { 50:'#f8fafc', 100:'#f1f5f9', 200:'#e2e8f0', 500:'#64748b', 800:'#1e293b', 900:'#0f172a' },
      },
      fontFamily: { sans: ['Cairo', 'Noto Sans Arabic', 'sans-serif'] },
    },
  },
  plugins: [],
};
