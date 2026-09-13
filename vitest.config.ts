import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
      'apps/*/tests/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['apps/server/src/game/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts'],
    },
  },
});
