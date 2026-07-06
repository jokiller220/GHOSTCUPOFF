/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ghost: {
          black: '#0a0a0a',
          dark: '#111111',
          card: '#161616',
          border: '#2a2a2a',
          gold: '#c9a227',
          'gold-light': '#e2b93b',
          'gold-dark': '#9a7a1a',
          red: '#c0392b',
          'red-light': '#e74c3c',
          green: '#27ae60',
          gray: '#888888',
          'gray-light': '#cccccc',
        },
      },
      fontFamily: {
        barlow: ['"Barlow Condensed"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #c9a227 0%, #e2b93b 50%, #9a7a1a 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0a0a0a 0%, #161616 100%)',
      },
      animation: {
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 162, 39, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(201, 162, 39, 0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
