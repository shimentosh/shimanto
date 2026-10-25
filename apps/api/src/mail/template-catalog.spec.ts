import { isTemplateKey, templateCatalog } from './template-catalog.js';
import { type TemplateKey, renderTemplate, templates } from './transactional.js';

const urls = { portal: 'https://portal.example.com', admin: 'https://admin.example.com' };
const ctx = {
  storeName: 'Shimanto',
  siteUrl: 'https://example.com',
  supportUrl: 'https://portal.example.com/support',
};

describe('templateCatalog', () => {
  it('has an entry for every template', () => {
    expect(Object.keys(templateCatalog).sort()).toEqual(Object.keys(templates).sort());
  });

  it.each(Object.keys(templateCatalog) as TemplateKey[])('%s renders its sample', (key) => {
    const { subject, html, text } = renderTemplate(
      key,
      templateCatalog[key].sample(urls) as never,
      ctx,
    );
    for (const out of [subject, html, text]) {
      expect(out).not.toMatch(/undefined|NaN|\[object Object\]/);
    }
    expect(html).toContain('<html');
    expect(text.length).toBeGreaterThan(20);
  });

  it('knows its keys', () => {
    expect(isTemplateKey('orderConfirmation')).toBe(true);
    expect(isTemplateKey('toString')).toBe(false);
  });
});
