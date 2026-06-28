import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // This repository is an interaction-heavy product prototype. Many form,
      // canvas and mock payloads are intentionally schema-less until their API
      // contracts are confirmed; TypeScript build remains the hard type gate.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      // Empty catches are used around optional localStorage/demo hydration.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Hydrating local component state from mock data, forms and localStorage
      // is intentional in this non-server-backed demo.
      'react-hooks/set-state-in-effect': 'off',
      // React Compiler diagnostics should not block the prototype's baseline.
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
])
