import { test, expect } from '@playwright/test';
import { loadReaderContent } from '../src/content/index.ts';
import { NOVEL_PROGRESS_KEY } from '../src/client/storage.ts';
const content = await loadReaderContent();
const ch03 = content.chapters.find(chapter => chapter.id === 'ch03')!;
const later = ch03.novel.blocks.filter(block => block.type === 'paragraph')[24]!.id;

test('S07-T01：章内深链、跨片段切换及刷新保留最新正文位置', async ({ page }) => {
  await page.goto('/read/ch03/');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch03/);
  await page.getByLabel('顶部阅读模式').selectOption('chronicle');
  await page.goto(`/read/ch03/?part=ch03-novel-2#${later}`);
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', later);
  await expect(page).not.toHaveURL(/#/);
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').anchorId, NOVEL_PROGRESS_KEY)).not.toBe(ch03.novel.blocks[0]!.id);
  await page.getByLabel('顶部阅读模式').selectOption('novel');
  await page.evaluate(id => scrollTo(0, scrollY + document.getElementById(id)!.getBoundingClientRect().top - 82), later);
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', later);
  await page.getByLabel('顶部阅读模式').selectOption('chronicle');
  await expect(page).toHaveURL(/part=ch03-novel-2$/);
  await page.reload();
  await expect(page.locator('article')).toHaveAttribute('data-reading-node', 'ch03-novel-2');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', later);
});

test('S07-T01：正文、资料自由浏览、跨断点独立视图、Lore、模式与图库可连续使用', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.getByRole('link', { name: '开始阅读', exact: true }).click();
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch01/);
  await page.goto('/read/ch03/');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch03/);
  await page.getByRole('button', { name: '打开资料抽屉' }).click();
  const drawer = page.locator('#resources-drawer');
  await drawer.locator('[data-stage-group="march-2022"] > summary').click();
  await drawer.locator('[data-stage-group="march-2022"] [data-select-interlude="interlude-03"]').click();
  await page.getByRole('button', { name: '展开档案独立阅读' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#expanded-reader')).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.closest('dialog')?.id)).toBe('expanded-reader');
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveAttribute('data-layout', 'overlay');
  await page.getByRole('tab', { name: 'Lore', exact: true }).click();
  await page.getByLabel('搜索 Lore').fill('Encoder'); await page.locator('[data-open-entity="encoder"]').click();
  await expect(page.locator('[data-entity-type]')).toHaveText('Harness');
  await page.getByRole('button', { name: '关闭资料抽屉' }).click();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').anchorId, NOVEL_PROGRESS_KEY);
  await page.getByLabel('顶部阅读模式').selectOption('chronicle');
  await page.getByRole('button', { name: '打开章节目录' }).click();
  await page.locator('#chapter-navigation [href="/interlude/interlude-02/"]').click();
  await page.getByRole('button', { name: '打开资料抽屉' }).click();
  await expect(drawer.locator('[data-current-story-stage]')).toHaveText('2021 年 12 月');
  await page.keyboard.press('Escape');
  await page.getByLabel('顶部阅读模式').selectOption('novel');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', saved);
  await page.getByRole('button', { name: '打开章节目录' }).click(); await page.getByRole('link', { name: '视觉资料库', exact: true }).click();
  await page.getByRole('link', { name: '返回正文原位置', exact: true }).click();
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', saved);
  expect(errors).toEqual([]);
});

for (const width of [320, 375, 390, 1024, 1440]) {
  test(`S07-T02：${width}px 控件可达，大字号无横向溢出，覆盖层焦点可返回`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/read/ch04/');
    await page.getByLabel('阅读设置', { exact: true }).click();
    await page.getByLabel('字号', { exact: true }).focus(); await page.keyboard.press('End');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '打开章节目录' }).click();
    for (let index = 0; index < 18; index++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => document.activeElement?.closest('dialog')?.id)).toBe('chapter-navigation'); }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '打开章节目录' })).toBeFocused();
  });
}

test('S07-T02：跳转正文、主题焦点样式、唯一 ID 和基本名称语义可用', async ({ page }) => {
  await page.goto('/read/ch03/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '跳到正文' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('main')).toBeFocused();
  const duplicateIds = await page.evaluate(() => [...document.querySelectorAll('[id]')].map(node => node.id).filter((id, index, ids) => ids.indexOf(id) !== index));
  expect(duplicateIds).toEqual([]);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.goto('/interlude/interlude-02/');
  expect(await page.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map(node => node.id); return ids.length === new Set(ids).size; })).toBe(true);
});
