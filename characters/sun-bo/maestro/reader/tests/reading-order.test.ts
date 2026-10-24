import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadReaderContent } from '../src/content/index.ts';
import { loadReadingOrder, parseReadingOrder } from '../src/metadata/reading-order.ts';

const content = await loadReaderContent();
test('S04-T01：两套真实序列不丢不重，章中档案按 YAML 插在前后片段之间', async () => {
  const order = await loadReadingOrder(content);
  assert.deepEqual(order.diagnostics, []);
  assert.ok(order.novel.every(node => node.kind === 'novel'));
  assert.deepEqual(order.novel.flatMap(node => node.blockIds), content.chapters.flatMap(chapter => chapter.novel.blocks.map(block => block.id)));
  assert.deepEqual(order.chronicle.filter(node => node.kind === 'novel').flatMap(node => node.blockIds), order.novel.flatMap(node => node.blockIds));
  assert.deepEqual(order.chronicle.filter(node => node.chapterId === 'ch03').map(node => node.id), ['ch03-novel-1', 'interlude-02', 'ch03-novel-2']);
  assert.equal(order.chronicle.filter(node => node.kind === 'interlude').length, content.interludes.length);
});
test('S04-T01：不完整或重复编排回退到完整源顺序，新章节不会被旧 YAML 丢弃', () => {
  const order = parseReadingOrder({ version: 1, novel: ['ch01'], chronicle: [{ chapter: 'ch03' }, { segment: 'ch03-novel-1' }] }, content);
  assert.ok(order.diagnostics.length);
  assert.equal(order.novel.length, content.chapters.length);
  const expected = content.chapters.flatMap(chapter => chapter.novel.blocks.map(block => block.id));
  assert.deepEqual(order.chronicle.filter(node => node.kind === 'novel').flatMap(node => node.blockIds), expected);
  assert.equal(order.chronicle.filter(node => node.kind === 'interlude').length, content.interludes.length);
});
