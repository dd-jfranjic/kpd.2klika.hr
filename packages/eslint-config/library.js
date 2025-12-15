/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./index.js'],
  env: {
    node: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
