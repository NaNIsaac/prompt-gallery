import { test, expect } from '@playwright/test';
import { readCatalog } from '../../scripts/validate.mjs';

const catalog = await readCatalog();
const items = catalog.filter(item => item.examples);

for (const item of items) {
  test(`${item.id}: example switching pairs results, references and downloads without changing the prompt`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`prompts/${item.id}/`);
    await expect(page.locator('#gallery')).toHaveAttribute('aria-busy', 'false');
    for (const example of item.examples) {
      const option = page.getByRole('button', { name: `${example.label} 예시 보기`, exact: true });
      await option.click();
      await expect(option).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#example-options [aria-pressed="true"]')).toHaveCount(1);
      await expect(page.locator('#detail-image')).toHaveAttribute('src', new RegExp(example.image.replaceAll('.', '\\.')));
      await expect.poll(() => page.locator('#detail-image').evaluate(image => image.complete && image.naturalWidth)).toBe(example.width);
      await expect(page.locator('#example-note')).toHaveText(example.note);
      await page.getByRole('button', { name: '첨부 예시 1 크게 보기', exact: true }).click();
      await expect(page.locator('#image-viewer-image')).toHaveAttribute('src', new RegExp(example.referenceImages[0].replaceAll('.', '\\.')));
      await expect.poll(() => page.locator('#image-viewer-image').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
      await page.locator('#close-image-viewer').click();
      await page.locator('#original-image').click();
      await expect(page.locator('#image-viewer-image')).toHaveAttribute('src', new RegExp(example.image.replaceAll('.', '\\.')));
      await expect(page.locator('#image-download')).toHaveAttribute('href', new RegExp(example.image.replaceAll('.', '\\.')));
      await page.locator('#close-image-viewer').click();
      await expect(page.locator('#detail-prompt')).toHaveValue(item.prompt);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.locator('#detail-copy').click();
    await expect(page.locator('#detail-copy')).toHaveAttribute('aria-label', '프롬프트 복사 완료');
    expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')).toBe(item.prompt);
    await page.reload();
    await expect(page.getByRole('button', { name: `${item.examples[0].label} 예시 보기`, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.goto(`prompts/${catalog.find(p => !p.examples).id}/`);
    await expect(page.locator('#gallery')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('#example-options')).toBeHidden();
    expect(errors).toEqual([]);
  });
}
