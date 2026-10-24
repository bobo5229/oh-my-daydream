import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const directory = resolve('.impeccable/review');

test('S07-T02：最终桌面、窄屏与资料状态的渲染证据', async ({ page }) => {
  await mkdir(directory, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  const captureSession = await page.context().newCDPSession(page);
  await page.goto('/read/ch01/');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch01/);
  await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  await page.evaluate(() => scrollTo(0, 0));
  await captureSession.send('Emulation.setScriptExecutionDisabled', { value: true });
  try {
    await page.screenshot({ path: resolve(directory, 'desktop-viewport.png') });
    await page.screenshot({ path: resolve(directory, 'desktop.png'), fullPage: true });
  }
  finally { await captureSession.send('Emulation.setScriptExecutionDisabled', { value: false }); }
  await page.evaluate(() => scrollTo(0, 0));
  await page.getByLabel('阅读设置', { exact: true }).click(); await page.getByLabel('主题', { exact: true }).selectOption('dark'); await page.keyboard.press('Escape');
  await page.screenshot({ path: resolve(directory, 'dark-viewport.png') });
  await page.goto('/read/ch03/');
  await page.getByRole('button', { name: '打开资料抽屉' }).click();
  await page.screenshot({ path: resolve(directory, 'timeline-desktop.png') });
  await page.locator('[data-stage-group="january-2022"] > summary').click();
  await page.locator('[data-stage-group="january-2022"] [data-select-interlude="interlude-02"]').click();
  await page.getByRole('button', { name: '展开档案独立阅读' }).click();
  await page.screenshot({ path: resolve(directory, 'expanded-desktop.png') });
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Lore', exact: true }).click();
  await page.getByLabel('搜索 Lore').fill('Kybernetes'); await page.locator('[data-open-entity="kybernetes"]').click();
  await page.screenshot({ path: resolve(directory, 'lore-desktop.png') });
  await page.getByRole('button', { name: '关闭资料抽屉' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/read/ch01/'); await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch01/);
  await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  await page.evaluate(() => scrollTo(0, 0));
  await captureSession.send('Emulation.setScriptExecutionDisabled', { value: true });
  try {
    await page.screenshot({ path: resolve(directory, 'mobile-viewport.png') });
    await page.screenshot({ path: resolve(directory, 'mobile.png'), fullPage: true });
  }
  finally { await captureSession.send('Emulation.setScriptExecutionDisabled', { value: false }); }
  await page.evaluate(() => scrollTo(0, 0));
  await page.getByLabel('阅读设置', { exact: true }).click();
  await page.screenshot({ path: resolve(directory, 'settings-mobile.png') }); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '打开资料抽屉' }).click();
  await page.screenshot({ path: resolve(directory, 'timeline-mobile.png') });
  await page.getByRole('tab', { name: 'Lore', exact: true }).click();
  await page.getByLabel('搜索 Lore').fill('探微'); await page.locator('[data-open-entity="fathom"]').click();
  await page.screenshot({ path: resolve(directory, 'lore-mobile.png') });
  await page.locator('[data-lore-full] > summary').click(); await page.getByRole('button', { name: '展开完整资料独立阅读' }).click();
  await page.screenshot({ path: resolve(directory, 'expanded-mobile.png') });
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: '关闭资料抽屉' }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/interlude/interlude-02/');
  await page.screenshot({ path: resolve(directory, 'interlude-page-desktop.png') });
  await page.goto('/gallery/');
  await page.screenshot({ path: resolve(directory, 'gallery-desktop.png') });
  await page.goto('/read/ch03/'); await page.getByLabel('顶部阅读模式').selectOption('chronicle');
  await expect(page.locator('article')).toHaveAttribute('data-reading-node', /ch03-novel/);
  await page.screenshot({ path: resolve(directory, 'chronicle-desktop.png') });
});
