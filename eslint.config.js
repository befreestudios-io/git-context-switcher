/**
 * ESLint configuration for Git Context Switcher
 * Compatible with ESLint v9+
 */
import js from '@eslint/js';
import securityPlugin from 'eslint-plugin-security';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    plugins: {
      security: securityPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Define globals available in Node.js environment
        console: 'readonly',
        process: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
      }
    },
    rules: {
      // Base ESLint rules
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      'no-console': 'off', // Allow console for CLI app
      'no-template-curly-in-string': 'error',
      
      // Security plugin rules
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn', // CLI app needs child_process
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-unsafe-regex': 'warn',
    },
  },
  {
    // Test file specific configurations
    files: ['**/__tests__/**/*.js'],
    rules: {
      'no-console': 'off',
      'security/detect-non-literal-fs-filename': 'off', // Allow in tests
      'no-import-assign': 'off', // Allow module mocking in tests
    },
  },
];