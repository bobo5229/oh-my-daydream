import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, unlink, rmdir, symlink, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { decodeSource, parseDocument } from '../src/content/markdown.ts';
import { loadReaderContent, validateContent, assertUsableContent } from '../src/content/index.ts';
import { assertSafeOutput, captureSource, sourceChanges, withSourceGuard } from '../src/content/source-guard.ts';

test('内容锚点在前插段落与换行变化后稳定，同文重复有诊断且 ID 唯一', async () => {
  const parse = (raw: string) => parseDocument('sample', decodeSource('sample.md', Buffer.from(raw)));
  const original = await parse('第一段。\r\n\r\n保留段落。\r\n');
  const edited = await parse('新增段落。\n\n第一段。\n\n保留段落。\n');
  assert.equal(original.blocks[0]!.id, edited.blocks[1]!.id);
  assert.equal(original.blocks[1]!.id, edited.blocks[2]!.id);
  for (const block of original.blocks) assert.ok(original.html.includes(`id="${block.id}"`));
  const duplicates = await parse('相同段落。\n\n相同段落。');
  assert.notEqual(duplicates.blocks[0]!.id, duplicates.blocks[1]!.id);
  assert.ok(duplicates.diagnostics.some(item => item.code === 'DUPLICATE_BLOCK_TEXT'));
});

test('Stage 01 单入口获得完整纯小说视图、三篇档案、可导航锚点与源位置', async () => {
  const content = await loadReaderContent();
  assertUsableContent(content);
  const sources = (await readdir(resolve(process.cwd(), '../chapters'))).filter(name => /^ch\d+\.md$/.test(name));
  assert.equal(content.chapters.length, sources.length);
  assert.equal(content.interludes.length, 3);
  assert.equal(validateContent(content).length, 0);
  for (const chapter of content.chapters) {
    for (const block of chapter.novel.blocks) {
      assert.ok(chapter.novel.html.includes(`id="${block.id}"`), `${chapter.id}: ${block.type}`);
      assert.equal(block.source.file, chapter.source.path);
    }
  }
});

test('契约检测片段缺失、重复分配和重复 ID，不能用局部正确掩盖截断', async () => {
  const content = await loadReaderContent();
  const first = content.chapters[0]!;
  const corrupted = { ...content, interludes: content.interludes.slice(1), chapters: [
    { ...first, segments: first.segments.slice(1), novel: { ...first.novel, blocks: [...first.novel.blocks, first.novel.blocks[0]!] } },
    ...content.chapters.slice(1), first,
  ] };
  const diagnostics = validateContent(corrupted);
  for (const code of ['SOURCE_PARTITION_MISMATCH', 'BLOCK_COVERAGE_MISMATCH', 'DUPLICATE_CONTENT_ID', 'INTERLUDE_INDEX_MISMATCH']) {
    assert.ok(diagnostics.some(item => item.code === code), code);
  }
  assert.throws(() => assertUsableContent({ ...content, diagnostics, status: 'invalid' }), /SOURCE_PARTITION_MISMATCH/);
});

test('源快照识别新增、删除和修改，构建失败时也会核对原稿', async t => {
  const root = await mkdtemp(join(tmpdir(), 'maestro-guard-test-'));
  const chapters = join(root, 'chapters');
  await mkdir(chapters);
  const source = join(chapters, 'ch01.md');
  const added = join(root, 'lore.md');
  await writeFile(source, '原始测试内容。');
  t.after(async () => {
    await unlink(source);
    await unlink(added).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; });
    await rmdir(chapters);
    await rmdir(root);
  });
  const before = await captureSource(root);
  await withSourceGuard(root, async () => { assert.deepEqual(await captureSource(root), before); });
  await assert.rejects(withSourceGuard(root, async () => { throw new Error('模拟构建失败'); }), /模拟构建失败/);
  await assert.rejects(withSourceGuard(root, async () => {
    await writeFile(source, '仅测试临时原稿的变化检测。');
    throw new Error('模拟失败');
  }), /原稿在操作期间发生变化/);
  await writeFile(added, '新增测试资料。');
  const after = await captureSource(root);
  assert.deepEqual(sourceChanges(before, after).map(change => change.kind).sort(), ['added', 'changed']);
  await unlink(source);
  assert.ok(sourceChanges(after, await captureSource(root)).some(change => change.kind === 'removed'));
  await writeFile(source, '便于测试清理的临时内容。');
});

test('输出限制在工程内，拒绝原稿目录与工程根本身', async () => {
  const root = process.cwd();
  await assertSafeOutput(root, resolve(root, 'dist'));
  await assertSafeOutput(root, '.cache/new-output');
  await assert.rejects(assertSafeOutput(root, '../chapters'), /输出路径必须/);
  await assert.rejects(assertSafeOutput(root, root), /输出路径必须/);
});

test('输出目录中的链接不能把构建引向工程外部', async t => {
  const root = await mkdtemp(join(tmpdir(), 'maestro-output-test-'));
  const project = join(root, 'project');
  const external = join(root, 'external');
  const link = join(project, 'dist');
  await mkdir(project);
  await mkdir(external);
  await symlink(external, link, 'junction');
  t.after(async () => {
    await unlink(link);
    await rmdir(project);
    await rmdir(external);
    await rmdir(root);
  });
  await assert.rejects(assertSafeOutput(project, join(link, 'nested')), /通过链接越出工程目录/);
});
