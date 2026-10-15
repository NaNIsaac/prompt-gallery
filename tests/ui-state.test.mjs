import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewState, resetActiveFilters, navigationState, writeClipboard } from '../src/ui-state.mjs';

test('switching views retains independent search, category and sort choices', () => {
  const view = createViewState();
  Object.assign(view.filters.explore, { query: '수채화', category: '인물', sort: 'title' });
  view.active = 'saved';
  view.filters.saved.referenceOnly = true;
  view.active = 'explore';
  assert.equal(view.filters[view.active].query, '수채화');
  assert.equal(view.filters[view.active].category, '인물');
  assert.equal(view.filters[view.active].referenceOnly, false);
  assert.equal(view.filters.saved.referenceOnly, true);
});

test('clearing saved-view filters does not leave saved view or reset sorting', () => {
  const view = createViewState();
  view.active = 'saved';
  Object.assign(view.filters.saved, { query: 'x', category: '제품', referenceOnly: true, sort: 'title' });
  resetActiveFilters(view);
  assert.equal(view.active, 'saved');
  assert.deepEqual(view.filters.saved, { query: '', category: '전체', referenceOnly: false, sort: 'title' });
});

test('modal boundaries stay in the opening sequence after underlying saved results change', () => {
  const original = ['one', 'two', 'three'];
  const modal = [...original];
  original.splice(1, 1);
  assert.deepEqual(navigationState(modal, 'two'), { index: 1, count: 3, previous: 'one', next: 'three' });
  assert.equal(navigationState(modal, 'one').previous, null);
  assert.equal(navigationState(modal, 'three').next, null);
});

test('clipboard permission denial tries the fallback; total failure is reported', async () => {
  let copied = '';
  await writeClipboard('원문 그대로', async () => { throw new Error('NotAllowedError'); }, text => { copied = text; return true; });
  assert.equal(copied, '원문 그대로');
  await assert.rejects(writeClipboard('text', null, () => false), /Clipboard unavailable/);
  let fallbackCalled = false;
  await writeClipboard('text', async () => {}, () => { fallbackCalled = true; });
  assert.equal(fallbackCalled, false);
});
