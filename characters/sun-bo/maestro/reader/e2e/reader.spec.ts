import { test, expect } from '@playwright/test';
import { loadReaderContent } from '../src/content/index.ts';
import { textOf } from '../src/content/markdown.ts';
import { NOVEL_PROGRESS_KEY } from '../src/client/storage.ts';

const content = await loadReaderContent();
const normalize = (value: string) => value.replace(/\s/g, '');

for (const chapter of content.chapters) {
  test(`S01-T01：${chapter.id} 完整按序展示纯小说，只有一个章标题`, async ({ page }) => {
    const response = await page.goto(`/read/${chapter.id}/`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(chapter.title);
    const article = page.locator('article.novel');
    expect(normalize(await article.textContent() ?? '')).toBe(normalize(textOf(chapter.novel.tree)));
    await expect(article).not.toContainText('Interlude');
    expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(true);
  });
}

test('S01-T01：不存在章节返回明确的 404 与可用阅读入口', async ({ page }) => {
  const response = await page.goto('/read/no-such-chapter/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '未找到这一页' })).toBeVisible();
  const link = page.getByRole('link', { name: /开始阅读/ });
  await link.click();
  await expect(page.locator('article.novel')).toBeVisible();
});

test('S01-T02：目录抽屉标明当前章，开合保持正文位置，键盘返回入口', async ({ page }) => {
  await page.goto('/read/ch03/');
  await page.evaluate(() => scrollTo(0, 1300));
  const before = await page.evaluate(() => scrollY);
  const opener = page.getByRole('button', { name: '打开章节目录' });
  await opener.click();
  const drawer = page.getByRole('dialog', { name: '章节目录' });
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('[aria-current="page"]')).toHaveText('第三章');
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await opener.click();
  await drawer.getByRole('link', { name: '查看完整目录' }).click();
  await expect(page).toHaveURL(/\/contents\//);
});

test('S01-T02：独立目录来自全部真实章节，跳转到正确页面', async ({ page }) => {
  await page.goto('/contents/');
  const links = page.locator('main .full-contents[data-mode-directory="novel"] a');
  await expect(links).toHaveCount(content.chapters.length);
  for (const [index, chapter] of content.chapters.entries()) {
    await expect(links.nth(index)).toHaveAttribute('href', `/read/${chapter.id}/`);
    await expect(links.nth(index)).toHaveText(chapter.title);
  }
  await links.nth(3).click();
  await expect(page.locator('article')).toHaveAttribute('data-chapter-id', 'ch04');
});

test('S01-T02：首末章没有无效前后链接，章间导航按文件顺序', async ({ page }) => {
  const first = content.chapters[0]!;
  const second = content.chapters[1]!;
  const last = content.chapters.at(-1)!;
  const penultimate = content.chapters.at(-2)!;
  await page.goto(`/read/${first.id}/`);
  await expect(page.locator('.chapter-pager [rel="prev"]')).toHaveCount(0);
  await expect(page.locator('.chapter-pager [rel="next"]')).toHaveAttribute('href', `/read/${second.id}/`);
  await page.locator('.chapter-pager [rel="next"]').click();
  await expect(page).toHaveURL(/\/read\/ch02\//);
  await page.goto(`/read/${last.id}/`);
  await expect(page.locator('.chapter-pager [rel="next"]')).toHaveCount(0);
  await expect(page.locator('.chapter-pager [rel="prev"]')).toHaveAttribute('href', `/read/${penultimate.id}/`);
});

test('S01-T03：首次首页可开始阅读，有进度再访问根地址直接进入正文', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '总谱', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '开始阅读', exact: true }).click();
  await expect(page).toHaveURL(/\/read\/ch01\//);
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), NOVEL_PROGRESS_KEY)).not.toBeNull();
  await page.goto('/read/ch03/');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').chapterId, NOVEL_PROGRESS_KEY)).toBe('ch03');
  await page.goto('/');
  await expect(page).toHaveURL(/\/read\/ch03\//);
});

