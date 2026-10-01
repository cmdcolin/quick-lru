import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import importPlugin from 'eslint-plugin-import-x'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      'dist/*',
      'esm/*',
      '**/*.mjs',
      // agent worktrees are whole checkouts of this repo living inside it, so
      // without this eslint lints every one of them against the root
      // tsconfig.lint.json and fails on files that are not in it. gitignored,
      // but eslint does not read .gitignore
      '.claude/**',
      'vitest.config.ts',
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.lint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylisticTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  importPlugin.flatConfigs.recommended,
  {
    rules: {
      '@typescript-eslint/parameter-properties': 'error',
      curly: 'error',
      'object-shorthand': 'error',
      eqeqeq: 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      semi: ['error', 'never'],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true },
      ],

      'import-x/no-unresolved': 'off',
      'import-x/extensions': ['error', 'always', { ignorePackages: true }],
      'import-x/order': [
        'error',
        {
          named: true,
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
          },
          groups: [
            'builtin',
            ['external', 'internal'],
            ['parent', 'sibling', 'index', 'object'],
            'type',
          ],
        },
      ],
    },
  },
)
