import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Gate estructural: solo sobre el código que ya cumple. Deuda pendiente y
    // medición del resto del repo en docs/linters-por-stack/README.md.
    files: ['src/lib/**/*.{ts,tsx}', 'src/context/**/*.{ts,tsx}'],
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      complexity: ['error', 12],
      'no-nested-ternary': 'error',
    },
  },
  {
    // src/context todavía no lo cumple: SimulationProvider tiene 162 líneas.
    files: ['src/lib/**/*.{ts,tsx}'],
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
  ]),
])

export default eslintConfig
