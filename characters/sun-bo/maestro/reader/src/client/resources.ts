import { resolveStoryStage } from './story-time.ts';
import { outsideDialog, syncModalLock } from './dialogs.ts';
import type { Timeline } from '../metadata/timeline.ts';
import { readNovelProgress } from './storage.ts';
import type { ReadingNode } from '../metadata/reading-order.ts';

const drawer = document.querySelector<HTMLDialogElement>('#resources-drawer');
const opener = document.querySelector<HTMLButtonElement>('[data-open-resources]');
const dataNode = document.querySelector('#reader-timeline');
if (drawer && opener && dataNode) {
  const data = JSON.parse(dataNode.textContent ?? '{}') as Pick<Timeline, 'stages' | 'chapters'> & { chapterId: string; blockIds: string[] };
  const article = document.querySelector<HTMLElement>('article.novel[data-chapter-id]');
  const groups = [...drawer.querySelectorAll<HTMLDetailsElement>('[data-stage-group]')];
  const nodes = (JSON.parse(document.querySelector('#reading-sequences')?.textContent ?? '{"novel":[]}') as { novel: ReadingNode[] }).novel;
  const saved = readNovelProgress(nodes.map(node => node.chapterId));
  const bodyChapter = article?.dataset['chapterId'] ?? saved?.chapterId ?? data.chapterId;
  const bodyBlocks = nodes.find(node => node.chapterId === bodyChapter)?.blockIds ?? data.blockIds;
  let currentStage = resolveStoryStage(data, bodyChapter, bodyBlocks, article?.dataset['currentAnchor'] ?? (saved?.chapterId === bodyChapter ? saved.anchorId : undefined));
  let following = true;
  let returnFocus = true;
  const wide = matchMedia('(min-width: 1360px)');
  function showDrawer(): void {
    document.dispatchEvent(new Event('maestro:layout-before-change'));
    document.documentElement.classList.toggle('has-resources', wide.matches);
    drawer!.dataset['layout'] = wide.matches ? 'side' : 'overlay';
    if (wide.matches) drawer!.show();
    else drawer!.showModal();
    syncModalLock();
    opener!.setAttribute('aria-expanded', 'true');
    document.dispatchEvent(new Event('maestro:layout-change'));
  }

  function update(): void {
    drawer!.querySelector('[data-current-story-stage]')!.textContent = currentStage?.label ?? '未标注故事时间';
    drawer!.querySelector('[data-follow-status]')!.textContent = following ? '正在跟随正文' : '已暂停跟随 · 自由浏览';
    const resume = drawer!.querySelector<HTMLButtonElement>('[data-resume-follow]')!;
    resume.hidden = following;
    for (const group of groups) {
      const active = group.dataset['stageGroup'] === currentStage?.id;
      group.toggleAttribute('data-current-stage', active);
      if (following) group.open = active;
    }
    document.dispatchEvent(new CustomEvent('maestro:story-stage-change', { detail: { stageId: currentStage?.id ?? null } }));
  }
  update();
  const tabs = [...drawer.querySelectorAll<HTMLButtonElement>('[data-resource-tab]')];
  function selectTab(tab: HTMLButtonElement): void {
    for (const item of tabs) { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; }
    drawer!.querySelectorAll<HTMLElement>('[data-resource-panel]').forEach(panel => { panel.hidden = panel.dataset['resourcePanel'] !== tab.dataset['resourceTab']; });
    drawer!.scrollTop = 0;
  }
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      const next = event.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length] : event.key === 'ArrowLeft' ? tabs[(index + tabs.length - 1) % tabs.length] : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : undefined;
      if (next) { event.preventDefault(); selectTab(next); next.focus(); }
    });
  }
  function pause(): void { following = false; update(); }
  for (const group of groups) group.querySelector('summary')?.addEventListener('click', pause);
  drawer.querySelector('[data-resume-follow]')?.addEventListener('click', () => { following = true; update(); });
  document.addEventListener('maestro:location-change', event => {
    const location = (event as CustomEvent<{ chapterId: string; anchorId?: string }>).detail;
    if (location.chapterId !== data.chapterId) return;
    currentStage = resolveStoryStage(data, data.chapterId, data.blockIds, location.anchorId);
    update();
  });
  drawer.querySelectorAll<HTMLButtonElement>('[data-select-interlude]').forEach(button => button.addEventListener('click', () => {
    pause();
    const section = drawer.querySelector<HTMLElement>('[data-interlude-selection]')!;
    section.hidden = false;
    const id = button.dataset['selectInterlude'];
    section.dataset['selectedInterlude'] = id;
    section.querySelectorAll<HTMLElement>('[data-interlude-id]').forEach(text => { text.hidden = text.dataset['interludeId'] !== id; });
    drawer.querySelectorAll<HTMLButtonElement>('[data-select-interlude]').forEach(entry => entry.setAttribute('aria-pressed', String(entry.dataset['selectInterlude'] === id)));
    drawer.scrollTo({ top: drawer.scrollTop + section.getBoundingClientRect().top - drawer.getBoundingClientRect().top - 90, behavior: 'instant' });
  }));
  opener.addEventListener('click', () => {
    if (drawer.open) { drawer.close(); return; }
    document.dispatchEvent(new CustomEvent('maestro:drawer-open', { detail: 'right' }));
    showDrawer();
    update();
  });
  drawer.querySelector('[data-close-resources]')?.addEventListener('click', () => drawer.close());
  drawer.addEventListener('click', event => { if (outsideDialog(drawer, event)) drawer.close(); });
  drawer.addEventListener('close', () => {
    if (drawer.open) return; // 响应式重新打开产生的旧 close 事件不覆盖新状态。
    document.documentElement.classList.remove('has-resources');
    opener.setAttribute('aria-expanded', 'false');
    syncModalLock();
    if (returnFocus) opener.focus({ preventScroll: true });
    returnFocus = true;
    document.dispatchEvent(new Event('maestro:layout-change'));
  });
  document.addEventListener('maestro:drawer-open', event => {
    if ((event as CustomEvent).detail === 'left' && drawer.open) { returnFocus = false; drawer.close(); }
  });
  let pendingReflow = false;
  function reflowDrawer(): void {
    if (!drawer?.open) return;
    if (document.querySelector('#expanded-reader[open], #media-viewer[open]')) { pendingReflow = true; return; }
    pendingReflow = false;
    const savedScroll = drawer.scrollTop;
    const focused = drawer.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
    drawer.close();
    showDrawer();
    drawer.scrollTop = savedScroll;
    focused?.focus({ preventScroll: true });
  }
  wide.addEventListener('change', reflowDrawer);
  document.addEventListener('maestro:overlay-close', () => { if (pendingReflow) reflowDrawer(); });
}
