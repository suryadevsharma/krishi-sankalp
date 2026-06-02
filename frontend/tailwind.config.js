/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a5c2a',
          light: '#2a7c3e',
          dark: '#103d1a',
        },
        accent: {
          DEFAULT: '#d4870a',
          light: '#faaa25',
          dark: '#a36605',
        },
        background: {
          DEFAULT: '#f9f6f0',
          card: '#ffffff',
          dark: '#1e293b',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 4px 20px -2px rgba(26, 92, 42, 0.08), 0 2px 8px -1px rgba(26, 92, 42, 0.04)',
        premiumHover: '0 10px 30px -4px rgba(26, 92, 42, 0.12), 0 4px 12px -2px rgba(26, 92, 42, 0.06)',
      }
    },
  },
  plugins: [],
}
