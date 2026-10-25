const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  js.configs.recommended,

  {
    files: ['**/*.js'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },

    rules: {
      'no-undef': 'error',
      eqeqeq: 'error',
      'no-unreachable': 'error',
      'no-unused-vars': [
        'warn',
        {
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-dupe-keys': 'error',
      'no-shadow': 'warn',
      'no-empty': 'warn',
      'no-useless-catch': 'warn',
      'prefer-const': 'warn',
      'no-var': 'warn',
      'object-shorthand': 'warn',
      'prefer-template': 'warn',
      'dot-notation': 'warn',
      'prefer-destructuring': [
        'warn',
        {
          object: true,
          array: false,
        },
      ],
      curly: ['warn', 'multi-line'],
      'no-duplicate-imports': 'warn',
      'no-console': [
        'warn',
        {
          allow: ['error', 'warn'],
        },
      ],
    },
  },

  prettier,

  {
    ignores: [
      'node_modules/',
      'coverage/',
      'logs/',
      'public/',
      'dist/',
      'build/',
    ],
  },
];
