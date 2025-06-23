/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pod: {
          violet: {
            DEFAULT: '#6B46C1',
            dark: '#553C9A',
            light: '#8B5CF6',
          },
          blue: {
            DEFAULT: '#3B82F6',
            dark: '#1E40AF',
            light: '#60A5FA',
          },
          green: {
            DEFAULT: '#10B981',
            dark: '#047857',
            light: '#34D399',
          },
          red: {
            DEFAULT: '#EF4444',
            dark: '#DC2626',
            light: '#F87171',
          },
          yellow: {
            DEFAULT: '#F59E0B',
            dark: '#D97706',
            light: '#FBBF24',
          },
          gray: {
            DEFAULT: '#6B7280',
            dark: '#374151',
            light: '#9CA3AF',
          },
          background: '#0F0F23',
          'bg-dark': '#1A1A2E',
          'bg-darker': '#0B0B1A',
          surface: {
            DEFAULT: '#1A1A2E',
            light: '#16213E',
          },
          text: {
            DEFAULT: '#E2E8F0',
            muted: '#94A3B8',
            light: '#F8FAFC',
          },
          accent: '#6B46C1',
          border: {
            DEFAULT: '#334155',
            light: '#475569',
          },
          danger: '#F43F5E',
          bg: {
            dark: '#1A1A2E',
            darker: '#0F0F23',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'pod-gradient': 'linear-gradient(135deg, #6B46C1 0%, #3B82F6 50%, #10B981 100%)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}