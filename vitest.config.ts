import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // src/components mide 0%: entra cuando tenga tests de widget.
      include: ['src/lib/**', 'src/context/**'],
      reporter: ['text', 'text-summary'],
      thresholds: {
        // A ras de lo medido, para que la cobertura solo pueda subir.
        statements: 70,
        branches: 80,
        functions: 73,
        lines: 72,
        'src/lib/**': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
      },
    },
  },
})
