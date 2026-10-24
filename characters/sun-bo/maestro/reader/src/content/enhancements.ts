import { renderTree } from './markdown.ts';
import { element, mediaExtensions, mediaFigure, plainText } from './media.ts';
import type { VisualModule } from '../metadata/enhancements.ts';
import type { AssetIndex } from '../metadata/assets.ts';
import type { Interlude } from './types.ts';
import type { Element } from 'hast';

function visualModule(module: VisualModule, assets: AssetIndex): Element[] {
  if ('assetId' in module) { const asset = assets.assets.find(asset => asset.id === module.assetId); return asset ? [mediaFigure(asset)] : []; }
  const list = element(module.kind === 'timeline' ? 'ol' : 'ul', {}, module.items.map(item => element('li', {}, [
    ...(item.label ? [element('strong', {}, [plainText(item.label)])] : []), element('p', {}, [plainText(item.quote)]),
  ])));
  return [element('section', { className: ['interlude-module', `module-${module.kind}`], 'data-visual-module': module.id }, [
    ...(module.title ? [element('h3', {}, [plainText(module.title)])] : []), element('p', { className: ['eyebrow'] }, [plainText('原文摘录')]), list,
  ])];
}
export function renderInterlude(interlude: Interlude, assets: AssetIndex, modules: VisualModule[]): Promise<string> {
  return renderTree(interlude.tree, { ...mediaExtensions(assets, interlude.source.file), afterBlock: id => modules.filter(module => module.interludeId === interlude.id && module.after === id).flatMap(module => visualModule(module, assets)) });
}
