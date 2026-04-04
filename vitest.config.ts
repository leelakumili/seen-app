import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    coverage: {
      provider:   'v8',
      reporter:   ['text', 'lcov'],
      include:    ['ai/**', 'electron/**', 'src/lib/**'],
      exclude:    ['electron/main.ts', 'electron/preload.ts', '**/*.d.ts'],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
