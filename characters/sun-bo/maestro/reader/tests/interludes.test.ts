import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadChapterLibrary } from '../src/content/library.ts';
import { decodeSource, parseDocument } from '../src/content/markdown.ts';
import { deriveLibrary } from '../src/content/interludes.ts';
import type { Chapter, DerivedChapter } from '../src/content/types.ts';

async function chapterOf(raw: string, id = 'ch01'): Promise<Chapter> {
  const document = await parseDocument(id, decodeSource(`chapters/${id}.md`, Buffer.from(raw)));
  return { ...document, title: document.title ?? '测试章', ordinal: Number(id.slice(2)) };
}

function verifyPartition(chapter: DerivedChapter): void {
  let cursor = 0;
  for (const segment of chapter.segments) {
    assert.equal(segment.source.start.offset, cursor);
    assert.equal(segment.raw, chapter.source.raw.slice(cursor, segment.source.end.offset));
    cursor = segment.source.end.offset;
  }
  assert.equal(cursor, chapter.source.raw.length);
  const reconstructed = Buffer.from(chapter.segments.map(segment => segment.raw).join(''));
  assert.equal(createHash('sha256').update(reconstructed).digest('hex'), chapter.source.sha256);
}

test('真实三处 Interlude 位置正确，所有章节逐字节重组，章中前后正文仍在小说视图', async () => {
  const library = await deriveLibrary(await loadChapterLibrary());
  assert.deepEqual(library.interludes.map(item => [item.id, item.chapterId, item.source.start.line, item.source.end.line]), [
    ['interlude-01', 'ch01', 1, 12], ['interlude-02', 'ch03', 29, 38], ['interlude-03', 'ch05', 3, 12],
  ]);
  for (const chapter of library.chapters) {
    verifyPartition(chapter);
    assert.ok(!chapter.novel.html.includes('Interlude'));
    assert.equal(chapter.novel.blocks.length + chapter.interludes.length, chapter.blocks.length);
    for (const interlude of chapter.interludes) {
      assert.ok(interlude.html.includes(interlude.title));
      assert.ok(!interlude.html.startsWith('<blockquote>'));
    }
  }
  const middle = library.chapters.find(chapter => chapter.id === 'ch03')!;
  assert.deepEqual(middle.segments.map(segment => segment.kind), ['novel', 'interlude', 'novel']);
  assert.ok(middle.segments[0]!.html.length > 0);
  assert.ok(middle.segments[2]!.html.length > 0);
  assert.equal(middle.novel.blocks[0]!.raw, middle.blocks[0]!.raw);
  assert.equal(middle.novel.blocks.at(-1)!.raw, middle.blocks.at(-1)!.raw);
});

test('普通引用与代码里的 Interlude 标记不被误识别', async () => {
  const raw = '# 测试章\n\n> 普通引语。\n>\n> 提到 Interlude 的正文仍是普通引语。\n\n```text\n> **Interlude 01｜日期**\n>\n> 示例。\n```\n';
  const chapter = await chapterOf(raw);
  const result = await deriveLibrary({ chapters: [chapter], diagnostics: [] });
  assert.equal(result.interludes.length, 0);
  assert.equal(result.chapters[0]!.novel.html, chapter.html);
  assert.equal(result.diagnostics.length, 0);
  verifyPartition(result.chapters[0]!);
});

test('标题下一行的斜体副标题保持在 Interlude 中，普通正文不混入标题', async () => {
  const chapter = await chapterOf('> **Interlude 01｜时间**\n> *副标题*\n>\n> 资料正文。\n\n小说接续。');
  const result = await deriveLibrary({ chapters: [chapter], diagnostics: [] });
  assert.equal(result.interludes.length, 1);
  assert.equal(result.interludes[0]!.title, 'Interlude 01｜时间');
  assert.ok(result.interludes[0]!.html.includes('<em>副标题</em>'));
  assert.ok(result.chapters[0]!.novel.html.includes('小说接续'));
  verifyPartition(result.chapters[0]!);
});

test('未知标题、无内容与懒续行保留在原位并给出诊断', async () => {
  const samples = [
    '> Interlude 01｜时间\n>\n> 缺少明确标题格式。\n',
    '> **Interlude01｜时间**\n>\n> 未支持格式。\n',
    '> **Interlude 01｜时间**\n',
    '> **Interlude 01｜时间**\n>\n> 行业段落。\n未加引用标记的小说段落。\n',
  ];
  for (const raw of samples) {
    const chapter = await chapterOf(raw);
    const result = await deriveLibrary({ chapters: [chapter], diagnostics: [] });
    assert.equal(result.interludes.length, 0);
    assert.equal(result.chapters[0]!.novel.html, chapter.html);
    assert.ok(result.diagnostics.some(item => item.code === 'UNKNOWN_INTERLUDE_FORMAT'));
    verifyPartition(result.chapters[0]!);
  }
});

test('相邻引用不被串接，分隔线和 CRLF 仍完整归属源片段', async () => {
  const raw = '\uFEFF# 测试章\r\n\r\n> 普通引语。\r\n\r\n---\r\n\r\n> **Interlude 01｜时间**\r\n>\r\n> 资料。\r\n\r\n---\r\n\r\n> 后续普通引语。\r\n\r\n继续小说。\r\n';
  const chapter = await chapterOf(raw);
  const result = await deriveLibrary({ chapters: [chapter], diagnostics: [] });
  assert.equal(result.interludes.length, 1);
  assert.ok(result.chapters[0]!.novel.html.includes('普通引语'));
  assert.ok(result.chapters[0]!.novel.html.includes('后续普通引语'));
  assert.ok(result.chapters[0]!.novel.html.includes('继续小说'));
  assert.equal(result.chapters[0]!.novel.blocks.filter(block => block.type === 'thematicBreak').length, 2);
  verifyPartition(result.chapters[0]!);
});

test('全书重复 Interlude 编号安全回退，两个原位置均保留', async () => {
  const chapters = await Promise.all([
    chapterOf('> **Interlude 01｜时间一**\n>\n> 资料一。', 'ch01'),
    chapterOf('> **Interlude 001｜时间二**\n>\n> 资料二。', 'ch02'),
  ]);
  const result = await deriveLibrary({ chapters, diagnostics: [] });
  assert.equal(result.interludes.length, 0);
  assert.equal(result.diagnostics.filter(item => item.code === 'DUPLICATE_INTERLUDE_ID').length, 2);
  for (const [index, chapter] of result.chapters.entries()) {
    assert.equal(chapter.novel.html, chapters[index]!.html);
    verifyPartition(chapter);
  }
});
