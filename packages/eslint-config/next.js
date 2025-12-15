/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    './index.js',
    'next/core-web-vitals',
    'next/typescript',
  ],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'react/jsx-key': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
