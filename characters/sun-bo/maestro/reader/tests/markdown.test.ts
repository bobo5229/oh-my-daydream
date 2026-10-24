import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, readdir, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import type { TestContext } from 'node:test';
import { decodeSource, parseDocument } from '../src/content/markdown.ts';
import { loadChapterLibrary } from '../src/content/library.ts';

async function temporarySources(t: TestContext, files: Record<string, string | Uint8Array>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'maestro-reader-test-'));
  const chapters = join(root, 'chapters');
  await mkdir(chapters);
  t.after(async () => {
    // 只清理由本测试创建的临时文件；不递归强制删除目录树。
    for (const filename of await readdir(chapters)) await unlink(join(chapters, filename));
    await rmdir(chapters);
    await rmdir(root);
  });
  for (const [filename, bytes] of Object.entries(files)) await writeFile(join(chapters, filename), bytes);
  return root;
}

test('Markdown 支持常见语法，并阻止 HTML 与危险 URL 执行', async () => {
  const bytes = await readFile(new URL('./fixtures/markdown.md', import.meta.url));
  const parsed = await parseDocument('fixture', decodeSource('fixture.md', bytes));
  assert.equal(parsed.title, '测试章节');
  assert.equal(parsed.frontmatter, 'title: 仅作解析样本');
  for (const tag of ['h1', 'strong', 'em', 'blockquote', 'pre', 'table', 'ul', 'img']) {
    assert.match(parsed.html, new RegExp(`<${tag}(?:\\s|>)`), tag);
  }
  assert.ok(parsed.html.includes('a &#x3C; b'));
  assert.ok(parsed.html.includes('src="./images/example.png"'));
  assert.ok(parsed.html.includes('href="https://example.com"'));
  assert.ok(!parsed.html.includes('javascript:'));
  assert.ok(!parsed.html.includes('<script'));
  assert.ok(!parsed.html.includes('title: 仅作解析样本'));
});

test('BOM、CRLF 与源位置不改写原始字节', async () => {
  const bytes = Buffer.from('\uFEFF# 标题\r\n\r\n第一段。\r\n\r\n第二段。\r\n');
  const source = decodeSource('sample.md', bytes);
  const parsed = await parseDocument('sample', source);
  assert.equal(source.hasBom, true);
  assert.equal(source.byteLength, bytes.length);
  assert.deepEqual(Buffer.from(source.raw), bytes);
  assert.equal(source.markdown[0], '#');
  assert.equal(parsed.blocks[0]!.source.start.offset, 1);
  assert.equal(parsed.blocks[1]!.source.start.line, 3);
  for (const block of parsed.blocks) {
    assert.equal(block.raw, source.raw.slice(block.source.start.offset, block.source.end.offset));
  }
  assert.throws(() => decodeSource('bad.md', Uint8Array.of(0xc3, 0x28)), TypeError);
});

test('实际章节以文件为源，ID、顺序和标题可用，加载不改写源字节', async () => {
  const sourceRoot = resolve(process.cwd(), '..');
  const names = (await readdir(join(sourceRoot, 'chapters'))).filter(name => /^ch\d+\.md$/.test(name))
    .sort((a, b) => Number(a.slice(2, -3)) - Number(b.slice(2, -3))).map(name => name.slice(0, -3));
  const before = await Promise.all(names.map(id => readFile(join(sourceRoot, 'chapters', `${id}.md`))));
  const library = await loadChapterLibrary({ sourceRoot });
  assert.deepEqual(library.chapters.map(chapter => chapter.id), names);
  assert.deepEqual(library.chapters.map(chapter => chapter.ordinal), names.map(name => Number(name.slice(2))));
  assert.deepEqual(library.chapters.slice(0, 3).map(chapter => chapter.title), ['第一章', '第二章', '第三章']);
  assert.equal(library.chapters[3]!.title, '第四章｜一根不肯工作的管道');
  assert.equal(library.chapters[4]!.title, '第五章｜一封发出去的邮件');
  assert.equal(library.diagnostics.filter(item => item.severity === 'error').length, 0);
  assert.equal(library.diagnostics.filter(item => item.code === 'FALLBACK_CHAPTER_TITLE').length, 3);
  for (const [index, chapter] of library.chapters.entries()) {
    assert.deepEqual(Buffer.from(chapter.source.raw), before[index]);
    assert.deepEqual(await readFile(join(sourceRoot, chapter.source.path)), before[index]);
    assert.ok(chapter.html.length > 0);
  }
});

test('新章节自动发现，按数值排序，不需要复制页面或改源码清单', async t => {
  const sourceRoot = await temporarySources(t, { 'ch10.md': '# 第十章\n\n末段。', 'ch02.md': '第二章正文。' });
  let library = await loadChapterLibrary({ sourceRoot });
  assert.deepEqual(library.chapters.map(chapter => chapter.id), ['ch02', 'ch10']);
  await writeFile(join(sourceRoot, 'chapters/ch06.md'), '# 第六章\n\n新增正文。');
  library = await loadChapterLibrary({ sourceRoot });
  assert.deepEqual(library.chapters.map(chapter => chapter.id), ['ch02', 'ch06', 'ch10']);
});

test('损坏编码与重复编号有明确诊断，其他章节仍能读取', async t => {
  const sourceRoot = await temporarySources(t, {
    'ch01.md': '# 有效章节', 'ch1.md': '# 编号重复', 'ch02.md': Uint8Array.of(0xff), 'notes.md': '非章节。',
  });
  const library = await loadChapterLibrary({ sourceRoot });
  assert.equal(library.chapters.length, 1);
  assert.equal(library.chapters[0]!.ordinal, 1);
  for (const code of ['DUPLICATE_CHAPTER_NUMBER', 'INVALID_UTF8', 'UNKNOWN_CHAPTER_NAME']) {
    assert.ok(library.diagnostics.some(item => item.code === code), code);
  }
});

test('缺失章节目录返回诊断，不以空白页面或无解释异常替代', async () => {
  const library = await loadChapterLibrary({ sourceRoot: resolve(process.cwd(), 'tests/fixtures/no-such-story') });
  assert.equal(library.chapters.length, 0);
  assert.ok(library.diagnostics.some(item => item.code === 'CONTENT_DIRECTORY_UNAVAILABLE'));
});
