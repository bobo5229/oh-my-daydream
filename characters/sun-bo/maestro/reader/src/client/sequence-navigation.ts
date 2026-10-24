import { readNovelProgress } from './storage.ts';
import type { ReadingMode } from './mode-model.ts';
import type { ReadingNode } from '../metadata/reading-order.ts';

const sequences = JSON.parse(document.querySelector('#reading-sequences')?.textContent ?? '{"novel":[],"chronicle":[]}') as Record<ReadingMode, ReadingNode[]>;
const article = document.querySelector<HTMLElement>('article.novel[data-chapter-id]');
const formalInterlude = document.querySelector<HTMLElement>('[data-formal-interlude-id]');
const chapterId = article?.dataset['chapterId'];
const allowedIds = sequences.novel.map(node => node.chapterId);
let currentNode: ReadingNode | undefined;

function chooseNovelNode(mode: ReadingMode, initial: boolean): ReadingNode | undefined {
  if (!chapterId) return undefined;
  if (mode === 'novel') return sequences.novel.find(node => node.chapterId === chapterId);
  const nodes = sequences.chronicle.filter(node => node.kind === 'novel' && node.chapterId === chapterId);
  if (initial) {
    const requested = new URLSearchParams(location.search).get('part');
    const explicit = nodes.find(node => node.id === requested);
    if (explicit) return explicit;
  }
  const progress = readNovelProgress(allowedIds);
  let hash = '';
  try { hash = decodeURIComponent(location.hash.slice(1)); } catch { /* 无效片段忽略。 */ }
  const anchor = article?.dataset['currentAnchor'] || (initial && hash) || (progress?.chapterId === chapterId ? progress.anchorId : undefined);
  return nodes.find(node => anchor && node.blockIds.includes(anchor)) ?? nodes[0];
}

function renderPager(mode: ReadingMode): void {
  const pager = document.querySelector('[data-reading-pager]');
  if (!pager) return;
  const sequence = sequences[mode];
  const index = sequence.findIndex(node => node.id === currentNode?.id);
  const controls = (['prev', 'next'] as const).map((direction, offset) => {
    const node = index >= 0 ? sequence[index + (offset ? 1 : -1)] : undefined;
    if (!node) return document.createElement('span');
    const link = document.createElement('a');
    link.href = node.url; link.rel = direction; link.dataset['readingNode'] = node.id;
    const label = `${direction === 'prev' ? '上一' : '下一'}${mode === 'novel' ? '章' : '篇'}`;
    link.setAttribute('aria-label', `${label}：${node.title}`);
    const text = document.createElement('span'); text.textContent = `${label} · ${node.title}`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: '20', height: '20', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'aria-hidden': 'true' })) svg.setAttribute(key, value);
    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', direction === 'prev' ? 'm14 5-7 7 7 7' : 'm10 5 7 7-7 7'); svg.append(path);
    link.append(...(direction === 'prev' ? [svg, text] : [text, svg]));
    return link;
  });
  pager.replaceChildren(...controls);
}

export function renderSequence(mode: ReadingMode, initial = false): void {
  currentNode = article ? chooseNovelNode(mode, initial) : sequences.chronicle.find(node => node.id === formalInterlude?.dataset['formalInterludeId']);
  document.querySelectorAll<HTMLElement>('[data-mode-directory]').forEach(list => { list.hidden = list.dataset['modeDirectory'] !== mode; });
  if (article) {
    article.dataset['readingNode'] = currentNode?.id ?? '';
    article.querySelectorAll<HTMLElement>('[data-reading-part]').forEach(part => { part.hidden = mode === 'chronicle' && !currentNode?.segmentIds.includes(part.dataset['readingPart'] ?? ''); });
    if (!initial) {
      const url = new URL(location.href);
      if (mode === 'chronicle' && currentNode?.id !== chapterId) url.searchParams.set('part', currentNode!.id);
      else url.searchParams.delete('part');
      url.hash = '';
      history.replaceState(history.state, '', `${url.pathname}${url.search}`);
    }
  }
  document.querySelectorAll<HTMLAnchorElement>('[data-mode-directory="chronicle"] [data-reading-node]').forEach(link => {
    if (link.dataset['readingNode'] === currentNode?.id) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  renderPager(mode);
  const progress = readNovelProgress(allowedIds);
  const returnChapter = progress?.chapterId ?? formalInterlude?.dataset['sourceChapter'] ?? allowedIds[0];
  document.querySelectorAll<HTMLAnchorElement>('[data-return-to-novel]').forEach(link => { if (returnChapter) link.href = `/read/${returnChapter}/`; });
}

export function returnToNovel(): void {
  if (!formalInterlude) return;
  const progress = readNovelProgress(allowedIds);
  const target = progress?.chapterId ?? formalInterlude.dataset['sourceChapter'] ?? allowedIds[0];
  if (target) location.assign(`/read/${target}/`);
}
