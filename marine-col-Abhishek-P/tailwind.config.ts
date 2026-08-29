import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          deep:    '#0a1628',
          dark:    '#0d2040',
          mid:     '#1a3a6b',
          blue:    '#1e5fa8',
          bright:  '#2d8bba',
          light:   '#7ec8e3',
          pale:    '#b8dff0',
          white:   '#e8f4fb',
        },
        status: {
          go:      '#22c55e',
          caution: '#f59e0b',
          nogo:    '#ef4444',
          info:    '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
        glass: '20px',
        heavy: '40px',
      },
      boxShadow: {
        glass:  '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
        glow:   '0 0 24px rgba(46,139,186,0.4)',
        'glow-sm': '0 0 12px rgba(46,139,186,0.25)',
        card:   '0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'wave-slow':   'wave 12s ease-in-out infinite',
        'wave-mid':    'wave 8s ease-in-out infinite reverse',
        'wave-fast':   'wave 5s ease-in-out infinite',
        'fade-up':     'fadeUp 0.5s ease forwards',
        'fade-in':     'fadeIn 0.4s ease forwards',
        'slide-in':    'slideIn 0.35s ease forwards',
        'pulse-glow':  'pulseGlow 2s ease-in-out infinite',
        'spin-slow':   'spin 3s linear infinite',
        'bounce-soft': 'bounceSoft 2s ease-in-out infinite',
        'typing':      'typing 1.2s steps(3) infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'translateX(0) translateY(0) scaleY(1)' },
          '33%':       { transform: 'translateX(-20px) translateY(-8px) scaleY(1.03)' },
          '66%':       { transform: 'translateX(20px) translateY(6px) scaleY(0.98)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(46,139,186,0.3)' },
          '50%':       { boxShadow: '0 0 28px rgba(46,139,186,0.7)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-6px)' },
        },
        typing: {
          '0%':   { content: "''" },
          '33%':  { content: "'.'" },
          '66%':  { content: "'..'" },
          '100%': { content: "'...'" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
