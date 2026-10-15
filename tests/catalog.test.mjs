import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPrompts, normalizeSearch, parseSavedIds, readPromptHash } from '../src/catalog.mjs';
import { readCatalog } from '../scripts/validate.mjs';

const prompts = await readCatalog();

test('published catalog has complete records and local full-size, thumbnail and reference assets', () => {
  assert.ok(prompts.length > 0);
  assert.ok(prompts.some(item => item.inputRequirement));
});

test('search normalizes unicode and case, matches all words across tags and body', () => {
  assert.equal(normalizeSearch(' Ｇｌａｓｓ '), 'glass');
  const items = filterPrompts(prompts, { query: 'SERUM 제품' });
  assert.ok(items.length > 0);
  assert.ok(items.every(item => item.category === '제품' && item.prompt.toLowerCase().includes('serum')));
  assert.deepEqual(filterPrompts(prompts, { query: 'no-such-prompt-anywhere-000' }), []);
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
