import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, copyFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadLorePresentation, loadPresentation } from '../src/presentation.ts';

test('独立 Lore 与正文抽屉共享来源渲染，无需时间线和阅读编排配置', async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), 'maestro-lore-presentation-'));
  const files = ['entities.yaml', 'assets.yaml'];
  const copied: string[] = [];
  try {
    for (const file of files) { await copyFile(join('data', file), join(dataRoot, file)); copied.push(file); }
    const standalone = await loadLorePresentation({ dataRoot });
    const complete = await loadPresentation();
    const sources = (lore: typeof standalone.lore) => lore.sources.map(source => ({ id: source.id, htmlHash: createHash('sha256').update(source.html).digest('hex') }));
    assert.deepEqual(sources(standalone.lore), sources(complete.lore));
    assert.deepEqual(standalone.lore.entities, complete.lore.entities);
    assert.deepEqual(standalone.content.chapters.map(chapter => chapter.id), complete.content.chapters.map(chapter => chapter.id));
    assert.deepEqual(standalone.assets, complete.assets);
    assert.ok(standalone.diagnostics.every(item => !item.file.startsWith('data/') || files.some(file => item.file.endsWith(file))));
    const raw = await loadLorePresentation({ dataRoot, render: false });
    assert.deepEqual(raw.lore.entities, standalone.lore.entities);
  } finally {
    for (const file of copied) await unlink(join(dataRoot, file));
    await rmdir(dataRoot);
  }
});
