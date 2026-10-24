import { resolve } from 'node:path';
import { array, object, readYaml, string } from './yaml.ts';
import type { Diagnostic, ReaderContent } from '../content/types.ts';

export interface ReadingNode {
  id: string;
  kind: 'novel' | 'interlude';
  chapterId: string;
  title: string;
  url: string;
  blockIds: string[];
  segmentIds: string[];
}
export interface ReadingOrder { novel: ReadingNode[]; chronicle: ReadingNode[]; diagnostics: Diagnostic[] }

export function parseReadingOrder(value: unknown, content: ReaderContent): ReadingOrder {
  const diagnostics: Diagnostic[] = [];
  const warn = (message: string) => diagnostics.push({ severity: 'warning', file: 'data/reading-order.yaml', code: 'READING_ORDER_FALLBACK', message });
  const chapterNodes: ReadingNode[] = content.chapters.map(chapter => ({
    id: chapter.id, kind: 'novel', chapterId: chapter.id, title: chapter.title, url: `/read/${chapter.id}/`,
    blockIds: chapter.novel.blocks.map(block => block.id), segmentIds: chapter.segments.filter(segment => segment.kind === 'novel' && segment.html.trim()).map(segment => segment.id),
  }));
  const segmentNodes: ReadingNode[] = content.chapters.flatMap(chapter => {
    const parts = chapter.segments.filter(segment => segment.kind === 'novel' && segment.html.trim());
    return parts.map((segment, index) => ({ id: segment.id, kind: 'novel' as const, chapterId: chapter.id,
      title: `${chapter.title} · 第 ${index + 1} 段`,
      url: `/read/${chapter.id}/?part=${encodeURIComponent(segment.id)}${segment.blocks[0] ? `#${segment.blocks[0].id}` : ''}`,
      blockIds: segment.blocks.map(block => block.id), segmentIds: [segment.id],
    }));
  });
  const interludeNodes: ReadingNode[] = content.interludes.map(interlude => ({ id: interlude.id, kind: 'interlude', chapterId: interlude.chapterId,
    title: interlude.title, url: `/interlude/${interlude.id}/`, blockIds: interlude.blocks.map(block => block.id), segmentIds: [interlude.id],
  }));
  const fallbackChronicle = content.chapters.flatMap(chapter => chapter.segments.filter(segment => segment.html.trim()).flatMap(segment => {
    const node = segment.kind === 'interlude' ? interludeNodes.find(node => node.id === segment.interludeId) : segmentNodes.find(node => node.id === segment.id);
    return node ? [node] : [];
  }));
  if (!object(value) || value['version'] !== 1) {
    warn('编排数据缺失或版本不支持，使用完整的源顺序派生节点。');
    return { novel: chapterNodes, chronicle: fallbackChronicle, diagnostics };
  }
  const novel: ReadingNode[] = [];
  for (const id of array(value['novel'])) {
    const node = chapterNodes.find(node => node.id === id);
    if (!node || novel.some(item => item.id === node.id)) { warn('纯小说序列存在无效或重复章节，回退到真实章节顺序。'); break; }
    novel.push(node);
  }
  if (novel.length !== chapterNodes.length) warn('纯小说序列未覆盖全部章节；使用真实章节顺序，新增章节不会丢失。');
  const validNovel = diagnostics.length ? chapterNodes : novel;
  const chronicle: ReadingNode[] = [];
  let valid = true;
  for (const item of array(value['chronicle'])) {
    if (!object(item) || Object.keys(item).length !== 1) { valid = false; break; }
    const node = string(item['chapter']) ? chapterNodes.find(node => node.id === item['chapter'])
      : string(item['segment']) ? segmentNodes.find(node => node.id === item['segment'])
      : string(item['interlude']) ? interludeNodes.find(node => node.id === item['interlude']) : undefined;
    if (!node || chronicle.some(item => item.id === node.id)) { valid = false; break; }
    chronicle.push(node);
  }
  const sourceNovelBlocks = validNovel.flatMap(node => node.blockIds);
  const sourceInterludeIds = interludeNodes.map(node => node.id).sort();
  const actualNovelBlocks = chronicle.filter(node => node.kind === 'novel').flatMap(node => node.blockIds);
  const actualInterludes = chronicle.filter(node => node.kind === 'interlude').map(node => node.id).sort();
  // 覆盖及次序全量比较：分段不能遗漏、重复或改变正文次序。
  if (!valid || JSON.stringify(sourceNovelBlocks) !== JSON.stringify(actualNovelBlocks) || JSON.stringify(sourceInterludeIds) !== JSON.stringify(actualInterludes)) {
    warn('完整编年有失配、缺失、重复或正文顺序变化；使用不丢不重的完整源片段顺序。');
    return { novel: validNovel, chronicle: fallbackChronicle, diagnostics };
  }
  return { novel: validNovel, chronicle, diagnostics };
}

export async function loadReadingOrder(content: ReaderContent, dataRoot = resolve(process.cwd(), 'data')): Promise<ReadingOrder> {
  const diagnostics: Diagnostic[] = [];
  const result = parseReadingOrder(await readYaml(resolve(dataRoot, 'reading-order.yaml'), diagnostics), content);
  result.diagnostics.unshift(...diagnostics);
  return result;
}
