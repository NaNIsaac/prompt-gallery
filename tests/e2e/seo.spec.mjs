import { test, expect } from '@playwright/test';
import { readCatalog } from '../../scripts/validate.mjs';
const catalog = (await readCatalog()).toSorted((a, b) => a.order - b.order);
const featured = catalog[0];

test('without JavaScript, visitors can discover prompts and read paired examples and the exact prompt', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto('./');
    await expect(page.locator('#static-content a')).toHaveCount(catalog.length);
    await page.getByRole('link', { name: featured.title, exact: false }).click();
    await expect(page.locator('#page-title')).toHaveText(featured.title);
    await expect(page.locator('.static-prompt')).toHaveText(featured.prompt);
    const examples = featured.examples || [featured];
    await expect(page.locator('.static-example')).toHaveCount(examples.length);
    for (const image of await page.locator('.static-image-pair img').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('#page-title').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('static-detail.png') });
    await page.getByRole('link', { name: '전체 프롬프트 둘러보기', exact: true }).click();
    await expect(page.locator('#static-content a')).toHaveCount(catalog.length);
  } finally { await context.close(); }
});

test('static content stays available to visitors after enhancement and after a catalog failure', async ({ page }) => {
  await page.goto(`prompts/${featured.id}/`);
  await expect(page.locator('#prompt-dialog')).toBeVisible();
  await expect(page.locator('#static-content')).not.toHaveAttribute('open');
  await page.locator('#close-dialog').click();
  await page.locator('#static-content summary').click();
  await expect(page.locator('.static-prompt')).toBeVisible();
  await page.route('**/data/prompts.json', route => route.abort());
  await page.goto(`prompts/${featured.id}/`);
  await expect(page.locator('#error-state')).toBeVisible();
  await expect(page.locator('#static-content')).toBeVisible();
  await expect(page.locator('.static-prompt')).toHaveText(featured.prompt);
});
