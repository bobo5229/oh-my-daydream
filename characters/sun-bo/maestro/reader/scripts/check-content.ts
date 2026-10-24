import { loadPresentation } from '../src/presentation.ts';
import { withSourceGuard } from '../src/content/source-guard.ts';
import { resolve } from 'node:path';

await withSourceGuard(resolve(process.cwd(), '..'), async () => {
  const { content, timeline, order, lore, associations, assets, illustrations, enhancements, diagnostics } = await loadPresentation({ render: false });
  console.log(JSON.stringify({
    status: content.status,
    chapters: content.chapters.map(chapter => ({
      id: chapter.id, title: chapter.title, source: chapter.source.path, sha256: chapter.source.sha256,
      blocks: chapter.blocks.map(block => ({ id: block.id, type: block.type })), segments: chapter.segments.map(segment => ({ kind: segment.kind, start: segment.source.start.offset, end: segment.source.end.offset })),
    })),
    interludes: content.interludes.map(interlude => ({ id: interlude.id, chapterId: interlude.chapterId, source: interlude.source, anchors: interlude.tree.children.map(node => node.data?.readerAnchor) })),
    timeline: { stages: timeline.stages, chapters: timeline.chapters, interludes: timeline.interludes },
    readingOrder: { novel: order.novel.map(node => node.id), chronicle: order.chronicle.map(node => node.id) },
    lore: { entities: lore.entities.map(entity => ({ id: entity.id, type: entity.type, name: entity.name, source: entity.sourceId })), associations: associations.chapters },
    assets: assets.assets.map(({ id, type, file, src, available, chapterIds, interludeIds, entityIds }) => ({ id, type, file, src, available, chapterIds, interludeIds, entityIds })),
    illustrations: illustrations.placements, visualModules: enhancements.modules,
    diagnostics,
  }, null, 2));
});
