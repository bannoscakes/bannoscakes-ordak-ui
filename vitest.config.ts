import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    // Exclude Playwright e2e tests - they run separately with `npm run test:e2e`
    exclude: [
      '**/node_modules/**',
      '**/build/**',
      '**/tests/e2e/**',  // Playwright tests
      '**/.{idea,git,cache,output,temp}/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

