import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2023, globals: { ...globals.browser, ...globals.worker } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      // Privacy rule: no third-party telemetry or ad-hoc network calls from app code.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*analytics*', '*sentry*', '*posthog*', '*mixpanel*', '*amplitude*'],
              message: 'No analytics or telemetry: see docs/adr/0002.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/llm/**', 'src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Network access lives only in src/llm (model download). See docs/adr/0002.',
        },
        { name: 'XMLHttpRequest', message: 'No network calls from app code. See docs/adr/0002.' },
        { name: 'WebSocket', message: 'No network calls from app code. See docs/adr/0002.' },
      ],
    },
  },
);
