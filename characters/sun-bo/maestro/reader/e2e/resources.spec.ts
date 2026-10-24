import { test, expect } from '@playwright/test';
import { loadReaderContent } from '../src/content/index.ts';
import { loadTimeline } from '../src/metadata/timeline.ts';
import { textOf } from '../src/content/markdown.ts';
import { NOVEL_PROGRESS_KEY } from '../src/client/storage.ts';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const content = await loadReaderContent();
const timeline = await loadTimeline(content);
const boundary = timeline.chapters.find(item => item.chapterId === 'ch03')!.scenes[0]!.anchorId;

test('S03-T03：跨场景跟随、手动暂停、恢复和左右互斥均保留正文', async ({ page }) => {
  await page.goto('/read/ch03/');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch03/);
  await page.getByRole('button', { name: '打开资料抽屉' }).click();
  const drawer = page.locator('#resources-drawer');
  await expect(drawer.locator('[data-current-story-stage]')).toHaveText('2021 年 12 月');
  await expect(drawer.locator('[data-stage-group="december-2021"]')).toHaveAttribute('open', '');
  const future = drawer.locator('[data-stage-group="march-2022"]');
  await future.locator('summary').click();
  await expect(drawer.locator('[data-follow-status]')).toContainText('已暂停');
  await expect(future).toHaveAttribute('open', '');
  await page.evaluate(id => scrollTo(0, scrollY + document.getElementById(id)!.getBoundingClientRect().top - 82), boundary);
  await expect(drawer.locator('[data-current-story-stage]')).toHaveText('2022 年 1 月');
  await expect(future).toHaveAttribute('open', '');
  await expect(future.locator('summary')).toBeFocused();
  await drawer.getByRole('button', { name: '返回当前故事时间' }).click();
  await expect(drawer.locator('[data-stage-group="january-2022"]')).toHaveAttribute('open', '');
  await expect(future).not.toHaveAttribute('open', '');
  await expect(drawer.locator('[data-follow-status]')).toHaveText('正在跟随正文');
  const before = await page.evaluate(() => scrollY);
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('[data-open-contents]')!.click());
  await expect(drawer).not.toBeVisible();
  await expect(page.locator('#chapter-navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => scrollY)).toBe(before);
});

for (const [width, layout] of [[1440, 'side'], [1280, 'overlay'], [390, 'overlay']] as const) {
  test(`S03-T05：${width}px 使用 ${layout} 布局，不压缩正文或丢失阅读位置`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/read/ch03/');
    await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch03/);
    await page.evaluate(id => scrollTo(0, scrollY + document.getElementById(id)!.getBoundingClientRect().top - 82), boundary);
    await expect(page.locator('article')).toHaveAttribute('data-current-anchor', boundary);
    const beforeWidth = (await page.locator('article').boundingBox())!.width;
    await page.getByRole('button', { name: '打开资料抽屉' }).click();
    const drawer = page.locator('#resources-drawer');
    await expect(drawer).toHaveAttribute('data-layout', layout);
    expect(await drawer.evaluate(element => element.matches(':modal'))).toBe(layout === 'overlay');
    expect((await page.locator('article').boundingBox())!.width).toBe(beforeWidth);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('article')).toHaveAttribute('data-current-anchor', boundary);
    await mkdir(resolve('.impeccable/review'), { recursive: true });
    await page.screenshot({ path: resolve(`.impeccable/review/drawer-${width}.png`) });
    if (width === 1440) {
      await page.setViewportSize({ width: 1000, height: 900 });
      await expect(drawer).toHaveAttribute('data-layout', 'overlay');
      expect(await drawer.evaluate(element => element.matches(':modal'))).toBe(true);
    }
    await drawer.getByRole('button', { name: '关闭资料抽屉' }).click();
    await expect(page.locator('article')).toHaveAttribute('data-current-anchor', boundary);
  });
}

test('S03-T04：章中档案全文完整，独立展开不复制节点，退出保留正文和抽屉位置', async ({ page }) => {
  await page.goto('/read/ch03/');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch03/);
  await page.evaluate(id => scrollTo(0, scrollY + document.getElementById(id)!.getBoundingClientRect().top - 82), boundary);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').anchorId, NOVEL_PROGRESS_KEY)).toBe(boundary);
  const bodyPosition = await page.evaluate(() => scrollY);
  await page.getByRole('button', { name: '打开资料抽屉' }).click();
  const drawer = page.locator('#resources-drawer');
  await drawer.locator('[data-stage-group="january-2022"] [data-select-interlude="interlude-02"]').click();
  const text = page.locator('[data-interlude-id="interlude-02"]');
  const normalize = (value: string) => value.replace(/\s/g, '');
  expect(normalize(await text.textContent() ?? '')).toBe(normalize(textOf(content.interludes.find(item => item.id === 'interlude-02')!.tree)));
  const drawerPosition = await drawer.evaluate(element => element.scrollTop);
  await drawer.getByRole('button', { name: '展开档案独立阅读' }).click();
  await expect(page.getByRole('dialog', { name: '资料独立阅读' })).toBeVisible();
  await expect(page.locator('#expanded-reader [data-interlude-id="interlude-02"]')).toHaveCount(1);
  await expect(text).toHaveCount(1);
  expect(await page.evaluate(() => scrollY)).toBe(bodyPosition);
  await page.getByRole('button', { name: '返回正文', exact: true }).click();
  await expect(page.locator('#expanded-reader')).not.toBeVisible();
  expect(await drawer.evaluate(element => element.scrollTop)).toBe(drawerPosition);
  await drawer.getByRole('button', { name: '关闭资料抽屉' }).click();
  expect(await page.evaluate(() => scrollY)).toBe(bodyPosition);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').anchorId, NOVEL_PROGRESS_KEY)).toBe(boundary);
});
