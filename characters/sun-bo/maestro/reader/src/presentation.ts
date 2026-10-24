import { resolve } from 'node:path';
import { assertUsableContent, loadReaderContent } from './content/index.ts';
import { loadLore } from './metadata/lore.ts';
import type { LoreIndex } from './metadata/lore.ts';
import { loadTimeline } from './metadata/timeline.ts';
import { loadReadingOrder } from './metadata/reading-order.ts';
import { loadEntityAssociations } from './metadata/entity-matches.ts';
import { loadAssets } from './metadata/assets.ts';
import type { AssetIndex } from './metadata/assets.ts';
import { withAssetRelations } from './metadata/asset-relations.ts';
import { loadIllustrations } from './metadata/illustrations.ts';
import { loadEnhancements } from './metadata/enhancements.ts';
import { renderMedia } from './content/media.ts';
import { renderInterlude } from './content/enhancements.ts';

interface PresentationOptions { sourceRoot?: string; dataRoot?: string; render?: boolean }

async function loadSources(options: PresentationOptions) {
  const sourceRoot = options.sourceRoot ?? resolve(process.cwd(), '..');
  const dataRoot = options.dataRoot ?? resolve(process.cwd(), 'data');
  const [content, lore] = await Promise.all([loadReaderContent({ sourceRoot }), loadLore(sourceRoot, dataRoot)]);
  assertUsableContent(content);
  return { sourceRoot, dataRoot, content, lore };
}

async function renderLoreSources(lore: LoreIndex, assets: AssetIndex): Promise<void> {
  await Promise.all(lore.sources.map(async source => {
    source.html = await renderMedia({ type: 'root', children: source.blocks.map(block => block.node.type === 'heading' && block.node.depth === 1 ? { ...block.node, depth: 2 } : block.node) }, assets, source.file);
  }));
}

/** 独立 Lore 与正文抽屉复用来源读取和渲染规则，不加载无关的时间线或阅读编排。 */
export async function loadLorePresentation(options: PresentationOptions = {}) {
  const { sourceRoot, dataRoot, content, lore } = await loadSources(options);
  const assets = await loadAssets(content, lore, sourceRoot, dataRoot);
  if (options.render !== false) await renderLoreSources(lore, assets);
  return { content, lore, assets, diagnostics: [content, lore, assets].flatMap(item => item.diagnostics) };
}

/** 构建预检与页面使用同一组增强数据和降级规则，始终只修改派生视图。 */
export async function loadPresentation(options: PresentationOptions = {}) {
  const { sourceRoot, dataRoot, content, lore } = await loadSources(options);
  const [timeline, order, associations, sourceAssets] = await Promise.all([loadTimeline(content, dataRoot), loadReadingOrder(content, dataRoot), loadEntityAssociations(content, lore, dataRoot), loadAssets(content, lore, sourceRoot, dataRoot)]);
  const [illustrations, enhancements] = await Promise.all([loadIllustrations(content, sourceAssets, dataRoot), loadEnhancements(content, sourceAssets, dataRoot)]);
  const assets = withAssetRelations(sourceAssets, illustrations.placements, enhancements.modules);
  if (options.render !== false) {
    await Promise.all([
      ...content.chapters.flatMap(chapter => chapter.segments.filter(segment => segment.kind === 'novel').map(async segment => { segment.html = await renderMedia(segment.tree, assets, chapter.source.path, illustrations.placements.filter(item => item.chapterId === chapter.id)); })),
      ...content.interludes.map(async interlude => { interlude.html = await renderInterlude(interlude, assets, enhancements.modules); }),
      renderLoreSources(lore, assets),
    ]);
  }
  const diagnostics = [content, lore, timeline, order, associations, assets, illustrations, enhancements].flatMap(item => item.diagnostics);
  return { content, lore, timeline, order, associations, assets, illustrations, enhancements, diagnostics };
}
