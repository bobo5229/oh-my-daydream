import { test, expect } from '@playwright/test';
import { loadReaderContent } from '../src/content/index.ts';
import { NOVEL_PROGRESS_KEY } from '../src/client/storage.ts';

const content = await loadReaderContent();
const anchor = content.chapters.find(chapter => chapter.id === 'ch04')!.novel.blocks.filter(block => block.type === 'paragraph')[12]!.id;

const background = (page: import('@playwright/test').Page) => page.locator('html').evaluate(root => getComputedStyle(root).backgroundColor);

test('S02-T02：默认跟随系统，手动覆盖重开保留，恢复跟随立即生效', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/read/ch04/');
  await expect.poll(() => background(page)).toBe('rgb(247, 247, 245)');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => background(page)).toBe('rgb(32, 33, 36)');
  await page.getByLabel('阅读设置', { exact: true }).click();
  await page.getByLabel('主题', { exact: true }).selectOption('light');
  await expect.poll(() => background(page)).toBe('rgb(247, 247, 245)');
  await page.reload();
  await expect.poll(() => background(page)).toBe('rgb(247, 247, 245)');
  await page.getByLabel('阅读设置', { exact: true }).click();
  await expect(page.getByLabel('主题', { exact: true })).toHaveValue('light');
  await page.getByLabel('主题', { exact: true }).selectOption('system');
  await expect.poll(() => background(page)).toBe('rgb(32, 33, 36)');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => background(page)).toBe('rgb(247, 247, 245)');
  await page.getByLabel('主题', { exact: true }).selectOption('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => background(page)).toBe('rgb(32, 33, 36)');
});

test('S02-T03：字号行距即时生效、刷新保留，重排保持当前段落，默认排版可恢复', async ({ page }) => {
  await page.goto('/read/ch04/');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch04/);
  await page.evaluate(id => scrollTo(0, scrollY + document.getElementById(id)!.getBoundingClientRect().top - 82), anchor);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').anchorId, NOVEL_PROGRESS_KEY)).toBe(anchor);
  await page.getByLabel('阅读设置', { exact: true }).click();
  await page.getByLabel('字号', { exact: true }).focus();
  await page.keyboard.press('End');
  await expect(page.locator('article')).toHaveCSS('font-size', '26px');
  await page.getByLabel('行距', { exact: true }).focus();
  await page.keyboard.press('End');
  await expect(page.locator('article')).toHaveCSS('line-height', '59.8px');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', anchor);
  await page.reload();
  await expect(page.locator('article')).toHaveCSS('font-size', '26px');
  await expect(page.locator('article')).toHaveCSS('line-height', '59.8px');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', anchor);
  await page.getByLabel('阅读设置', { exact: true }).click();
  await page.getByLabel('主题', { exact: true }).selectOption('dark');
  await page.getByRole('button', { name: '恢复默认排版' }).click();
  await expect(page.locator('article')).toHaveCSS('font-size', '18px');
  await expect(page.locator('article')).toHaveCSS('line-height', '33.3px');
  await expect(page.getByLabel('主题', { exact: true })).toHaveValue('dark');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', anchor);
});

for (const width of [1440, 1024, 390]) {
  test(`S02-T04：${width}px 无横向溢出，大字可读，设置和目录支持键盘`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/read/ch04/');
    await page.getByLabel('阅读设置', { exact: true }).click();
    await page.getByLabel('字号', { exact: true }).focus();
    await page.keyboard.press('End');
    await expect(page.locator('article')).toHaveCSS('font-size', '26px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.locator('article').boundingBox())!.width).toBeLessThanOrEqual(780);
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('阅读设置', { exact: true })).toBeFocused();
    const opener = page.getByRole('button', { name: '打开章节目录' });
    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: '章节目录' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
  });
}
