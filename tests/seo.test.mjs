import test from 'node:test';
import assert from 'node:assert/strict';
import { renderStaticCatalog, renderStaticPrompt, renderSitemap } from '../scripts/static-content.mjs';

test('static content safely renders catalog text as text, including prompt markup', () => {
  const prompt = { id: 'example', title: '<script>alert(1)</script>', category: '제품', inputLabel: '사진 1장', usage: '<img src=x onerror=alert(1)>', prompt: '</pre><script>alert(1)</script>', author: 'A & B', sourceUrl: 'https://example.com/', thumbnail: 'assets/example.webp', image: 'assets/example.webp', referenceImages: ['assets/input.webp'], width: 100, height: 200, order: 0 };
  for (const html of [renderStaticCatalog([prompt]), renderStaticPrompt(prompt, [prompt])]) {
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<img src=x'));
    assert.ok(html.includes('&lt;script&gt;'));
  }
  assert.ok(renderStaticPrompt(prompt, [prompt]).includes('&lt;/pre&gt;'));
});

test('sitemap contains canonical HTTPS subpath URLs without fabricated dates', () => {
  const xml = renderSitemap([{ id: 'one', order: 0 }, { id: 'two', order: -1 }], 'https://example.com/gallery/');
  assert.deepEqual([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), ['https://example.com/gallery/', 'https://example.com/gallery/prompts/two/', 'https://example.com/gallery/prompts/one/']);
  assert.ok(!xml.includes('<lastmod>'));
});
