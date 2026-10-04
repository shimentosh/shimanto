import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import base from './base.js';

/** Next.js apps: base rules + Next core-web-vitals + a11y (jsx-a11y ships inside eslint-config-next). */
export default [
  ...base,
  ...nextVitals,
  ...nextTs,
  // App Router only — this Pages Router rule just warns about a missing pages/ dir.
  { rules: { '@next/next/no-html-link-for-pages': 'off' } },
  prettier,
];