test('S01-T03：手动首页保留进度，继续入口回到最近章节', async ({ page }) => {
  await page.goto('/read/ch04/');
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), NOVEL_PROGRESS_KEY)).not.toBeNull();
  const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), NOVEL_PROGRESS_KEY);
  await page.getByRole('link', { name: '总谱，返回作品首页' }).click();
  await expect(page).toHaveURL(/\/home\//);
  await expect(page.getByRole('link', { name: '继续阅读', exact: true })).toBeVisible();
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), NOVEL_PROGRESS_KEY);
  expect(after.chapterId).toBe(before.chapterId);
  expect(after.anchorId).toBe(before.anchorId);
  expect(after.blockFraction).toBe(before.blockFraction);
  await page.getByRole('link', { name: '继续阅读', exact: true }).click();
  await expect(page).toHaveURL(/\/read\/ch04\//);
});

test('S01-T03：不存在章节的存储记录不会让首页进入失效路由', async ({ page }) => {
  await page.goto('/home/');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, chapterId: 'ch99', updatedAt: Date.now() })), NOVEL_PROGRESS_KEY);
  await page.goto('/');
  await expect(page.getByRole('link', { name: '开始阅读', exact: true })).toBeVisible();
  await expect(page).toHaveURL('/');
});

const savedBlock = content.chapters.find(chapter => chapter.id === 'ch03')!.novel.blocks.filter(block => block.type === 'paragraph')[18]!;

test('S01-T04：关闭重开后恢复同一段落，新的窗口宽度仍保持段内位置', async ({ page, context }) => {
  await page.goto('/read/ch03/');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch03/);
  await page.evaluate(id => {
    const block = document.getElementById(id)!;
    scrollTo(0, scrollY + block.getBoundingClientRect().top - 72);
  }, savedBlock.id);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').anchorId, NOVEL_PROGRESS_KEY)).toBe(savedBlock.id);
  await page.close();
  const reopened = await context.newPage();
  await reopened.setViewportSize({ width: 920, height: 850 });
  await reopened.goto('/');
  await expect(reopened).toHaveURL(/\/read\/ch03\//);
  await expect(reopened.locator('article')).toHaveAttribute('data-current-anchor', savedBlock.id);
  const position = await reopened.locator(`#${savedBlock.id}`).boundingBox();
  expect(position!.y).toBeLessThanOrEqual(95);
  expect(position!.y + position!.height).toBeGreaterThanOrEqual(90);
});

test('S01-T04：源锚点失效时按相邻块序号安全恢复', async ({ page }) => {
  const chapter = content.chapters.find(chapter => chapter.id === 'ch03')!;
  const fallback = chapter.novel.blocks[12]!;
  await page.goto('/home/');
  await page.evaluate(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), {
    key: NOVEL_PROGRESS_KEY,
    progress: { version: 1, chapterId: 'ch03', updatedAt: Date.now(), anchorId: 'r-ch03-b-0000000000000000', blockIndex: 12, blockFraction: 0.2, scrollFraction: 0.8 },
  });
  await page.goto('/read/ch03/');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', fallback.id);
});

test('S01-T04：存储损坏或不可用仍可阅读，页面无未处理异常', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/home/');
  await page.evaluate(key => localStorage.setItem(key, '{bad'), NOVEL_PROGRESS_KEY);
  await page.goto('/');
  await page.getByRole('link', { name: '开始阅读', exact: true }).click();
  await expect(page.locator('article')).toBeVisible();
  await context.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('disabled', 'SecurityError'); } }));
  await page.goto('/read/ch02/');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch02/);
  expect(errors).toEqual([]);
});

test('S01-T04：窗口重排后当前段落仍位于阅读线附近', async ({ page }) => {
  await page.goto('/read/ch03/');
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', /r-ch03/);
  await page.evaluate(id => scrollTo(0, scrollY + document.getElementById(id)!.getBoundingClientRect().top - 72), savedBlock.id);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').anchorId, NOVEL_PROGRESS_KEY)).toBe(savedBlock.id);
  await page.setViewportSize({ width: 700, height: 800 });
  await expect.poll(async () => {
    const bounds = await page.locator(`#${savedBlock.id}`).boundingBox();
    return Boolean(bounds && bounds.y <= 95 && bounds.y + bounds.height >= 90);
  }).toBe(true);
  await expect(page.locator('article')).toHaveAttribute('data-current-anchor', savedBlock.id);
});
