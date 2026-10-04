/** Runs on staged files before each commit. The ESLint flag makes each file use its nearest eslint.config (default in ESLint 10). */
export default {
  '*.{ts,tsx,js,mjs,cjs}': [
    'eslint --flag v10_config_lookup_from_file --fix --no-warn-ignored',
    'prettier --write',
  ],
  '*.{json,md,mdx,css,yml,yaml}': ['prettier --write'],
};
