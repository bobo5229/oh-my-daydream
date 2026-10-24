import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPresentation } from '../src/presentation.ts';
import { withSourceGuard } from '../src/content/source-guard.ts';

test('S07-T03：新增／删除普通章节、错误 YAML、缺图和失效锚点均可诊断，文字与编年完整回退', async () => {
  const root = await mkdtemp(join(tmpdir(), 'maestro-maintenance-'));
  const written: string[] = [];
  const write = async (file: string, body: string | Uint8Array) => { await writeFile(join(root, file), body); if (!written.includes(file)) written.push(file); };
  for (const directory of ['chapters', 'data', 'assets']) await mkdir(join(root, directory));
  try {
    for (const file of ['lore.md', 'worldview.md']) await write(file, await readFile(join('..', file)));
    for (const file of ['timeline.yaml', 'reading-order.yaml', 'entities.yaml', 'entity-overrides.yaml', 'assets.yaml', 'illustrations.yaml', 'visual-enhancements.yaml']) await write(`data/${file}`, await readFile(`data/${file}`));
    await write('chapters/ch01.md', '# 测试章节一\n\n前段文字。\n\n后段文字。');
    await write('chapters/ch02.md', '# 新增测试章节\n\n无需改页面模板的新文字。');
    await write('data/timeline.yaml', 'version: 1\nversion: 1\n');
    await write('data/assets.yaml', 'version: 1\nassets:\n  - { id: missing, type: scene, file: assets/missing.png, alt: 缺失的测试图 }');
    await write('data/illustrations.yaml', 'version: 1\nplacements:\n  - { chapterId: ch01, after: removed-anchor, assetId: missing }');
    await write('data/visual-enhancements.yaml', 'version: 1\nmodules:\n  - { id: stale, interludeId: interlude-99, after: removed, kind: diagram, assetId: missing }');
    const options = { sourceRoot: root, dataRoot: join(root, 'data') };
    const first = await withSourceGuard(root, () => loadPresentation(options));
    assert.deepEqual(first.content.chapters.map(chapter => chapter.id), ['ch01', 'ch02']);
    assert.equal(first.order.novel.length, 2);
    assert.ok(first.content.chapters[1]!.segments.some(segment => segment.html.includes('无需改页面模板的新文字')));
    for (const code of ['METADATA_UNREADABLE', 'READING_ORDER_FALLBACK', 'ASSET_UNAVAILABLE', 'ILLUSTRATION_UNMATCHED', 'VISUAL_MODULE_UNMATCHED']) assert.ok(first.diagnostics.some(item => item.code === code), code);
    await unlink(join(root, 'chapters/ch02.md'));
    await write('chapters/ch03.md', '# 含章中档案的测试章节\n\n前段测试文字。\n\n> **Interlude 01｜测试阶段**\n>\n> 明确为非正式的测试档案。\n\n后段测试文字。');
    const second = await withSourceGuard(root, () => loadPresentation(options));
    assert.deepEqual(second.content.chapters.map(chapter => chapter.id), ['ch01', 'ch03']);
    assert.deepEqual(second.order.chronicle.filter(node => node.kind === 'novel').flatMap(node => node.blockIds), second.content.chapters.flatMap(chapter => chapter.novel.blocks.map(block => block.id)));
    assert.equal(second.order.chronicle.filter(node => node.kind === 'interlude').length, 1);
    assert.equal(await readFile(join(root, 'chapters/ch01.md'), 'utf8'), '# 测试章节一\n\n前段文字。\n\n后段文字。');
  } finally {
    for (const file of written) await unlink(join(root, file)).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; });
    for (const directory of ['chapters', 'data', 'assets']) await rmdir(join(root, directory));
    await rmdir(root);
  }
});
