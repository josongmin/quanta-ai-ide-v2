// ESLint flat config — strict.
//
// Enforces:
//   • TypeScript strict (no any, no unused, no floating promises, exhaustive-deps)
//   • React + hooks + react-refresh
//   • Import hygiene (no-cycle, no-self-import, no-duplicates) + auto unused-imports
//   • JSX a11y baseline
//   • Feature-Sliced layer boundaries (boundaries v6 dependencies rule):
//       app > pages > widgets > features > entities > shared
//     Lower layers can't import upward.

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
  // Ignore build artifacts.
  {
    ignores: [
      'dist',
      'node_modules',
      'pnpm-lock.yaml',
      'src-tauri',
      'scripts',
      '*.config.js',
      'vite.config.ts',
      'vitest.config.ts',
      'tailwind.config.js',
      'postcss.config.js',
      'eslint.config.js',
    ],
  },

  // Base JS recommendations
  js.configs.recommended,

  // TypeScript strict (type-aware) — strictTypeChecked is the most aggressive
  // tier and includes all of recommendedTypeChecked.
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // App rules
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
      'unused-imports': unusedImports,
      'jsx-a11y': jsxA11y,
      boundaries,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: {
        // Use TypeScript's project service so the parser walks the root
        // tsconfig's `references` instead of treating each project as
        // independent (which produces "Multiple projects found" warnings).
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: '18.3' },
      'import/resolver': {
        typescript: {
          project: ['./tsconfig.app.json', './tsconfig.node.json'],
          noWarnOnMultipleProjects: true,
        },
        node: true,
      },
      // FSD elements.
      'boundaries/elements': [
        { type: 'app',      pattern: 'src/app/**' },
        { type: 'pages',    pattern: 'src/pages/**' },
        { type: 'widgets',  pattern: 'src/widgets/**' },
        { type: 'features', pattern: 'src/features/**' },
        { type: 'entities', pattern: 'src/entities/**' },
        { type: 'shared',   pattern: 'src/shared/**' },
      ],
      'boundaries/include': ['src/**/*'],
    },
    rules: {
      // ── React ──
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      // Many feature folders co-locate Context + Provider + hook in one
      // file (Provider stays a component, hook + helpers ride along). That
      // hot-reload caveat is acceptable here.
      'react-refresh/only-export-components': 'off',
      'react/jsx-key': 'error',
      'react/jsx-no-target-blank': 'error',

      // ── TypeScript strict overrides ──
      '@typescript-eslint/no-explicit-any': 'error',
      // `Map.get(key)!` after a known-safe `has` check is the canonical
      // pattern in this codebase; `!` is concise and removing it requires
      // restructuring. Disabled at the rule level — guard with TS narrowing
      // when adding new code.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      // strictTypeChecked enables this aggressively; under our build mode
      // (`noUncheckedIndexedAccess: false`) it fires on any defensive guard
      // for indexed access. Drop to off — `strictNullChecks` already covers
      // the genuine nullability mistakes.
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off',

      // Unused — let the dedicated plugin own it (auto-fixable).
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],

      // ── Import hygiene (without the buggy `import/order` rule on flat config) ──
      'import/no-cycle': ['error', { maxDepth: 5 }],
      'import/no-self-import': 'error',
      'import/no-duplicates': 'error',
      'import/newline-after-import': 'error',

      // ── jsx-a11y baseline ──
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'react/button-has-type': 'warn',

      // ── FSD boundaries (v6 dependencies rule) ──
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message: 'Layer "${file.type}" cannot import from "${dependency.type}"',
          rules: [
            { from: [['app']],      allow: [['pages'], ['widgets'], ['features'], ['entities'], ['shared']] },
            { from: [['pages']],    allow: [['widgets'], ['features'], ['entities'], ['shared']] },
            { from: [['widgets']],  allow: [['features'], ['entities'], ['shared'], ['widgets']] },
            { from: [['features']], allow: [['entities'], ['shared'], ['features']] },
            { from: [['entities']], allow: [['shared'], ['entities']] },
            { from: [['shared']],   allow: [['shared']] },
          ],
        },
      ],

      // ── Hygiene ──
      // Existing code uses `cond ? doA() : doB();` ternaries as statements;
      // grandfather that pattern in. `&&`/`||` shortcuts also kept enabled.
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'smart'],
      // `+e.target.value` on `<input type=range>` returns a number; that's
      // idiomatic React. The strict alternative `Number(...)` is exactly
      // equivalent. Keeping it as a non-blocking warning produced noise.
      'no-implicit-coercion': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'Use string union types instead of TS enums.',
        },
      ],
    },
  },

  // Tests — relax
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
    rules: {
      'unused-imports/no-unused-vars': 'off',
      'boundaries/dependencies': 'off',
    },
  },
);
