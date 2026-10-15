import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { projectRoot, readCatalog } from '../scripts/validate.mjs';
import { promptUrl, readPromptLocation } from '../src/sharing.mjs';
import { socialTags } from '../scripts/social.mjs';

test('sharing routes support Pages subpaths, legacy hashes, history navigation and index.html', () => {
  const root = 'https://example.com/prompt-gallery/';
  assert.equal(promptUrl('handcrafted-diorama', root), root + 'prompts/handcrafted-diorama/');
  assert.equal(readPromptLocation(root + 'prompts/handcrafted-diorama/', root), 'handcrafted-diorama');
  assert.equal(readPromptLocation(root + 'prompts/animal-friend/index.html', root), 'animal-friend');
  assert.equal(readPromptLocation(root + '#prompt=cozy-stickers', root), 'cozy-stickers');
  assert.equal(readPromptLocation(root + 'prompts/animal-friend/#prompt=pixel-food', root), 'pixel-food');
  for (const href of [root, root + '#prompt=%E0%A4', root + '#gallery', 'https://example.com/other/prompts/test/']) {
    assert.equal(readPromptLocation(href, root), null);
  }
});

test('untrusted catalog text cannot inject markup into sharing metadata', () => {
  const tags = socialTags({ title: '\"><script>alert(1)</script>', description: 'A & B', url: 'https://example.com/', image: 'https://example.com/image.jpg', imageAlt: '"example"' });
  assert.ok(!tags.includes('<script>'));
  assert.ok(tags.includes('&lt;script&gt;'));
  assert.ok(tags.includes('A &amp; B'));
});

test('built pages expose each actual result to crawlers without running JavaScript', async () => {
  const siteRoot = 'https://example.com/gallery/';
  await promisify(execFile)(process.execPath, ['scripts/build.mjs'], { cwd: projectRoot, env: { ...process.env, SITE_URL: siteRoot } });
  for (const prompt of await readCatalog()) {
    const page = await readFile(resolve(projectRoot, 'dist/prompts', prompt.id, 'index.html'), 'utf8');
    assert.ok(page.includes(`property="og:url" content="${promptUrl(prompt.id, siteRoot)}"`));
    assert.ok(page.includes(`property="og:title" content="${prompt.title} — Prompt Gallery"`));
    assert.equal((page.match(/property="og:image" /g) || []).length, 1);
    assert.ok(page.includes('src="../../app.js"'));
    assert.ok(page.includes('href="../../styles.css"'));
    const imageUrl = /property="og:image" content="([^"]+)"/.exec(page)[1];
    assert.ok(imageUrl.startsWith(siteRoot + 'assets/social/' + prompt.id + '-'));
    const image = await readFile(resolve(projectRoot, 'dist', imageUrl.slice(siteRoot.length)));
    const metadata = await sharp(image).metadata();
    assert.equal(metadata.format, 'jpeg');
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 600);
    assert.ok(image.length < 500_000);
  }
  const home = await readFile(resolve(projectRoot, 'dist/index.html'), 'utf8');
  assert.equal((home.match(/property="og:image" /g) || []).length, 1);
  assert.ok(home.includes(`property="og:url" content="${siteRoot}"`));
});
