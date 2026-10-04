import globals from 'globals';
import base from './base.js';

/**
 * NestJS apps. Decorator-based DI needs value imports for constructor-injected classes,
 * so `consistent-type-imports` is relaxed (a type-only import would erase DI metadata).
 */
export default [
  ...base,
  { languageOptions: { globals: { ...globals.node } } },
  { rules: { '@typescript-eslint/consistent-type-imports': 'off' } },
];
