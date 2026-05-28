import next from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'db/migrations/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts'
    ]
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@next/next': next
    },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
      'no-console': ['warn', { allow: ['error', 'warn'] }]
    }
  },
  {
    files: ['tests/**/*.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      'no-console': 'off'
    }
  },
  {
    // MOAT GUARDRAIL (STACK-LOCK #2): the slug renderer must paint ONLY from
    // `var(--vibe-*)`. Ban literal color strings (hex / numeric rgb()/hsl())
    // in renderer components at lint time. `hsl(var(--…))` is allowed — it
    // carries no literal hue. The CSS module is covered by the companion
    // lint-test `tests/unit/renderer-vars-only.test.ts`.
    files: ['components/renderer/**/*.tsx', 'components/renderer/**/*.ts'],
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message:
            'Renderer must use var(--vibe-*) for color, not a hex literal (STACK-LOCK guardrail #2).'
        },
        {
          selector:
            "Literal[value=/\\b(?:rgb|rgba|hsl|hsla)\\(\\s*[0-9.]/]",
          message:
            'Renderer must use var(--vibe-*) for color, not a numeric rgb()/hsl() literal (STACK-LOCK guardrail #2).'
        },
        {
          selector:
            "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]",
          message:
            'Renderer must use var(--vibe-*) for color, not a hex literal in a template string (STACK-LOCK guardrail #2).'
        }
      ]
    }
  }
];
