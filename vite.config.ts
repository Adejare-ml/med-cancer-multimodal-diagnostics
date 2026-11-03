import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: 'frontend',
  envDir: '..',
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5173 },
  preview: { port: 4173 },
  test: {
    root: '.',
    environment: 'jsdom',
    include: ['tests/frontend/**/*.test.ts'],
  },
});
