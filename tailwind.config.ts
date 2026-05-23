import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mallatex: {
          green: {
            50: '#F1F8F2',
            100: '#E8F5E9',
            200: '#C8E6C9',
            300: '#A5D6A7',
            400: '#81C784',
            500: '#4CAF50',
            600: '#3B9742',
            700: '#2D7A3E',
            800: '#1F5E2E',
            900: '#143F1E',
          },
          earth: {
            500: '#8D6E63',
            700: '#5D4037',
            900: '#3E2723',
          },
          sun: {
            300: '#FFD180',
            500: '#FFA726',
            700: '#F57C00',
          },
          sky: {
            300: '#81D4FA',
            500: '#29B6F6',
            700: '#0288D1',
          },
          soil: {
            50: '#FAFAFA',
            100: '#F4F4F5',
            200: '#E4E4E7',
            300: '#D4D4D8',
            500: '#71717A',
            700: '#3F3F46',
            900: '#1B1B1B',
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px rgba(20, 63, 30, 0.08), 0 1px 2px rgba(20, 63, 30, 0.04)',
        elevated: '0 10px 30px -10px rgba(20, 63, 30, 0.25)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
}

export default config
