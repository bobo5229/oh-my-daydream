import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const review = resolve(process.cwd(), '.impeccable/review');

test('S02-T01：宽屏默认中文排版尺寸、主题令牌与真实正文对比度', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/read/ch04/');
  const metrics = await page.locator('article').evaluate(article => {
    const style = getComputedStyle(article);
    return { width: article.getBoundingClientRect().width, size: style.fontSize, height: style.lineHeight, font: style.fontFamily };
  });
  expect(metrics.width).toBe(780);
  expect(metrics.size).toBe('18px');
  expect(Number.parseFloat(metrics.height)).toBeCloseTo(33.3, 1);
  expect(metrics.font).toContain('Noto Sans SC');
  for (const theme of ['light', 'dark']) {
    const contrasts = await page.evaluate(theme => {
      document.documentElement.dataset['theme'] = theme;
      const root = document.documentElement;
      const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const luminance = (value: string) => rgb(value).map(c => c / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);
      const background = luminance(getComputedStyle(root).backgroundColor);
      return ['--foreground', '--muted-color', '--accent-color'].map(token => {
        const probe = document.createElement('span');
        probe.style.color = `var(${token})`;
        root.append(probe);
        const foreground = luminance(getComputedStyle(probe).color);
        probe.remove();
        return (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
      });
    }, theme);
    for (const contrast of contrasts) expect(contrast).toBeGreaterThanOrEqual(4.5);
  }
  await page.evaluate(() => { document.documentElement.dataset['theme'] = 'light'; });
  await mkdir(review, { recursive: true });
  await page.screenshot({ path: resolve(review, 'desktop.png'), fullPage: true });
  await page.screenshot({ path: resolve(review, 'desktop-viewport.png') });
  await page.evaluate(() => { document.documentElement.dataset['theme'] = 'dark'; });
  expect(await page.locator('html').evaluate(root => getComputedStyle(root).backgroundColor)).toBe('rgb(32, 33, 36)');
  await page.screenshot({ path: resolve(review, 'dark-viewport.png') });
  await page.getByLabel('阅读设置', { exact: true }).click();
  await page.screenshot({ path: resolve(review, 'settings-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(review, 'settings-mobile.png') });
  await page.keyboard.press('Escape');
  await page.screenshot({ path: resolve(review, 'mobile-viewport.png') });
});
