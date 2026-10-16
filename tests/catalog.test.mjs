import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPrompts, normalizeSearch, parseSavedIds, readPromptHash } from '../src/catalog.mjs';
import { readCatalog } from '../scripts/validate.mjs';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const prompts = await readCatalog();

test('published catalog has complete records and local full-size, thumbnail and reference assets', () => {
  assert.ok(prompts.length > 0);
  assert.ok(prompts.every(item => item.inputRequirement && item.referenceImages.length));
});

test('search normalizes unicode and case, matches all words across tags and body', () => {
  assert.equal(normalizeSearch(' Ｇｌａｓｓ '), 'glass');
  const fixture = [
    { ...prompts[0], id: 'serum', title: 'SERUM', category: '제품', prompt: 'a clear GLASS bottle' },
    { ...prompts[0], id: 'other', title: 'SERUM', category: '인물', prompt: 'portrait' },
  ];
  const items = filterPrompts(fixture, { query: 'ｓｅｒｕｍ 제품 glass' });
  assert.deepEqual(items.map(item => item.id), ['serum']);
  assert.deepEqual(filterPrompts(prompts, { query: 'no-such-prompt-anywhere-000' }), []);
});

test('reference examples are distinct, results are separate, and removed catalog images are not published', async () => {
  const references = new Set();
  const expectedAssets = new Set();
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  for (const prompt of prompts) {
    const resultHashes = new Set();
    for (const example of prompt.examples || [prompt]) {
      const result = hash(await readFile(new URL(`../${example.image}`, import.meta.url)));
      assert.ok(!resultHashes.has(result), `${prompt.id}: each example needs a different result`);
      resultHashes.add(result);
      for (const reference of example.referenceImages) {
        const input = hash(await readFile(new URL(`../${reference}`, import.meta.url)));
        assert.notEqual(input, result, `${prompt.id}: result must not be the input file`);
        assert.ok(!references.has(input), `${prompt.id}: use a distinct reference example`);
        references.add(input);
      }
      for (const asset of [example.image, ...example.referenceImages]) expectedAssets.add(asset.split('/').at(-1));
    }
    for (const asset of [prompt.image, prompt.thumbnail, ...prompt.referenceImages]) expectedAssets.add(asset.split('/').at(-1));
  }
  const actualAssets = await readdir(new URL('../assets/images/', import.meta.url));
  assert.deepEqual(actualAssets.sort(), [...expectedAssets].sort());
});

test('category, photo requirement and saved filters intersect without changing source order', () => {
  const before = prompts.map(p => p.id);
  const selected = prompts.find(p => p.inputRequirement);
  const ids = new Set([selected.id]);
  const result = filterPrompts(prompts, { savedOnly: true, referenceOnly: true, savedIds: ids, category: selected.category });
  assert.deepEqual(result.map(p => p.id), [selected.id]);
  filterPrompts(prompts, { sort: 'title' });
  assert.deepEqual(prompts.map(p => p.id), before);
});

test('corrupt or obsolete browser bookmarks cannot introduce unknown records', () => {
  const allowed = new Set(prompts.map(p => p.id));
  const id = prompts[0].id;
  assert.deepEqual([...parseSavedIds(JSON.stringify([id, id, 'removed', 42]), allowed)], [id]);
  for (const raw of ['broken', '{}', 'null', null]) assert.equal(parseSavedIds(raw, allowed).size, 0);
});

test('share links decode prompt ids while malformed hashes remain safe', () => {
  assert.equal(readPromptHash('#prompt=mini-me'), 'mini-me');
  assert.equal(readPromptHash('#gallery'), null);
  assert.equal(readPromptHash('#prompt=%E0%A4'), null);
});
