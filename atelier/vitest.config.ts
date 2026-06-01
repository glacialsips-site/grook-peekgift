import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      exclude: [
        'tests/**',
        '.next/**',
        'node_modules/**',
        'db/migrations/**',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
