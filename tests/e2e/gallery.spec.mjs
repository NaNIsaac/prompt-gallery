import { test, expect } from '@playwright/test';
import { readCatalog } from '../../scripts/validate.mjs';

const catalog = (await readCatalog()).toSorted((a, b) => a.order - b.order);
const featured = catalog[0];
const runtimeErrors = new WeakMap();

async function ready(page) {
  await expect(page.locator('#gallery')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#error-state')).toBeHidden();
}

async function loaded(image) {
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
}

async function fitsViewport(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page), 'uncaught browser errors').toEqual([]);
});

test('gallery displays the catalog in order with real thumbnails and reference photos', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  const cards = page.locator('.prompt-card');
  await expect(cards).toHaveCount(catalog.length);
  expect(await cards.evaluateAll(nodes => nodes.map(node => node.dataset.id))).toEqual(catalog.map(item => item.id));
  for (const item of catalog) {
    const card = page.locator(`.prompt-card[data-id="${item.id}"]`);
    await card.scrollIntoViewIfNeeded();
    await loaded(card.locator('.image-preview img'));
    await loaded(card.locator('.card-reference img'));
  }
  await fitsViewport(page);
});

test('search and category filters combine and recover from empty results', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  await page.getByRole('group', { name: '카테고리', exact: true }).getByRole('button', { name: featured.category, exact: true }).click();
  await expect(page.locator('.prompt-card')).toHaveCount(catalog.filter(item => item.category === featured.category).length);
  await page.getByRole('searchbox').fill(featured.title);
  await expect(page.locator('.prompt-card')).toHaveCount(1);
  await expect(page.getByRole('link', { name: featured.title, exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('no-matching-prompt-000');
  await expect(page.locator('#empty-state')).toBeVisible();
  await expect(page.locator('.prompt-card')).toHaveCount(0);
  await page.locator('#reset-filters').click();
  await expect(page.locator('.prompt-card')).toHaveCount(catalog.length);
  await expect(page.getByRole('searchbox')).toHaveValue('');
});

test('detail preserves the prompt, opens both images and copies the exact text', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  await page.getByRole('link', { name: featured.title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/prompts/${featured.id}/$`));
  await expect(page.locator('#prompt-dialog')).toBeVisible();
  await expect(page.getByRole('textbox', { name: '프롬프트 원문', exact: true })).toHaveValue(featured.prompt);
  await loaded(page.locator('#detail-image'));
  await fitsViewport(page);
  await page.getByRole('button', { name: '첨부 예시 1 크게 보기', exact: true }).click();
  await loaded(page.locator('#image-viewer-image'));
  await expect(page.locator('#image-viewer-image')).toHaveAttribute('src', new RegExp(featured.referenceImages[0].replaceAll('.', '\\.')));
  await page.locator('#close-image-viewer').click();
  await expect(page.locator('#image-dialog')).toBeHidden();
  await expect(page.locator('#prompt-dialog')).toBeVisible();
  await page.locator('#original-image').click();
  await loaded(page.locator('#image-viewer-image'));
  await expect(page.locator('#image-viewer-image')).toHaveAttribute('src', new RegExp(featured.image.replaceAll('.', '\\.')));
  await page.locator('#close-image-viewer').click();
  await page.locator('#detail-copy').click();
  await expect(page.locator('#detail-copy')).toHaveAttribute('aria-label', '프롬프트 복사 완료');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  // Windows clipboard text uses CRLF; preserve every other character and blank line.
  expect(copied.replaceAll('\r\n', '\n')).toBe(featured.prompt.replaceAll('\r\n', '\n'));
  await page.locator('#close-dialog').click();
  await expect(page.locator('#prompt-dialog')).toBeHidden();
});

test('bookmarks survive a reload and can be removed from the saved view', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  await page.getByRole('button', { name: `${featured.title} 저장`, exact: true }).click();
  await expect(page.locator('#saved-count')).toHaveText('1');
  await page.reload();
  await ready(page);
  await page.locator('#saved-tab').click();
  await expect(page.locator('.prompt-card')).toHaveCount(1);
  await expect(page.getByRole('link', { name: featured.title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `${featured.title} 저장 취소`, exact: true }).click();
  await expect(page.locator('.prompt-card')).toHaveCount(0);
  await expect(page.locator('#empty-title')).toHaveText('아직 저장한 프롬프트가 없어요.');
});

test('a direct sharing URL loads its assets and copies the Pages subpath URL', async ({ page, baseURL }) => {
  await page.goto(`prompts/${featured.id}/`);
  await ready(page);
  await expect(page).toHaveTitle(`${featured.title} — Prompt Gallery`);
  await expect(page.locator('#detail-title')).toHaveText(featured.title);
  await loaded(page.locator('#detail-image'));
  await page.locator('#share-prompt').click();
  await expect(page.locator('#share-prompt')).toHaveAttribute('aria-label', '링크 복사 완료');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL(`prompts/${featured.id}/`, baseURL).href);
  await page.reload();
  await ready(page);
  await expect(page.locator('#prompt-dialog')).toBeVisible();
  await expect(page.locator('#detail-prompt')).toHaveValue(featured.prompt);
});

test('MapleStory examples pair each result with its own reference and keep one shared prompt', async ({ page }) => {
  const item = catalog.find(p => p.id === 'maplestory-ingame-character');
  expect(item.examples.map(example => example.label)).toEqual(['인물', '반려동물', '풍경']);
  await page.goto(`prompts/${item.id}/`);
  await ready(page);
  for (const example of item.examples) {
    const option = page.getByRole('button', { name: `${example.label} 예시 보기`, exact: true });
    await option.click();
    await expect(option).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#example-options [aria-pressed="true"]')).toHaveCount(1);
    await loaded(page.locator('#detail-image'));
    await expect(page.locator('#detail-image')).toHaveAttribute('src', new RegExp(example.image.replaceAll('.', '\\.')));
    await expect(page.locator('#example-note')).toHaveText(example.note);
    await page.getByRole('button', { name: '첨부 예시 1 크게 보기', exact: true }).click();
    await loaded(page.locator('#image-viewer-image'));
    await expect(page.locator('#image-viewer-image')).toHaveAttribute('src', new RegExp(example.referenceImages[0].replaceAll('.', '\\.')));
    await page.locator('#close-image-viewer').click();
    await page.locator('#original-image').click();
    await loaded(page.locator('#image-viewer-image'));
    await expect(page.locator('#image-download')).toHaveAttribute('href', new RegExp(example.image.replaceAll('.', '\\.')));
    await page.locator('#close-image-viewer').click();
    await expect(page.locator('#detail-prompt')).toHaveValue(item.prompt);
    await fitsViewport(page);
  }
  await page.locator('#detail-copy').click();
  await expect(page.locator('#detail-copy')).toHaveAttribute('aria-label', '프롬프트 복사 완료');
  expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')).toBe(item.prompt);
  await page.reload();
  await ready(page);
  await expect(page.getByRole('button', { name: '인물 예시 보기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto(`prompts/${catalog.find(p => !p.examples).id}/`);
  await ready(page);
  await expect(page.locator('#example-options')).toBeHidden();
});
