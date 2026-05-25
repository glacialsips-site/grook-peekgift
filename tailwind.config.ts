import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'SF Pro Display', 'Inter', 'sans-serif'],
        serif: ['ui-serif', 'Georgia', 'Cambria', 'serif'],
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif']
      }
    }
  },
  plugins: []
};
export default config;
