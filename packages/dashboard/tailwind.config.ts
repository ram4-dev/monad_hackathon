import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#06070d',
        panel: '#0b1020',
        panelSoft: '#121931',
        borderStrong: '#2a3258',
        monad: '#8366ff',
        monadSoft: '#a79bff',
        success: '#22c55e',
        warning: '#facc15',
        danger: '#f43f5e',
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(131, 102, 255, 0.15), 0 16px 40px rgba(3, 6, 19, 0.55)',
      },
    },
  },
  plugins: [],
} satisfies Config;
