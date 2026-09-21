import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [preact()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 5173 },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    // Debug HUD đã được tách chunk qua import() động trong src/app.tsx
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
