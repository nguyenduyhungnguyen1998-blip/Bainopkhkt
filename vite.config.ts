import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Bản dựng để đối chiếu khi nghiệm thu: commit ngắn + ngày build (vd "a1b2c3d · 2026-10-01").
const buildStamp = (() => {
  const date = new Date().toISOString().slice(0, 10);
  try {
    return `${execSync('git rev-parse --short HEAD').toString().trim()} · ${date}`;
  } catch {
    return date;
  }
})();

export default defineConfig({
  plugins: [preact()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD_STAMP__: JSON.stringify(buildStamp) },
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
