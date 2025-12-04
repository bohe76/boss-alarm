import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // or 'jsdom', 'node'
    globals: true, // to use vitest's APIs globally
    setupFiles: ['./test/setup.js'],
  },
});
