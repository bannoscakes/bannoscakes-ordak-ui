// .eslintrc.single-url.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    // Disallow hardcoded role URLs; single-URL architecture only
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value="/staff"], Literal[value="/supervisor"], Literal[value="/admin"]',
          message:
            'Hardcoded role URLs are forbidden. Use single URL + role guards (router decides by role).',
        },
      ],
    },
  },
];