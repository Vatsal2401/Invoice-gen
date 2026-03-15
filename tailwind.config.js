/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A5F',
        'primary-light': '#2B5080',
        accent: '#2563EB',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        border: '#D1D5DB',
        'bg-base': '#F3F4F6',
        'bg-card': '#FFFFFF',
        'text-primary': '#111827',
        'text-secondary': '#6B7280'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
