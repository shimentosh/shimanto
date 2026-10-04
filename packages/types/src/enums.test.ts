import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, LeadIntentSchema, LocaleSchema, VentureStatusSchema } from './index.js';

describe('shared enums', () => {
  it('defaults to English and only accepts en/bn', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(LocaleSchema.safeParse('bn').success).toBe(true);
    expect(LocaleSchema.safeParse('fr').success).toBe(false);
  });

  it('keeps the venture lifecycle from the brief', () => {
    expect(VentureStatusSchema.options).toEqual([
      'LIVE',
      'PARTIAL',
      'BUILDING',
      'PAUSED',
      'SUNSET',
      'EXITED',
    ]);
  });

  it('includes SUPPORT so portal support requests can become leads', () => {
    expect(LeadIntentSchema.options).toContain('SUPPORT');
  });
});
