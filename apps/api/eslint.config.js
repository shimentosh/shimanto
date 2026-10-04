import nest from '@shimanto/config/eslint/nest';

export default [
  ...nest,
  // CLI scripts talk to the terminal on purpose.
  { files: ['prisma/**', 'src/scripts/**'], rules: { 'no-console': 'off' } },
];
