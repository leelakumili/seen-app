import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: '#f5f0e6',
          dark:    '#ede8dc',
        },
        navy: {
          DEFAULT: '#1a2d5a',
          light:   '#243d73',
          dark:    '#111e3d',
        },
        amber: {
          DEFAULT: '#c9924a',
          light:   '#dba968',
          muted:   '#e8d5b0',
        },
        ink:    '#2a2318',
        muted:  '#8a7e6a',
        border: '#ddd5c3',
        seen: {
          white: '#ffffff',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        sans:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg:  '8px',
        md:  '6px',
        sm:  '4px',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [typography],
}

export default config
