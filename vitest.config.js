import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // or 'jsdom', 'node'
    globals: true, // to use vitest's APIs globally
    setupFiles: ['./test/setup.js'],
    exclude: [...configDefaults.exclude, 'e2e/**', 'playwright-report/**', 'test-results/**', 'screenshots/**'],
  },
});
