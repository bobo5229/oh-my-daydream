import type { Timeline, StoryStage } from '../metadata/timeline.ts';

/** 输入仅为展示元数据与实际块顺序，不依赖源行号、日期猜测或滚动像素。 */
export function resolveStoryStage(timeline: Pick<Timeline, 'stages' | 'chapters'>, chapterId: string, blockIds: readonly string[], anchorId?: string): StoryStage | null {
  const chapter = timeline.chapters.find(item => item.chapterId === chapterId);
  if (!chapter) return null;
  let stageId = chapter.stageId;
  const current = anchorId ? blockIds.indexOf(anchorId) : -1;
  let nearest = -1;
  if (current >= 0) for (const scene of chapter.scenes) {
    const index = blockIds.indexOf(scene.anchorId);
    if (index >= 0 && index <= current && index >= nearest) { nearest = index; stageId = scene.stageId; }
  }
  return timeline.stages.find(stage => stage.id === stageId) ?? null;
}
