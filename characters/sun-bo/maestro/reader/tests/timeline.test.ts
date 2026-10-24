import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadReaderContent } from '../src/content/index.ts';
import { loadTimeline, parseTimeline } from '../src/metadata/timeline.ts';
import { resolveStoryStage } from '../src/client/story-time.ts';

const content = await loadReaderContent();

test('S03-T01：真实章节、场景锚点与三篇档案全部匹配，寒假保留为故事阶段', async () => {
  const timeline = await loadTimeline(content);
  assert.deepEqual(timeline.diagnostics, []);
  assert.equal(timeline.chapters.length, content.chapters.length);
  assert.equal(timeline.interludes.length, content.interludes.length);
  assert.equal(timeline.stages.find(stage => stage.id === 'winter-2022')?.label, '2022 年寒假');
  assert.equal(timeline.interludes.find(item => item.interludeId === 'interlude-03')?.eventPeriod, '2021 年 12 月—2022 年 3 月');
  assert.equal('readingOrder' in timeline.interludes[0]!, false);
});

test('S03-T02：默认阶段与跨年场景覆盖随稳定块位置前进或回退，失效锚点安全回退', async () => {
  const timeline = await loadTimeline(content);
  const chapter = content.chapters.find(chapter => chapter.id === 'ch03')!;
  const blocks = chapter.novel.blocks.map(block => block.id);
  const boundary = timeline.chapters.find(item => item.chapterId === chapter.id)!.scenes[0]!.anchorId;
  const index = blocks.indexOf(boundary);
  assert.equal(resolveStoryStage(timeline, 'ch03', blocks, blocks[index - 1])?.id, 'december-2021');
  assert.equal(resolveStoryStage(timeline, 'ch03', blocks, boundary)?.id, 'january-2022');
  assert.equal(resolveStoryStage(timeline, 'ch03', blocks, blocks[index + 1])?.id, 'january-2022');
  assert.equal(resolveStoryStage(timeline, 'ch03', blocks, blocks[0])?.id, 'december-2021');
  assert.equal(resolveStoryStage(timeline, 'ch03', blocks, 'removed')?.id, 'december-2021');
  assert.equal(resolveStoryStage(timeline, 'ch99', blocks), null);
  const ordinary = content.chapters.find(chapter => chapter.id === 'ch04')!;
  assert.equal(resolveStoryStage(timeline, ordinary.id, ordinary.novel.blocks.map(block => block.id), ordinary.novel.blocks.at(-1)!.id)?.id, 'winter-2022');
});

test('S03-T01：失配章节、场景和空关联有诊断，失效覆盖不截断原文', () => {
  const value = {
    version: 1, stages: [{ id: 'known', label: '有效阶段', source: '测试示意' }],
    chapters: [{ chapterId: 'ch03', stageId: 'known', scenes: [{ anchorId: 'missing', stageId: 'known' }] }, { chapterId: 'ch99', stageId: 'known' }],
    interludes: [{ interludeId: 'interlude-02', eventPeriod: '源时间标签', stageIds: [] }],
  };
  const result = parseTimeline(value, content);
  assert.deepEqual(result.chapters[0]?.scenes, []);
  for (const code of ['TIMELINE_ANCHOR_UNMATCHED', 'TIMELINE_CHAPTER_UNMATCHED', 'TIMELINE_ASSOCIATION_EMPTY', 'TIMELINE_CHAPTER_UNMAPPED', 'TIMELINE_INTERLUDE_UNMAPPED']) {
    assert.ok(result.diagnostics.some(item => item.code === code));
  }
  assert.equal(content.chapters.find(chapter => chapter.id === 'ch03')!.novel.html.length > 1000, true);
});
