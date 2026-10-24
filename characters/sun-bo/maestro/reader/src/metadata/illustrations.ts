import { resolve } from 'node:path';
import { array, object, readYaml, string } from './yaml.ts';
import type { Diagnostic, ReaderContent } from '../content/types.ts';
import type { AssetIndex } from './assets.ts';
export interface Illustration { chapterId: string; after: string; assetId: string }
export function parseIllustrations(value: unknown, content: ReaderContent, assets: AssetIndex): { placements: Illustration[]; diagnostics: Diagnostic[] } {
  const placements: Illustration[] = []; const diagnostics: Diagnostic[] = [];
  const warn = (message: string) => diagnostics.push({ severity: 'warning', code: 'ILLUSTRATION_UNMATCHED', file: 'data/illustrations.yaml', message });
  if (!object(value) || value['version'] !== 1) { warn('插图增强缺失或版本不支持，保留完整文字。'); return { placements, diagnostics }; }
  for (const item of array(value['placements'])) {
    if (!object(item) || !string(item['chapterId']) || !string(item['after']) || !string(item['assetId'])) { warn('插图关联格式无效，已忽略。'); continue; }
    const chapter = content.chapters.find(chapter => chapter.id === item['chapterId']);
    const asset = assets.assets.find(asset => asset.id === item['assetId']);
    if (!chapter?.novel.blocks.some(block => block.id === item['after']) || !asset || placements.some(placement => placement.after === item['after'] && placement.assetId === item['assetId'])) { warn(`${item['chapterId']} 的插图锚点或资源失配／重复，原文字继续显示。`); continue; }
    placements.push({ chapterId: chapter.id, after: item['after'], assetId: asset.id });
  }
  return { placements, diagnostics };
}
export async function loadIllustrations(content: ReaderContent, assets: AssetIndex, dataRoot = resolve(process.cwd(), 'data')) {
  const diagnostics: Diagnostic[] = [];
  const result = parseIllustrations(await readYaml(resolve(dataRoot, 'illustrations.yaml'), diagnostics), content, assets);
  result.diagnostics.unshift(...diagnostics); return result;
}
