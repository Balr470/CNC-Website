import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Ignore unused vars that start with uppercase (React components/icons in destructuring)
      // or start with _ (intentionally unused), or are catch-block error params
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^(_|[A-Z])',
        argsIgnorePattern: '^(_|[A-Z])',
        caughtErrorsIgnorePattern: '^_?error$|^_',
        caughtErrors: 'all',
        destructuredArrayIgnorePattern: '^_',
      }],
      // Suppress the false positive for refreshUser().finally(() => setLoading(false))
      // This is an intentional async init pattern, not a cascading render issue
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
