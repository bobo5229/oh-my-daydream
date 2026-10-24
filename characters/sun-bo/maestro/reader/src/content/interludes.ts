import type { Blockquote, Root } from 'mdast';
import { renderTree, sourceRange, textOf, spanOf } from './markdown.ts';
import { createHash } from 'node:crypto';
import type {
  Chapter, ChapterLibrary, ContentBlock, ContentView, DerivedChapter, DerivedLibrary,
  Diagnostic, Interlude, SourceSegment,
} from './types.ts';

interface Candidate {
  block: ContentBlock;
  node: Blockquote;
  number: string;
  title: string;
}

function candidatesOf(chapter: Chapter): { candidates: Candidate[]; diagnostics: Diagnostic[] } {
  const candidates: Candidate[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const block of chapter.blocks) {
    if (block.node.type !== 'blockquote') continue;
    const first = block.node.children[0];
    if (!first || !/^Interlude(?:\b|[0-9])/i.test(textOf(first))) continue;
    const firstInline = first.type === 'paragraph' ? first.children[0] : undefined;
    const title = firstInline?.type === 'strong' ? textOf(firstInline) : textOf(first);
    const match = /^Interlude ([0-9]{2,})｜([^\r\n]+)$/.exec(title);
    const tail = first.type === 'paragraph' ? first.children.slice(1) : [];
    // 现有三篇均有紧接标题的斜体副标题，CommonMark 将两行放在同一段落。
    const optionalSubtitle = tail.length === 0 || (tail.length === 2
      && ((tail[0]?.type === 'text' && /^(?:\r\n|\r|\n)$/.test(tail[0].value)) || tail[0]?.type === 'break')
      && tail[1]?.type === 'emphasis' && tail[1].children.every(node => node.type === 'text'));
    const strongHeader = first.type === 'paragraph' && optionalSubtitle
      && firstInline?.type === 'strong' && firstInline.children.every(node => node.type === 'text');
    // CommonMark 的懒续行可能把未加 > 的小说段落并入引用；此时不擅自切出。
    const explicitlyQuoted = block.raw.split(/\r\n|\r|\n/).every(line => /^ {0,3}>/.test(line));
    const ordinal = match ? Number(match[1]) : NaN;
    if (!match || !match[2]!.trim() || !Number.isSafeInteger(ordinal) || ordinal < 1
      || !strongHeader || !explicitlyQuoted || block.node.children.length < 2) {
      diagnostics.push({
        severity: 'warning', code: 'UNKNOWN_INTERLUDE_FORMAT', file: chapter.source.path, source: block.source,
        message: '疑似 Interlude 的引用格式尚未支持，已保留在小说原位置。',
      });
      continue;
    }
    candidates.push({ block, node: block.node, number: String(ordinal).padStart(2, '0'), title });
  }
  return { candidates, diagnostics };
}

async function viewFor(blocks: ContentBlock[]): Promise<ContentView> {
  const tree: Root = { type: 'root', children: blocks.map(block => block.node) };
  return { tree, blocks, html: await renderTree(tree) };
}

async function deriveChapter(chapter: Chapter, candidates: Candidate[], ambiguous: Set<string>): Promise<DerivedChapter> {
  const diagnostics = [...chapter.diagnostics];
  const accepted = candidates.filter(candidate => {
    if (!ambiguous.has(candidate.number)) return true;
    diagnostics.push({
      severity: 'error', code: 'DUPLICATE_INTERLUDE_ID', file: chapter.source.path, source: candidate.block.source,
      message: `Interlude ${candidate.number} 编号重复，相关引用全部保留原位，未生成含糊条目。`,
    });
    return false;
  });
  const interludes: Interlude[] = [];
  for (const candidate of accepted) {
    const occurrences = new Map<string, number>();
    for (const node of candidate.node.children) {
      const span = spanOf(node, chapter.source);
      const raw = chapter.source.raw.slice(span.start.offset, span.end.offset).replace(/\r\n|\r/g, '\n').trim();
      const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
      const occurrence = (occurrences.get(hash) ?? 0) + 1;
      occurrences.set(hash, occurrence);
      node.data = { ...node.data, readerAnchor: `i-interlude-${candidate.number}-b-${hash}${occurrence > 1 ? `-${occurrence}` : ''}` };
    }
    const tree: Root = { type: 'root', children: candidate.node.children };
    interludes.push({
      id: `interlude-${candidate.number}`, number: candidate.number, title: candidate.title,
      chapterId: chapter.id, source: candidate.block.source, raw: candidate.block.raw,
      tree, blocks: [candidate.block], html: await renderTree(tree),
    });
  }
  const recognized = new Set(accepted.map(candidate => candidate.block));
  const novel = await viewFor(chapter.blocks.filter(block => !recognized.has(block)));
  const segments: SourceSegment[] = [];
  let cursor = 0;
  let novelIndex = 0;
  const appendNovel = async (end: number) => {
    if (end <= cursor) return;
    const blocks = chapter.blocks.filter(block => block.source.start.offset >= cursor && block.source.end.offset <= end);
    segments.push({
      id: `${chapter.id}-novel-${++novelIndex}`, kind: 'novel',
      source: sourceRange(chapter.source, cursor, end), raw: chapter.source.raw.slice(cursor, end),
      ...await viewFor(blocks),
    });
    cursor = end;
  };
  for (const interlude of interludes) {
    await appendNovel(interlude.source.start.offset);
    segments.push({
      id: interlude.id, kind: 'interlude', interludeId: interlude.id,
      source: interlude.source, raw: interlude.raw,
      tree: interlude.tree, blocks: interlude.blocks, html: interlude.html,
    });
    cursor = interlude.source.end.offset;
  }
  await appendNovel(chapter.source.raw.length);
  if (segments.map(segment => segment.raw).join('') !== chapter.source.raw) {
    throw new Error(`Incomplete source partition: ${chapter.source.path}`);
  }
  return { ...chapter, diagnostics, novel, interludes, segments };
}

export async function deriveLibrary(library: ChapterLibrary): Promise<DerivedLibrary> {
  const scans = library.chapters.map(candidatesOf);
  const counts = new Map<string, number>();
  for (const scan of scans) {
    for (const candidate of scan.candidates) counts.set(candidate.number, (counts.get(candidate.number) ?? 0) + 1);
  }
  const ambiguous = new Set([...counts].filter(([, count]) => count > 1).map(([number]) => number));
  const chapters = await Promise.all(library.chapters.map(async (chapter, index) => {
    const scan = scans[index]!;
    return deriveChapter({ ...chapter, diagnostics: [...chapter.diagnostics, ...scan.diagnostics] }, scan.candidates, ambiguous);
  }));
  const originalDiagnostics = new Set(library.chapters.flatMap(chapter => chapter.diagnostics));
  return {
    chapters,
    interludes: chapters.flatMap(chapter => chapter.interludes),
    diagnostics: [...library.diagnostics.filter(item => !originalDiagnostics.has(item)), ...chapters.flatMap(chapter => chapter.diagnostics)],
  };
}
