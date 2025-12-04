/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        card: '0 10px 25px rgba(0, 0, 0, 0.05)',
      },
      colors: {
        brand: {
          50: '#e5f0ff',
          100: '#c3d9ff',
          200: '#9fc2ff',
          500: '#2563eb',
          600: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
}
