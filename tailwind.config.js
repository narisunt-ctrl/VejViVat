/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ยายพร้อม patient app palette
        yai: {
          deep: '#0A625B',
          teal: '#0E8B81',
          leaf: '#6EAB73',
          mint: '#E8F5EF',
          paper: '#FAFCFA',
          ink: '#15312E',
          warn: '#A75C16',
          alert: '#B42318',
          // public-health-app accents: calm blue header and pale sky background
          blue: '#0B6FB8',
          sky: '#EAF4FB',
          // green public-health-app theme
          green: '#2A8763',
          greendeep: '#1D6B4C',
          lime: '#B6EFC6',
        },
        // YaiPrompt Premium Longevity tokens (CSS variables in index.css, scoped to .lx)
        lx: Object.fromEntries(
          ['bg', 'surface', 'surface2', 'line', 'ink', 'muted', 'accent', 'link', 'onaccent', 'lime', 'forest', 'emerald', 'chart', 'warn', 'warnbg', 'alert', 'alertbg'].map((k) => [
            k,
            `rgb(var(--lx-${k}) / <alpha-value>)`,
          ])
        ),
        brand: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#0F766E', // Clinical Emerald / Teal
          800: '#115E59',
          900: '#134E4A',
          950: '#042F2E',
        },
        element: {
          earth: '#8B5A2B', // ดิน - น้ำตาลอำพัน
          water: '#0284C7', // น้ำ - ฟ้า
          wind: '#059669',  // ลม - เขียวอมเทา / มรกต
          fire: '#EA580C',  // ไฟ - ส้ม
        },
        warning: {
          high: '#DC2626',    // สูง - แดง
          mod: '#EA580C',     // ปานกลาง - ส้ม
          low: '#CA8A04',     // ต่ำ - เหลืองอำพัน
          unclear: '#6B7280', // ไม่มีข้อมูล - เทา
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', '"Noto Sans Thai"', 'Sarabun', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
        'card': '0 4px 20px -2px rgba(15, 118, 110, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
