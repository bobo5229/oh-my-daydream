import { readNovelProgress, writeNovelProgress } from './storage.ts';
import type { NovelProgress } from './storage.ts';

const article = document.querySelector<HTMLElement>('article.novel[data-chapter-id]');
if (article?.dataset['chapterId']) {
  const chapterId = article.dataset['chapterId'];
  const blocks = [...article.querySelectorAll<HTMLElement>(`[id^="r-${chapterId}-b-"]`)];
  const existing = readNovelProgress();
  let checkpoint = existing?.chapterId === chapterId ? existing : null;
  let restoring = true;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let readerInteracted = false;
  const readingLine = () => (document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0) + 24;
  const maximumScroll = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const clamp = (number: number) => Math.max(0, Math.min(1, number));

  function capture(): NovelProgress {
    const line = readingLine();
    let blockIndex = Math.max(0, blocks.findIndex(block => block.getClientRects().length > 0));
    for (let index = 0; index < blocks.length; index++) {
      if (!blocks[index]!.getClientRects().length) continue;
      if (blocks[index]!.getBoundingClientRect().top <= line + 1) blockIndex = index;
      else break;
    }
    const block = blocks[blockIndex];
    const result: NovelProgress = {
      version: 1, chapterId, updatedAt: Date.now(),
      scrollFraction: maximumScroll() ? clamp(scrollY / maximumScroll()) : 0,
    };
    if (block) {
      const bounds = block.getBoundingClientRect();
      result.anchorId = block.id;
      result.blockIndex = blockIndex;
      result.blockFraction = bounds.height ? clamp((line - bounds.top) / bounds.height) : 0;
    }
    return result;
  }

  function save(): void {
    if (restoring) return;
    checkpoint = capture();
    writeNovelProgress(checkpoint);
    article!.dataset['currentAnchor'] = checkpoint.anchorId ?? '';
    document.dispatchEvent(new CustomEvent('maestro:location-change', { detail: { chapterId, anchorId: checkpoint.anchorId } }));
  }

  function restore(progress: NovelProgress | null): void {
    if (!progress || progress.chapterId !== chapterId) return;
    const block = blocks.find(item => item.id === progress.anchorId)
      ?? (progress.blockIndex !== undefined ? blocks[Math.min(progress.blockIndex, blocks.length - 1)] : undefined);
    if (block) {
      const bounds = block.getBoundingClientRect();
      scrollTo({ top: scrollY + bounds.top + bounds.height * (progress.blockFraction ?? 0) - readingLine(), behavior: 'instant' });
    } else scrollTo({ top: maximumScroll() * (progress.scrollFraction ?? 0), behavior: 'instant' });
  }

  function settleLayout(): void {
    if (restoring) return;
    restoring = true;
    if (saveTimer) clearTimeout(saveTimer);
    const saved = checkpoint;
    requestAnimationFrame(() => {
      restore(saved);
      requestAnimationFrame(() => { restoring = false; save(); });
    });
  }

  history.scrollRestoration = 'manual';
  for (const event of ['wheel', 'touchstart', 'keydown']) {
    addEventListener(event, () => { readerInteracted = true; }, { passive: true, once: true });
  }
  void document.fonts.ready.then(() => new Promise<void>(done => requestAnimationFrame(() => done()))).then(() => {
    if (!readerInteracted) {
      let hashBlock: HTMLElement | undefined;
      try { hashBlock = blocks.find(block => block.id === decodeURIComponent(location.hash.slice(1))); } catch { /* 无效片段采用进度回退。 */ }
      if (hashBlock) {
        scrollTo({ top: scrollY + hashBlock.getBoundingClientRect().top - readingLine(), behavior: 'instant' });
        // 深链锚点只用于本次进入；刷新继续使用之后保存的实际位置。
        history.replaceState(history.state, '', `${location.pathname}${location.search}`);
      }
      else restore(checkpoint);
    }
    requestAnimationFrame(() => { restoring = false; save(); });
  });

  addEventListener('scroll', () => {
    if (restoring) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 180);
  }, { passive: true });
  addEventListener('resize', settleLayout, { passive: true });
  addEventListener('pagehide', save);
  addEventListener('pageshow', event => { if (event.persisted) save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  document.addEventListener('maestro:layout-before-change', () => { save(); });
  document.addEventListener('maestro:layout-change', settleLayout);
}
