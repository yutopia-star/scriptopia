/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-placeholder>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-placeholder>)',
        surface: 'rgb(var(--color-surface) / <alpha-placeholder>)',
        'surface-hover': 'rgb(var(--color-surface-hover) / <alpha-placeholder>)',
        muted: 'rgb(var(--color-muted) / <alpha-placeholder>)',
        'muted-foreground': 'rgb(var(--color-muted-foreground) / <alpha-placeholder>)',
        border: 'rgb(var(--color-border) / <alpha-placeholder>)',
        input: 'rgb(var(--color-input) / <alpha-placeholder>)',
        ring: 'rgb(var(--color-ring) / <alpha-placeholder>)',
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-placeholder>)',
          foreground: 'rgb(var(--color-primary-foreground) / <alpha-placeholder>)',
          hover: 'rgb(var(--color-primary-hover) / <alpha-placeholder>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary) / <alpha-placeholder>)',
          foreground: 'rgb(var(--color-secondary-foreground) / <alpha-placeholder>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-placeholder>)',
          foreground: 'rgb(var(--color-accent-foreground) / <alpha-placeholder>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-placeholder>)',
        },
        tertiary: {
          DEFAULT: 'rgb(var(--color-tertiary) / <alpha-placeholder>)',
          foreground: 'rgb(var(--color-tertiary-foreground) / <alpha-placeholder>)',
        },
        success: {
          DEFAULT: 'rgb(var(--color-success) / <alpha-placeholder>)',
          foreground: 'rgb(var(--color-success-foreground) / <alpha-placeholder>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning) / <alpha-placeholder>)',
          foreground: 'rgb(var(--color-warning-foreground) / <alpha-placeholder>)',
        },
        error: {
          DEFAULT: 'rgb(var(--color-error) / <alpha-placeholder>)',
          foreground: 'rgb(var(--color-error-foreground) / <alpha-placeholder>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'display-sm': ['2.5rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display': ['3.5rem', { lineHeight: '1.0', letterSpacing: '-0.035em' }],
        'display-lg': ['5rem', { lineHeight: '0.95', letterSpacing: '-0.04em' }],
        'display-xl': ['7rem', { lineHeight: '0.9', letterSpacing: '-0.045em' }],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
        lg: '10px',
        md: '8px',
        sm: '6px',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        30: '7.5rem',
        38: '9.5rem',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.06)',
        elevated: '0 8px 32px -8px rgb(0 0 0 / 0.3)',
        glow: '0 0 0 1px rgb(var(--color-accent) / 0.15), 0 12px 40px -8px rgb(var(--color-accent) / 0.15)',
        'inner-line': 'inset 0 1px 0 0 rgb(255 255 255 / 0.03)',
        cinematic: '0 24px 80px -16px rgb(0 0 0 / 0.5)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(32px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-slow': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'draw-line': {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        'grow-bar': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer-bg': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'mesh-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.95)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite',
        'fade-up': 'fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-slow': 'fade-in-slow 1s ease-out',
        'pulse-soft': 'pulse-soft 2.5s ease-in-out infinite',
        'draw-line': 'draw-line 1.5s ease-out forwards',
        'grow-bar': 'grow-bar 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'count-up': 'count-up 0.5s ease-out',
        'shimmer-bg': 'shimmer-bg 2s linear infinite',
        'mesh-drift': 'mesh-drift 20s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
