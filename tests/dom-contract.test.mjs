import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('static JavaScript ID selectors exist in HTML and IDs are unique', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
  ]);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate HTML IDs');
  const required = [...script.matchAll(/\$\(['"]#([\w-]+)['"]\)/g)].map(match => match[1]);
  assert.ok(required.length > 20, 'the contract must cover the application controls');
  for (const id of new Set(required)) assert.ok(ids.includes(id), `missing element: #${id}`);
});
