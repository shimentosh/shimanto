import { readFileSync } from 'node:fs';
import { OPENAPI_PATH, generateOpenApi } from './openapi.js';

describe('OpenAPI document', () => {
  it('matches the committed packages/sdk/openapi.json (run `pnpm openapi` after API changes)', async () => {
    const committed = readFileSync(OPENAPI_PATH, 'utf8');
    expect(await generateOpenApi()).toBe(committed);
  });
});
