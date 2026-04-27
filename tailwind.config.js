/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#0D0F0E',
        surface: '#1A1D1B',
        border: '#2A2E2C',
        accent: '#4ADE80',
        warning: '#F59E0B',
        'text-primary': '#F0F2F0',
        'text-secondary': '#8A8F8C',
        'text-muted': '#4A4E4C',
        danger: '#EF4444',
        'never-cut': '#7F1D1D',
      },
      fontFamily: {
        mono: ['DMMono_400Regular', 'DMMono_500Medium', 'monospace'],
        body: ['Outfit_400Regular', 'Outfit_600SemiBold', 'Outfit_700Bold', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '4px',
      },
    },
  },
  plugins: [],
};
