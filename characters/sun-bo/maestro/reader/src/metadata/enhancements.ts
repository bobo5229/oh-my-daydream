import { resolve } from 'node:path';
import { array, object, readYaml, string } from './yaml.ts';
import { textOf } from '../content/markdown.ts';
import type { Diagnostic, ReaderContent } from '../content/types.ts';
import type { AssetIndex } from './assets.ts';
interface ModuleBase { id: string; interludeId: string; after: string; title: string }
export type VisualModule = ModuleBase & ({ kind: 'image' | 'diagram'; assetId: string } | { kind: 'timeline' | 'cards'; items: { label: string; quote: string }[] });
export function parseEnhancements(value: unknown, content: ReaderContent, assets: AssetIndex): { modules: VisualModule[]; diagnostics: Diagnostic[] } {
  const modules: VisualModule[] = []; const diagnostics: Diagnostic[] = [];
  const warn = (message: string) => diagnostics.push({ severity: 'warning', file: 'data/visual-enhancements.yaml', code: 'VISUAL_MODULE_UNMATCHED', message });
  if (!object(value) || value['version'] !== 1) { warn('视觉增强缺失或版本不支持，继续显示完整 Markdown。'); return { modules, diagnostics }; }
  for (const item of array(value['modules'])) {
    if (!object(item) || !string(item['id']) || !/^[a-z0-9-]+$/.test(item['id']) || modules.some(module => module.id === item['id']) || !string(item['interludeId']) || !string(item['after'])) { warn('视觉模块缺少有效 ID、档案和锚点，或 ID 重复。'); continue; }
    const interlude = content.interludes.find(interlude => interlude.id === item['interludeId']);
    if (!interlude || !interlude.tree.children.some(node => node.data?.readerAnchor === item['after'])) { warn(`${item['id']} 档案或稳定锚点失配，忽略增强并保留原文。`); continue; }
    const base = { id: item['id'], interludeId: interlude.id, after: item['after'], title: string(item['title']) ? item['title'] : '' };
    if (item['kind'] === 'image' || item['kind'] === 'diagram') {
      const asset = assets.assets.find(asset => asset.id === item['assetId']);
      if (!asset || (item['kind'] === 'diagram' && asset.type !== 'diagram')) { warn(`${item['id']} 的图表资源不存在或类型不符，保留原文。`); continue; }
      modules.push({ ...base, kind: item['kind'], assetId: asset.id });
    } else if (item['kind'] === 'timeline' || item['kind'] === 'cards') {
      const original = textOf(interlude.tree).replace(/\s/g, '');
      const items = array(item['items']);
      if (!items.length || !items.every(entry => object(entry) && string(entry['quote']) && original.includes(entry['quote'].replace(/\s/g, '')) && (!entry['label'] || (string(entry['label']) && original.includes(entry['label'].replace(/\s/g, '')))))) { warn(`${item['id']} 的事件文字未匹配档案原文，忽略增强；不以 YAML 补写事实。`); continue; }
      modules.push({ ...base, kind: item['kind'], items: items.map(entry => ({ label: (entry as Record<string, string>)['label'] ?? '', quote: (entry as Record<string, string>)['quote']! })) });
    } else warn(`${item['id']} 使用未知视觉模块类型，继续显示原文。`);
  }
  return { modules, diagnostics };
}
export async function loadEnhancements(content: ReaderContent, assets: AssetIndex, dataRoot = resolve(process.cwd(), 'data')) {
  const diagnostics: Diagnostic[] = [];
  const result = parseEnhancements(await readYaml(resolve(dataRoot, 'visual-enhancements.yaml'), diagnostics), content, assets);
  result.diagnostics.unshift(...diagnostics); return result;
}
