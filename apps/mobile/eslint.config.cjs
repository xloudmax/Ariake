const neostandard = require('neostandard');
const reactHooks = require('eslint-plugin-react-hooks');
const globals = require('globals');

module.exports = neostandard({
  ignores: ['node_modules', '.expo', 'dist', 'src/generated', '.tmp', 'expo-env.d.ts', 'nativewind-env.d.ts'],
  ts: true,
}).concat([
  {
    files: ['**/*.{js,cjs,mjs,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      '@stylistic/indent': 'off',
      '@stylistic/jsx-indent': 'off',
      '@stylistic/jsx-indent-props': 'off',
      '@stylistic/jsx-closing-tag-location': 'off',
      '@stylistic/jsx-closing-bracket-location': 'off',
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/brace-style': 'off',
      '@stylistic/quotes': 'off',
      '@stylistic/semi': 'off',
      '@stylistic/space-before-function-paren': 'off',
      '@stylistic/comma-dangle': 'off',
      '@stylistic/jsx-quotes': 'off',
      '@stylistic/object-curly-spacing': 'off',
      '@stylistic/arrow-parens': 'off',
      '@stylistic/operator-linebreak': 'off',
    },
  },
  {
    files: ['**/*.test.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
]);
