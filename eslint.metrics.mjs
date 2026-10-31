// Mide complejidad y tamaño de funciones en todo src/, sin bloquear el CI.
// Config aparte porque `pnpm lint` corre con --max-warnings 0 y estas reglas
// marcarían la deuda de src/components.
//
// Uso: pnpm exec eslint -c eslint.metrics.mjs src

import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintMetricsConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      complexity: ['warn', 12],
      'max-lines-per-function': [
        'warn',
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
      'no-nested-ternary': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
    '**/*.test.ts',
    '**/*.test.tsx',
  ]),
])

export default eslintMetricsConfig
