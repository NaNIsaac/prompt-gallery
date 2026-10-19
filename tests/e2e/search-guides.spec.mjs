import { test, expect } from '@playwright/test';
import { readCatalog } from '../../scripts/validate.mjs';
import { homeSearch, searchGuides, searchMetadata } from '../../src/search-guides.mjs';
const catalog = await readCatalog();
const guided = catalog.find(prompt => prompt.id === 'kakao-emoticons');
const ordinary = catalog.find(prompt => !searchGuides[prompt.id]);

test('search guide survives enhancement and never leaks into an unrelated prompt', async ({ page }) => {
  await page.goto(`prompts/${guided.id}/`);
  await expect(page.locator('#prompt-dialog')).toBeVisible();
  await expect(page).toHaveTitle(searchMetadata(guided).title);
  await expect(page.locator('#detail-guide')).toBeVisible();
  await page.locator('#detail-guide summary').click();
  await expect(page.locator('#detail-guide-content')).toContainText(searchGuides[guided.id].intro);
  await expect(page.locator('#detail-guide-content')).toContainText('카카오 제출 규격과 9개 개별 파일은 준비·검증하지 않았습니다.');
  await expect(page.locator('#detail-prompt')).toHaveValue(guided.prompt);
  await page.locator('#close-dialog').click();
  await expect(page).toHaveTitle(homeSearch.title);
  await page.goto(`prompts/${ordinary.id}/`);
  await expect(page.locator('#prompt-dialog')).toBeVisible();
  await expect(page.locator('#detail-guide')).toBeHidden();
  await expect(page.locator('#detail-guide-content')).toBeEmpty();
  await expect(page).toHaveTitle(searchMetadata(ordinary).title);
});

test('without JavaScript the same search guide and original prompt are readable', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto(`prompts/${guided.id}/`);
    await expect(page).toHaveTitle(searchMetadata(guided).title);
    await expect(page.locator('#static-content .prompt-guide')).toContainText(searchGuides[guided.id].intro);
    for (const section of searchGuides[guided.id].sections) await expect(page.locator('#static-content .prompt-guide')).toContainText(section.body);
    await expect(page.locator('.static-prompt')).toHaveText(guided.prompt);
    await page.locator('#static-content .prompt-guide').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('search-guide.png') });
  } finally { await context.close(); }
});
