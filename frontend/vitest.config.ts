import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html'],
      all: true,
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts'
      ]
    },
    environment: 'jsdom',
    globals: true
  },
  resolve: {
    alias: {
      '@core': resolve(__dirname, './src/core'),
      '@ui': resolve(__dirname, './src/ui'),
      '@rendering': resolve(__dirname, './src/rendering'),
      '@battle': resolve(__dirname, './src/core/battle'),
      '@effects': resolve(__dirname, './src/core/effects')
    }
  }
}); 