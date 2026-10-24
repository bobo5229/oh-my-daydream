import type { Element, ElementContent } from 'hast';
import type { Root } from 'mdast';
import { renderTree } from './markdown.ts';
import { assetFile } from '../metadata/assets.ts';
import type { AssetIndex, VisualAsset } from '../metadata/assets.ts';
import type { Illustration } from '../metadata/illustrations.ts';

export const element = (tagName: string, properties: Element['properties'], children: ElementContent[]): Element => ({ type: 'element', tagName, properties, children });
export const plainText = (value: string): ElementContent => ({ type: 'text', value });
export function mediaImage(asset: VisualAsset, alt = asset.alt): Element {
  if (!asset.available || !asset.src) return element('span', { className: ['missing-media'], role: 'img', 'aria-label': `图像暂不可用：${alt}` }, [plainText(`图像暂不可用 · ${alt}`)]);
  return element('button', { type: 'button', className: ['image-trigger'], 'data-media-open': asset.src, 'aria-haspopup': 'dialog', 'aria-label': `放大：${alt}` }, [element('img', { src: asset.src, alt, loading: 'lazy', decoding: 'async', ...(asset.width ? { width: asset.width } : {}), ...(asset.height ? { height: asset.height } : {}) }, [])]);
}
export function mediaFigure(asset: VisualAsset): Element {
  return element('figure', { className: ['asset-figure'], 'data-asset-id': asset.id }, [mediaImage(asset), ...(asset.caption ? [element('figcaption', {}, [plainText(asset.caption)])] : [])]);
}
export function mediaExtensions(assets: AssetIndex, sourceFile: string, placements: Illustration[] = []) {
  return {
    image: (node: Element): Element => {
      const file = typeof node.properties.src === 'string' ? assetFile(node.properties.src, sourceFile) : null;
      const asset = assets.assets.find(asset => asset.file === file);
      const alt = typeof node.properties.alt === 'string' && node.properties.alt ? node.properties.alt : asset?.alt ?? '原稿图片';
      return asset ? mediaImage(asset, alt) : element('span', { className: ['missing-media'] }, [plainText(`图像暂不可用 · ${alt}`)]);
    },
    afterBlock: (id: string): Element[] => placements.filter(placement => placement.after === id).flatMap(placement => {
      const asset = assets.assets.find(asset => asset.id === placement.assetId); return asset ? [mediaFigure(asset)] : [];
    }),
  };
}
export function renderMedia(tree: Root, assets: AssetIndex, sourceFile: string, placements: Illustration[] = []): Promise<string> {
  return renderTree(tree, mediaExtensions(assets, sourceFile, placements));
}
