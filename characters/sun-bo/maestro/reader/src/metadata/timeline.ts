import { resolve } from 'node:path';
import { array, object, readYaml, string } from './yaml.ts';
import type { Diagnostic, ReaderContent } from '../content/types.ts';

export interface StoryStage { id: string; label: string; source: string }
export interface ChapterTime { chapterId: string; stageId: string; scenes: { anchorId: string; stageId: string }[] }
export interface InterludeTime { interludeId: string; eventPeriod: string; stageIds: string[] }
export interface Timeline { stages: StoryStage[]; chapters: ChapterTime[]; interludes: InterludeTime[]; diagnostics: Diagnostic[] }

export function parseTimeline(value: unknown, content: ReaderContent): Timeline {
  const result: Timeline = { stages: [], chapters: [], interludes: [], diagnostics: [] };
  const warn = (code: string, message: string) => result.diagnostics.push({ severity: 'warning', code, message, file: 'data/timeline.yaml' });
  if (!object(value) || value['version'] !== 1) {
    warn('TIMELINE_VERSION', '时间增强缺失或版本不支持；小说原文仍可阅读。');
    return result;
  }
  for (const stage of array(value['stages'])) {
    if (!object(stage) || !string(stage['id']) || !/^[a-z0-9-]+$/.test(stage['id']) || !string(stage['label']) || !string(stage['source']) || result.stages.some(item => item.id === stage['id'])) {
      warn('TIMELINE_STAGE_INVALID', '故事阶段缺少 ID、标签、事实来源或 ID 重复。'); continue;
    }
    result.stages.push({ id: stage['id'], label: stage['label'], source: stage['source'] });
  }
  const stageIds = new Set(result.stages.map(stage => stage.id));
  for (const mapping of array(value['chapters'])) {
    if (!object(mapping) || !string(mapping['chapterId'])) { warn('TIMELINE_CHAPTER_INVALID', '章节关联格式无效。'); continue; }
    const chapter = content.chapters.find(chapter => chapter.id === mapping['chapterId']);
    if (!chapter || !string(mapping['stageId']) || !stageIds.has(mapping['stageId']) || result.chapters.some(item => item.chapterId === chapter.id)) {
      warn('TIMELINE_CHAPTER_UNMATCHED', `章节或故事阶段失配／重复：${mapping['chapterId']}。`); continue;
    }
    const scenes: ChapterTime['scenes'] = [];
    for (const scene of array(mapping['scenes'])) {
      if (!object(scene) || !string(scene['anchorId']) || !chapter.novel.blocks.some(block => block.id === scene['anchorId'])
        || !string(scene['stageId']) || !stageIds.has(scene['stageId']) || scenes.some(item => item.anchorId === scene['anchorId'])) {
        warn('TIMELINE_ANCHOR_UNMATCHED', `${chapter.id} 场景锚点或阶段失配／重复；该覆盖忽略，使用章节默认时间。`); continue;
      }
      scenes.push({ anchorId: scene['anchorId'], stageId: scene['stageId'] });
    }
    // 场景先后以源内容块为准，不依赖 YAML 书写顺序或行号。
    scenes.sort((a, b) => chapter.novel.blocks.findIndex(block => block.id === a.anchorId) - chapter.novel.blocks.findIndex(block => block.id === b.anchorId));
    result.chapters.push({ chapterId: chapter.id, stageId: mapping['stageId'], scenes });
  }
  for (const mapping of array(value['interludes'])) {
    if (!object(mapping) || !string(mapping['interludeId']) || !content.interludes.some(item => item.id === mapping['interludeId']) || result.interludes.some(item => item.interludeId === mapping['interludeId'])) {
      warn('TIMELINE_INTERLUDE_UNMATCHED', 'Interlude 关联 ID 失配或重复。'); continue;
    }
    const linked = array(mapping['stageIds']);
    const ids = [...new Set(linked.filter((id): id is string => string(id) && stageIds.has(id)))];
    if (!ids.length || ids.length !== linked.length) warn('TIMELINE_ASSOCIATION_EMPTY', `${mapping['interludeId']} 存在空关联、重复或失配阶段；档案仍保留在未关联列表。`);
    result.interludes.push({ interludeId: mapping['interludeId'], eventPeriod: string(mapping['eventPeriod']) ? mapping['eventPeriod'] : '', stageIds: ids });
  }
  for (const chapter of content.chapters) if (!result.chapters.some(item => item.chapterId === chapter.id)) warn('TIMELINE_CHAPTER_UNMAPPED', `${chapter.id} 未标注故事时间，仍可正常阅读。`);
  for (const interlude of content.interludes) if (!result.interludes.some(item => item.interludeId === interlude.id)) warn('TIMELINE_INTERLUDE_UNMAPPED', `${interlude.id} 未关联阶段，仍可在全部档案中查看。`);
  return result;
}

export async function loadTimeline(content: ReaderContent, dataRoot = resolve(process.cwd(), 'data')): Promise<Timeline> {
  const diagnostics: Diagnostic[] = [];
  const timeline = parseTimeline(await readYaml(resolve(dataRoot, 'timeline.yaml'), diagnostics), content);
  timeline.diagnostics.unshift(...diagnostics);
  return timeline;
}
