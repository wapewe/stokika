// ESLint Configuration for Stokika TypeScript Rebuild
// Using flat config format (ESLint 9+)
// Note: TypeScript 7.0.2 is not yet fully supported by typescript-eslint
// Using TypeScript parser for syntax support only, without type-aware rules

import eslint from '@eslint/js';
import tsparser from '@typescript-eslint/parser';
import security from 'eslint-plugin-security';

export default [
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'build/**',
      '*.config.js',
      'backups/**',
      'api/**',
      'assets/**',
      '*.html',
      '*.php',
      '*.md'
    ]
  },

  // TypeScript files configuration
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
        // Note: Omitting 'project' to avoid type-aware rules that require TS 6.x
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        crypto: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        AbortController: 'readonly',
        performance: 'readonly'
      }
    },
    plugins: {
      security: security
    },
    rules: {
      // Security rules
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'warn',

      // Code quality rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn',
      'no-nested-ternary': 'warn',
      'no-unneeded-ternary': 'error',
      'no-duplicate-imports': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',

      // Best practices for security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-with': 'error',

      // Browser-specific security
      'no-inner-declarations': 'error',
      'no-proto': 'error',
      'no-iterator': 'error',

      // Async/await best practices
      'require-await': 'error',
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',

      // Error handling
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-ex-assign': 'error',

      // Data validation
      'no-unsafe-optional-chaining': 'error',

      // Prevent common mistakes
      'no-fallthrough': 'error',
      'no-case-declarations': 'error',
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-loss-of-precision': 'error',

      // TypeScript compilation will catch these, so reduce noise
      'no-undef': 'off',
      'no-unused-vars': 'off'
    }
  }
];
