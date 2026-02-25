import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  darkMode: ['class', '[data-theme]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        accent2: 'var(--accent2)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        warn: 'var(--warn)',
      },
      boxShadow: {
        glow: '0 0 20px var(--glow)',
        'glow-sm': '0 0 10px var(--glow)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
