/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Colores oficiales por tipo Pokémon
        type: {
          normal: '#9099a1',
          fire: '#ff9d55',
          water: '#4d90d5',
          electric: '#f4d23c',
          grass: '#63bc5a',
          ice: '#73cec0',
          fighting: '#ce4069',
          poison: '#ab6ac8',
          ground: '#d97746',
          flying: '#8fa8dd',
          psychic: '#fa7179',
          bug: '#90c12c',
          rock: '#c7b78b',
          ghost: '#5269ac',
          dragon: '#0b6dc3',
          dark: '#5a5366',
          steel: '#5a8ea1',
          fairy: '#ec8fe6',
        },
      },
      fontFamily: {
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        // Fuente pixel del LCD de la Cyber PokéBall
        lcd: ['"Press Start 2P"', 'monospace'],
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%,60%': { transform: 'translateX(-6px)' },
          '40%,80%': { transform: 'translateX(6px)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'float': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'faint': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(40px)', opacity: '0' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
        'pop-in': 'pop-in 0.25s ease-out',
        float: 'float 3s ease-in-out infinite',
        faint: 'faint 0.6s ease-in forwards',
      },
    },
  },
  plugins: [],
}
