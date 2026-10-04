import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import base from './base.js';

/** Framework-agnostic React packages (packages/ui). */
export default [
  ...base,
  reactHooks.configs.flat['recommended-latest'],
  { languageOptions: { globals: { ...globals.browser } } },
];
