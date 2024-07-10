/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'midnightblue',
          100: '#151515cc',
          // add all other shades
        },
        foreground: {
          DEFAULT: '#ffffffdd'
        },
        accent: {
          DEFAULT: '#f15a24'
        },
        delft_blue: {
          DEFAULT: '#2d2e62',
          100: '#090914',
          200: '#121227',
          // add all other shades
        },
        moonstone: {
          DEFAULT: '#66999b',
          100: '#141e1f',
          // add all other shades
        },
        baby_powder: {
          DEFAULT: '#f7f7f2',
          100: '#3d3d25',
          // add all other shades
        },
        rose_quartz: {
          DEFAULT: '#ae8ca3',
          100: '#251a22',
          // add all other shades
        },
        bittersweet: {
          DEFAULT: '#fe5f55',
          100: '#430500',
          // add all other shades
        },
        azure: {
          DEFAULT: '#0077b6',
          100: '#001d3d',
          // add all other shades
        }
      }
    }
  },
  plugins: [],
}

