import { createHash } from 'node:crypto';
import { loadChapterLibrary } from './library.ts';
import { deriveLibrary } from './interludes.ts';
import type { DerivedLibrary, Diagnostic, ReaderContent } from './types.ts';

export type * from './types.ts';

export function validateContent(library: DerivedLibrary): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const ids = new Set<string>();
  const report = (file: string, code: string, message: string) => diagnostics.push({ severity: 'error', file, code, message });
  for (const chapter of library.chapters) {
    if (ids.has(chapter.id)) report(chapter.source.path, 'DUPLICATE_CONTENT_ID', `章节 ID ${chapter.id} 重复。`);
    ids.add(chapter.id);
    if (!chapter.novel.html.trim()) report(chapter.source.path, 'EMPTY_NOVEL', '章节没有可显示的小说内容。');
    const allocated = [...chapter.novel.blocks, ...chapter.interludes.flatMap(interlude => interlude.blocks)];
    if (allocated.length !== chapter.blocks.length || new Set(allocated).size !== chapter.blocks.length
      || allocated.some(block => !chapter.blocks.includes(block))) {
      report(chapter.source.path, 'BLOCK_COVERAGE_MISMATCH', '原稿内容块未被小说与 Interlude 视图恰好覆盖一次。');
    }
    let cursor = 0;
    let validPartition = true;
    for (const segment of chapter.segments) {
      if (segment.source.start.offset !== cursor || segment.source.end.offset < cursor
        || segment.raw !== chapter.source.raw.slice(cursor, segment.source.end.offset)) validPartition = false;
      cursor = segment.source.end.offset;
    }
    const reconstructed = chapter.segments.map(segment => segment.raw).join('');
    if (!validPartition || cursor !== chapter.source.raw.length
      || createHash('sha256').update(reconstructed).digest('hex') !== chapter.source.sha256) {
      report(chapter.source.path, 'SOURCE_PARTITION_MISMATCH', '派生片段与源字节不一致，禁止以截断内容继续构建。');
    }
    const blockIds = chapter.blocks.map(block => block.id);
    if (new Set(blockIds).size !== blockIds.length) report(chapter.source.path, 'DUPLICATE_BLOCK_ID', '章节内部存在重复内容锚点。');
    for (const interlude of chapter.interludes) {
      const slices = chapter.segments.filter(segment => segment.kind === 'interlude' && segment.interludeId === interlude.id);
      if (interlude.chapterId !== chapter.id || interlude.source.file !== chapter.source.path || slices.length !== 1
        || slices[0]!.source.start.offset !== interlude.source.start.offset || slices[0]!.source.end.offset !== interlude.source.end.offset) {
        report(chapter.source.path, 'INTERLUDE_SOURCE_MISMATCH', '档案条目与所属章节或源片段不一致。');
      }
    }
  }
  const derivedIds = library.chapters.flatMap(chapter => chapter.interludes.map(interlude => interlude.id)).sort();
  const indexedIds = library.interludes.map(interlude => interlude.id).sort();
  if (JSON.stringify(derivedIds) !== JSON.stringify(indexedIds)) {
    report('chapters', 'INTERLUDE_INDEX_MISMATCH', '全书档案索引未与章节派生条目保持一致。');
  }
  for (const interlude of library.interludes) {
    if (ids.has(interlude.id)) report(interlude.source.file, 'DUPLICATE_CONTENT_ID', `档案 ID ${interlude.id} 重复。`);
    ids.add(interlude.id);
  }
  return diagnostics;
}

export async function loadReaderContent(options: { sourceRoot?: string } = {}): Promise<ReaderContent> {
  const library = await deriveLibrary(await loadChapterLibrary(options));
  const diagnostics = [...library.diagnostics, ...validateContent(library)];
  return {
    ...library,
    diagnostics,
    status: diagnostics.some(item => item.severity === 'error') ? 'invalid' : diagnostics.length ? 'degraded' : 'ready',
  };
}

export function assertUsableContent(content: ReaderContent): void {
  const errors = content.diagnostics.filter(item => item.severity === 'error');
  if (errors.length) {
    throw new Error(errors.map(item => `${item.code} (${item.file}): ${item.message}`).join('\n'));
  }
}
