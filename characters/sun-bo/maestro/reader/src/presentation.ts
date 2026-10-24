import { resolve } from 'node:path';
import { assertUsableContent, loadReaderContent } from './content/index.ts';
import { loadLore } from './metadata/lore.ts';
import { loadTimeline } from './metadata/timeline.ts';
import { loadReadingOrder } from './metadata/reading-order.ts';
import { loadEntityAssociations } from './metadata/entity-matches.ts';
import { loadAssets } from './metadata/assets.ts';
import { loadIllustrations } from './metadata/illustrations.ts';
import { loadEnhancements } from './metadata/enhancements.ts';
import { renderMedia } from './content/media.ts';
import { renderInterlude } from './content/enhancements.ts';

/** 构建预检与页面使用同一组增强数据和降级规则，始终只修改派生视图。 */
export async function loadPresentation(options: { sourceRoot?: string; dataRoot?: string; render?: boolean } = {}) {
  const sourceRoot = options.sourceRoot ?? resolve(process.cwd(), '..');
  const dataRoot = options.dataRoot ?? resolve(process.cwd(), 'data');
  const [content, lore] = await Promise.all([loadReaderContent({ sourceRoot }), loadLore(sourceRoot, dataRoot)]);
  assertUsableContent(content);
  const [timeline, order, associations, assets] = await Promise.all([loadTimeline(content, dataRoot), loadReadingOrder(content, dataRoot), loadEntityAssociations(content, lore, dataRoot), loadAssets(content, lore, sourceRoot, dataRoot)]);
  const [illustrations, enhancements] = await Promise.all([loadIllustrations(content, assets, dataRoot), loadEnhancements(content, assets, dataRoot)]);
  if (options.render !== false) {
    await Promise.all([
      ...content.chapters.flatMap(chapter => chapter.segments.filter(segment => segment.kind === 'novel').map(async segment => { segment.html = await renderMedia(segment.tree, assets, chapter.source.path, illustrations.placements.filter(item => item.chapterId === chapter.id)); })),
      ...content.interludes.map(async interlude => { interlude.html = await renderInterlude(interlude, assets, enhancements.modules); }),
      ...lore.sources.map(async source => { source.html = await renderMedia({ type: 'root', children: source.blocks.map(block => block.node.type === 'heading' && block.node.depth === 1 ? { ...block.node, depth: 2 } : block.node) }, assets, source.file); }),
    ]);
  }
  const diagnostics = [content, lore, timeline, order, associations, assets, illustrations, enhancements].flatMap(item => item.diagnostics);
  return { content, lore, timeline, order, associations, assets, illustrations, enhancements, diagnostics };
}
