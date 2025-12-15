import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // KPD Brand Green #6CAF7B
        primary: {
          50: '#f2f8f4',
          100: '#e0efe4',
          200: '#c3dfcb',
          300: '#9ac9a7',
          400: '#6CAF7B', // Brand color
          500: '#6CAF7B', // Brand color (main)
          600: '#4e8a5e',
          700: '#3f6f4b',
          800: '#35593f',
          900: '#2d4935',
          950: '#16271c',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          700: '#b45309',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
