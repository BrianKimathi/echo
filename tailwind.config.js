/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B6E4F',
          50: '#E6F2EE',
          100: '#CCE6DD',
          200: '#99CCBB',
          300: '#66B399',
          400: '#339977',
          500: '#0B6E4F',
          600: '#095840',
          700: '#074232',
          800: '#052C24',
          900: '#021611',
        },
        secondary: {
          DEFAULT: '#1C9A6D',
          50: '#E7F4EF',
          100: '#CFE9DF',
          200: '#9FD3BF',
          300: '#6FBE9F',
          400: '#3FA87F',
          500: '#1C9A6D',
          600: '#167B57',
          700: '#115C41',
          800: '#0B3D2B',
          900: '#061E16',
        },
        accent: {
          DEFAULT: '#F4B400',
          50: '#FEF6DD',
          100: '#FDEDBB',
          200: '#FBDB77',
          300: '#F9C933',
          400: '#F4B400',
          500: '#C79100',
          600: '#9A6E00',
          700: '#6D4E00',
          800: '#402D00',
          900: '#1A1200',
        },
        background: '#F7F9FB',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        card: '0 4px 16px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
        elevated: '0 8px 30px rgba(0,0,0,0.10)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
