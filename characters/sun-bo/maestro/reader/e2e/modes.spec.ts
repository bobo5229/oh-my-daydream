import { test, expect } from '@playwright/test';
import { loadReaderContent } from '../src/content/index.ts';
import { loadReadingOrder } from '../src/metadata/reading-order.ts';
import { NOVEL_PROGRESS_KEY } from '../src/client/storage.ts';
import { textOf } from '../src/content/markdown.ts';

const content = await loadReaderContent();
const order = await loadReadingOrder(content);
const chapter = content.chapters.find(chapter => chapter.id === 'ch03')!;
const laterBlock = chapter.novel.blocks.filter(block => block.type === 'paragraph')[22]!.id;

test('S04-T02：默认纯小说，顶部和目录同步，正文原地切换并记忆模式', async ({ page }) => {
  await page.goto('/read/ch03/');
  await expect(page.getByLabel('顶部阅读模式')).toHaveValue('novel');
  await page.locator('article').evaluate(article => { article.dataset['testMounted'] = 'retained'; });
  await page.getByLabel('顶部阅读模式').selectOption('chronicle');
  await expect(page.locator('article')).toHaveAttribute('data-test-mounted', 'retained');
  await page.getByRole('button', { name: '打开章节目录' }).click();
  await expect(page.getByRole('radio', { name: '完整编年', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: '纯小说', exact: true }).check();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('顶部阅读模式')).toHaveValue('novel');
  await page.getByLabel('顶部阅读模式').selectOption('chronicle');
  await page.reload();
  await expect(page.getByLabel('顶部阅读模式')).toHaveValue('chronicle');
  await page.getByRole('button', { name: '打开章节目录' }).click();
  await expect(page.getByRole('radio', { name: '完整编年', exact: true })).toBeChecked();
});

test('S04-T03：完整编年从章首档案走到末章，章中切片全文不丢不重且有正确前后篇', async ({ page }) => {
  await page.goto('/home/');
  await page.getByLabel('顶部阅读模式').selectOption('chronicle');
  await page.getByRole('link', { name: '开始阅读', exact: true }).click();
  const normalize = (value: string) => value.replace(/\s/g, '');
  for (const [index, node] of order.chronicle.entries()) {
    if (node.kind === 'interlude') {
      await expect(page.locator('[data-formal-interlude-id]')).toHaveAttribute('data-formal-interlude-id', node.id);
      const source = content.interludes.find(item => item.id === node.id)!;
      expect(normalize(source.title + await page.locator('.formal-interlude > [data-resource-text]').innerText())).toBe(normalize(textOf(source.tree)));
    } else {
      await expect(page.locator('article')).toHaveAttribute('data-reading-node', node.id);
      const source = content.chapters.find(item => item.id === node.chapterId)!;
      const expected = source.novel.blocks.filter(block => node.blockIds.includes(block.id)).map(block => textOf(block.node)).join('');
      expect(normalize(await page.locator('article').innerText())).toBe(normalize(expected));
    }
    const next = page.locator('[data-reading-pager] [rel="next"]');
    if (index < order.chronicle.length - 1) {
      await expect(next).toHaveAttribute('href', order.chronicle[index + 1]!.url);
      await next.click();
    } else await expect(next).toHaveCount(0);
  }
});

test('S04-T04：正文原地换模式共用锚点，Interlude 不覆盖正文进度，切回后恢复原段落', async ({ page }) => {
  await page.goto('/read/ch03/');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch03/);
  await page.evaluate(id => scrollTo(0, scrollY + document.getElementById(id)!.getBoundingClientRect().top - 82), laterBlock);
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', laterBlock);
  await page.getByLabel('顶部阅读模式').selectOption('chronicle');
  await expect(page.locator('article')).toHaveAttribute('data-reading-node', 'ch03-novel-2');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', laterBlock);
  const checkpoint = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), NOVEL_PROGRESS_KEY);
  await page.getByRole('button', { name: '打开章节目录' }).click();
  await page.locator('#chapter-navigation [data-mode-directory="chronicle"] [href="/interlude/interlude-02/"]').click();
  await expect(page.locator('[data-formal-interlude-id]')).toHaveAttribute('data-formal-interlude-id', 'interlude-02');
  await page.evaluate(() => scrollTo(0, 300));
  const onArchive = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), NOVEL_PROGRESS_KEY);
  expect(onArchive.chapterId).toBe(checkpoint.chapterId);
  expect(onArchive.anchorId).toBe(checkpoint.anchorId);
  await page.getByLabel('顶部阅读模式').selectOption('novel');
  await expect(page).toHaveURL(/\/read\/ch03\/$/);
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', laterBlock);
  await expect(page.locator('[data-reading-pager] [rel="next"]')).toHaveAttribute('href', '/read/ch04/');
});
