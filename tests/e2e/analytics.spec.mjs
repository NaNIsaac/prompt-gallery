import { test, expect } from '@playwright/test';
import { readCatalog } from '../../scripts/validate.mjs';
const catalog = (await readCatalog()).toSorted((a, b) => a.order - b.order);
const featured = catalog[0];

async function enableTestAnalytics(page, baseURL) {
  await page.route('**/src/analytics-config.mjs', route => route.fulfill({
    contentType: 'application/javascript',
    body: `export const analyticsConfig = ${JSON.stringify({ measurementId: 'G-TEST12345', siteUrl: baseURL, debug: true })};`,
  }));
  // All tests use a fake tag; no test traffic is sent to Google.
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'doNotTrack', { get: () => '0' });
    Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => false });
  });
}
async function events(page, name) {
  return page.evaluate(name => (window.dataLayer || []).map(args => [...args]).filter(args => args[0] === 'event' && args[1] === name).map(args => args[2]), name);
}

test('real gallery actions identify the prompt, count successes, and ignore re-renders', async ({ page, baseURL }) => {
  await enableTestAnalytics(page, baseURL);
  await page.goto('./?private=should-not-send');
  await expect(page.locator('#gallery')).toHaveAttribute('aria-busy', 'false');
  await expect.poll(async () => (await events(page, 'prompt_impression')).filter(event => event.prompt_id === featured.id).length).toBe(1);
  await page.getByRole('searchbox').fill(featured.title);
  await expect(page.locator('.prompt-card')).toHaveCount(1);
  await page.getByRole('link', { name: featured.title, exact: true }).click();
  await expect(page.locator('#prompt-dialog')).toBeVisible();
  await page.locator('#detail-copy').click();
  await expect(page.locator('#detail-copy')).toHaveAttribute('aria-label', '프롬프트 복사 완료');
  await page.locator('#detail-save').click();
  await page.locator('#share-prompt').click();
  await expect(page.locator('#share-prompt')).toHaveAttribute('aria-label', '링크 복사 완료');
  for (const name of ['prompt_open', 'prompt_copy', 'prompt_save', 'prompt_link_copy']) {
    const received = await events(page, name);
    expect(received).toHaveLength(1);
    expect(received[0].prompt_id).toBe(featured.id);
  }
  expect((await events(page, 'prompt_copy'))[0].surface).toBe('detail');
  await page.locator('#detail-save').click();
  expect(await events(page, 'prompt_unsave')).toHaveLength(1);
  await page.locator('#close-dialog').click();
  expect((await events(page, 'prompt_impression')).filter(event => event.prompt_id === featured.id)).toHaveLength(1);
  expect(await events(page, 'page_view')).toHaveLength(1);
  const serialized = await page.evaluate(() => JSON.stringify(window.dataLayer));
  expect(serialized).not.toContain('should-not-send');
  expect(serialized).not.toContain(featured.prompt);
});

test('a failed clipboard write is not reported as a copy or a shared result', async ({ page, baseURL }) => {
  await enableTestAnalytics(page, baseURL);
  await page.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, 'writeText', { value: async () => { throw new Error('blocked'); } });
    document.execCommand = () => false;
  });
  await page.goto(`prompts/${featured.id}/`);
  await expect(page.locator('#prompt-dialog')).toBeVisible();
  await page.locator('#detail-copy').click();
  await expect(page.locator('#detail-feedback')).toHaveAttribute('data-tone', 'error');
  await page.locator('#share-prompt').click();
  await expect(page.locator('#detail-feedback')).toContainText('주소창');
  expect(await events(page, 'prompt_copy')).toHaveLength(0);
  expect(await events(page, 'prompt_link_copy')).toHaveLength(0);
  const opened = await events(page, 'prompt_open');
  expect(opened).toHaveLength(1);
  expect(opened[0].surface).toBe('direct');
  expect(await events(page, 'prompt_impression')).toHaveLength(0);
});

test('normal local previews never load the Google tag', async ({ page }) => {
  const googleRequests = [];
  page.on('request', request => { if (/google-analytics|googletagmanager/.test(request.url())) googleRequests.push(request.url()); });
  await page.goto('./');
  await expect(page.locator('#gallery')).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('link', { name: featured.title, exact: true }).click();
  expect(googleRequests).toEqual([]);
  expect(await events(page, 'prompt_open')).toHaveLength(0);
});
