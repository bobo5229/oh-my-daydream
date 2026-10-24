import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { mediaFigure } from '../src/content/media.ts';
import { renderElements } from '../src/content/markdown.ts';
import type { VisualAsset } from '../src/metadata/assets.ts';
import { NOVEL_PROGRESS_KEY } from '../src/client/storage.ts';
const svg = await readFile('tests/fixtures/visual-check.svg', 'utf8');

test('S06-T04：测试 SVG 完整预览，按钮／键盘／滚轮缩放与拖动平移，关闭恢复正文位置和焦点', async ({ page }) => {
  await page.route('**/media/test-fixture.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: svg }));
  await page.goto('/read/ch03/');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch03/);
  await page.locator('article').evaluate(article => {
    const button = document.createElement('button'); button.className = 'image-trigger'; button.type = 'button'; button.dataset['mediaOpen'] = '/media/test-fixture.svg'; button.setAttribute('aria-label', '放大测试夹具');
    const img = document.createElement('img'); img.src = '/media/test-fixture.svg'; img.alt = 'Test fixture, not story artwork'; button.append(img); article.append(button);
  });
  const trigger = page.getByRole('button', { name: '放大测试夹具' });
  await trigger.scrollIntoViewIfNeeded();
  const position = await page.evaluate(() => scrollY);
  await trigger.click();
  const viewer = page.locator('#media-viewer'); const stage = page.locator('[data-media-stage]');
  await expect(viewer).toBeVisible(); await expect(page.locator('[data-media-image]')).toBeVisible();
  await expect(stage).toHaveAttribute('data-zoom', '1');
  await page.getByRole('button', { name: '放大图片', exact: true }).click();
  await expect(stage).toHaveAttribute('data-zoom', '1.25');
  await stage.focus(); await page.keyboard.press('+');
  await expect(stage).toHaveAttribute('data-zoom', '1.5625');
  const bounds = (await stage.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width / 2 + 80, bounds.y + bounds.height / 2 + 40); await page.mouse.up();
  expect(Number(await stage.getAttribute('data-pan-x'))).toBeGreaterThan(0);
  await page.mouse.wheel(0, -120);
  await expect.poll(async () => Number(await stage.getAttribute('data-zoom'))).toBeGreaterThan(1.5625);
  await page.getByRole('button', { name: '适合窗口', exact: true }).click();
  await expect(stage).toHaveAttribute('data-zoom', '1');
  await page.keyboard.press('Escape');
  await expect(viewer).not.toBeVisible(); await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(position);
});

test('S07-T02：窄屏双指缩放测试图，关闭后控件与正文仍可用', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/media/test-fixture.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: svg }));
  await page.goto('/read/ch03/');
  await page.locator('article').evaluate(article => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset['mediaOpen'] = '/media/test-fixture.svg'; button.textContent = '打开双指测试图'; article.prepend(button);
  });
  await page.getByRole('button', { name: '打开双指测试图' }).click();
  await expect(page.locator('[data-media-image]')).toBeVisible();
  const stage = page.locator('[data-media-stage]');
  const bounds = (await stage.boundingBox())!;
  const x = bounds.x + bounds.width / 2; const y = bounds.y + bounds.height / 2;
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 45, y, id: 1 }, { x: x + 45, y, id: 2 }] });
  for (const distance of [50, 60, 70, 80]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - distance, y, id: 1 }, { x: x + distance, y, id: 2 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => Number(await stage.getAttribute('data-zoom'))).toBeGreaterThan(1.2);
  await page.getByRole('button', { name: '关闭图片预览' }).click();
  await expect(page.locator('#media-viewer')).not.toBeVisible();
  await expect(page.getByRole('button', { name: '打开双指测试图' })).toBeFocused();
});

test('S06-T05：真实空图库有清晰入口与返回正文原位置，图库不覆盖小说进度', async ({ page }) => {
  await page.goto('/read/ch04/');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch04/);
  await page.evaluate(() => scrollTo(0, 1500));
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').scrollFraction > 0, NOVEL_PROGRESS_KEY)).toBe(true);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), NOVEL_PROGRESS_KEY);
  await page.getByRole('button', { name: '打开章节目录' }).click();
  await page.getByRole('link', { name: '视觉资料库', exact: true }).click();
  await expect(page.getByRole('heading', { name: '尚无视觉资料', exact: true })).toBeVisible();
  await expect(page.locator('.gallery-list img')).toHaveCount(0);
  await page.getByLabel('图像类型').selectOption('diagram');
  await expect(page.locator('[data-gallery-count]')).toHaveText('0 项资料');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').anchorId, NOVEL_PROGRESS_KEY)).toBe(saved.anchorId);
  await page.getByRole('link', { name: '返回正文原位置', exact: true }).click();
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', saved.anchorId);
});

test('S06-T05：测试图在图库复用实际渲染接口，可分类搜索并打开同一个查看器', async ({ page }) => {
  const asset: VisualAsset = { id: 'test-fixture', type: 'diagram', file: 'assets/test-fixture.svg', alt: 'Test fixture, not story artwork', caption: '', entityIds: [], chapterIds: [], interludeIds: [], available: true, src: '/media/test-fixture.svg', mime: 'image/svg+xml', bytes: null, sha256: null };
  const html = renderElements([mediaFigure(asset)]);
  await page.route('**/media/test-fixture.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: svg }));
  await page.route('**/gallery/', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/<ul class="gallery-list"[^>]*>/, `$&<li data-gallery-asset="test-fixture" data-asset-type="diagram" data-asset-search="test fixture">${html}</li>`);
    await route.fulfill({ response, body });
  });
  await page.goto('/gallery/');
  await expect(page.locator('[data-gallery-count]')).toHaveText('1 项资料');
  await page.getByLabel('图像类型').selectOption('scene');
  await expect(page.locator('[data-gallery-empty]')).toBeVisible();
  await page.getByLabel('图像类型').selectOption('diagram');
  await page.getByLabel('搜索视觉资料').fill('fixture');
  await page.getByRole('button', { name: '放大：Test fixture, not story artwork', exact: true }).click();
  await expect(page.locator('[data-media-image]')).toBeVisible();
  await expect(page.locator('[data-media-image]')).toHaveAttribute('src', /\/media\/test-fixture.svg$/);
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('搜索视觉资料')).toHaveValue('fixture');
});
