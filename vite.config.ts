import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' : l'app fonctionne depuis n'importe quel sous-dossier (GitHub Pages, Netlify, serveur local…)
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
