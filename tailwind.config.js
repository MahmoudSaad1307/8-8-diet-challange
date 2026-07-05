/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
        display: ['Cairo', 'Tajawal', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#070a09',
          900: '#0a0f0d',
          850: '#0d1411',
          800: '#111a16',
          750: '#152019',
          700: '#1a2820',
          600: '#243029',
          500: '#33433a',
        },
        neon: {
          emerald: '#10e0a0',
          cyan: '#22d3ee',
          amber: '#fbbf24',
          rose: '#fb7185',
        },
      },
      boxShadow: {
        'neon-emerald': '0 0 0 1px rgba(16,224,160,0.25), 0 0 24px -4px rgba(16,224,160,0.45)',
        'neon-cyan': '0 0 0 1px rgba(34,211,238,0.25), 0 0 24px -4px rgba(34,211,238,0.45)',
        'neon-amber': '0 0 0 1px rgba(251,191,36,0.25), 0 0 24px -4px rgba(251,191,36,0.45)',
        'neon-rose': '0 0 0 1px rgba(251,113,133,0.25), 0 0 24px -4px rgba(251,113,133,0.45)',
        'inset-line': 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'ring-fill': {
          '0%': { strokeDashoffset: 'var(--from)' },
          '100%': { strokeDashoffset: 'var(--to)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
