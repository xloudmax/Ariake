const neostandard = require('neostandard');
const reactHooks = require('eslint-plugin-react-hooks');
const reactRefresh = require('eslint-plugin-react-refresh');
const globals = require('globals');

module.exports = neostandard({
  ignores: ['dist', 'node_modules', '.eslintrc.cjs', 'build', 'coverage', 'dist-static', 'src/generated', '**/.backup-*/**'],
  ts: true,
}).concat([
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-console': 'warn',
      'no-debugger': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-function': 'off',
      '@stylistic/indent': 'off',
      '@stylistic/jsx-indent': 'off',
      '@stylistic/jsx-indent-props': 'off',
      '@stylistic/jsx-closing-tag-location': 'off',
      '@stylistic/jsx-closing-bracket-location': 'off',
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/brace-style': 'off',
    },
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: [
      'src/components/LiquidKit/**',
      'src/components/liquid-system/**',
      'src/pages/LiquidGlassTestPage.tsx',
      'src/**/*.test.{js,jsx,ts,tsx}',
      'src/**/*.spec.{js,jsx,ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components/LiquidKit/glass',
                '@/components/LiquidKit/use-liquid-surface',
                './LiquidKit/glass',
                './LiquidKit/use-liquid-surface',
                '../LiquidKit/glass',
                '../LiquidKit/use-liquid-surface',
                '../components/LiquidKit/glass',
                '../components/LiquidKit/use-liquid-surface',
              ],
              message: 'Use HeroGlass, InteractiveGlass, CheapGlass, or the liquid-system presets instead of importing the raw liquid engine.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  }
]);
