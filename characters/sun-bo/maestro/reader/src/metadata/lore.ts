import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { array, object, readYaml, string } from './yaml.ts';
import { decodeSource, parseDocument, renderTree, textOf } from '../content/markdown.ts';
import type { ContentBlock, Diagnostic, SourceSpan } from '../content/types.ts';
import type { Root, RootContent } from 'mdast';

export const ENTITY_TYPES = { person: '人物', company: '企业', model: '基础模型', harness: 'Harness', product: '产品', technology: '技术' } as const;
export type EntityType = keyof typeof ENTITY_TYPES;
export interface LoreSource { id: string; file: string; heading: string; anchorId: string; html: string; text: string; blocks: ContentBlock[]; source: SourceSpan }
export interface LoreEntity { id: string; type: EntityType; name: string; aliases: string[]; sourceId: string; summary: string | null; properties: { label: string; value: string }[]; relatedIds: string[]; sourceUrl: string }
export interface LoreIndex { entities: LoreEntity[]; sources: LoreSource[]; diagnostics: Diagnostic[] }
const normalized = (value: string) => value.normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase('en');

function excerpts(nodes: RootContent[]): string[] {
  return nodes.flatMap(node => node.type === 'paragraph' ? [textOf(node)] : node.type === 'list' ? node.children.map(item => textOf(item)) : []);
}
export async function loadLore(sourceRoot = resolve(process.cwd(), '..'), dataRoot = resolve(process.cwd(), 'data')): Promise<LoreIndex> {
  const result: LoreIndex = { entities: [], sources: [], diagnostics: [] };
  const warn = (code: string, message: string) => result.diagnostics.push({ severity: 'warning', file: 'data/entities.yaml', code, message });
  const value = await readYaml(resolve(dataRoot, 'entities.yaml'), result.diagnostics);
  if (!object(value) || value['version'] !== 1) { warn('LORE_VERSION', '实体增强缺失或版本不支持，小说阅读不受影响。'); return result; }
  const definitions = object(value['sources']) ? value['sources'] : {};
  const documents = new Map<string, Awaited<ReturnType<typeof parseDocument>>>();
  for (const [id, definition] of Object.entries(definitions)) {
    if (!object(definition) || !string(definition['file']) || !['lore.md', 'worldview.md'].includes(definition['file']) || !string(definition['heading']) || !/^[a-z0-9-]+$/.test(id)) { warn('LORE_SOURCE_INVALID', `${id} 来源格式无效或越出允许的资料文件。`); continue; }
    const file = definition['file'];
    try {
      const path = resolve(sourceRoot, file);
      if ((await realpath(path)).toLowerCase() !== path.toLowerCase()) throw new Error('不跟随资料文件链接');
      let document = documents.get(file);
      if (!document) { document = await parseDocument(file.slice(0, -3), decodeSource(file, await readFile(path))); documents.set(file, document); }
      const start = document.blocks.findIndex(block => block.node.type === 'heading' && textOf(block.node) === definition['heading']);
      const first = document.blocks[start];
      if (!first || first.node.type !== 'heading') { warn('LORE_HEADING_UNMATCHED', `${file} 缺少资料标题 ${definition['heading']}。`); continue; }
      const depth = first.node.depth;
      const end = document.blocks.findIndex((block, index) => index > start && block.node.type === 'heading' && block.node.depth <= depth);
      const blocks = document.blocks.slice(start, end < 0 ? undefined : end);
      const tree: Root = { type: 'root', children: blocks.map(block => block.node.type === 'heading' && block.node.depth === 1 ? { ...block.node, depth: 2 } : block.node) };
      result.sources.push({ id, file, heading: definition['heading'], anchorId: first.id, blocks, html: await renderTree(tree), text: textOf(tree), source: { file, start: first.source.start, end: blocks.at(-1)!.source.end } });
    } catch (error) { warn('LORE_SOURCE_UNREADABLE', `${file} 读取失败：${error instanceof Error ? error.message : String(error)}`); }
  }
  for (const definition of array(value['entities'])) {
    if (!object(definition) || !string(definition['id']) || !/^[a-z0-9-]+$/.test(definition['id']) || result.entities.some(entity => entity.id === definition['id']) || !string(definition['name']) || !string(definition['type']) || !Object.hasOwn(ENTITY_TYPES, definition['type'])) { warn('LORE_ENTITY_INVALID', '实体缺少有效 ID、类型、正式名称或 ID 重复。'); continue; }
    const source = result.sources.find(source => source.id === definition['source']);
    if (!source || !normalized(source.text).includes(normalized(definition['name']))) { warn('LORE_NAME_UNSOURCED', `${definition['id']} 的正式名称没有匹配到指定资料来源。`); continue; }
    const aliases = [...new Set(array(definition['aliases']).filter((alias): alias is string => string(alias) && normalized(source.text).includes(normalized(alias))))];
    if (aliases.length !== array(definition['aliases']).length) warn('LORE_ALIAS_UNSOURCED', `${definition['id']} 的部分别称无来源，已忽略。`);
    const candidates = excerpts(source.blocks.map(block => block.node));
    const match = string(definition['excerptMatch']) ? definition['excerptMatch'] : definition['name'];
    const summary = candidates.find(text => text.includes(match)) ?? null;
    if (string(definition['excerptMatch']) && !summary) warn('LORE_EXCERPT_UNMATCHED', `${definition['id']} 的摘录选择已失效，改用无摘要回退。`);
    const table = source.blocks.find(block => block.node.type === 'table')?.node;
    const properties = table?.type === 'table' ? table.children.slice(1).flatMap(row => {
      const fields: LoreEntity['properties'] = [];
      for (let index = 0; index + 1 < row.children.length; index += 2) fields.push({ label: textOf(row.children[index]!), value: textOf(row.children[index + 1]!) });
      return fields;
    }).filter(field => field.label && field.value) : [];
    result.entities.push({ id: definition['id'], type: definition['type'] as EntityType, name: definition['name'], aliases, sourceId: source.id, summary,
      properties: definition['type'] === 'company' ? properties : [],
      relatedIds: array(definition['related']).filter((id): id is string => string(id)), sourceUrl: `/lore/${definition['id']}/#${source.anchorId}` });
  }
  const names = new Map<string, string[]>();
  for (const entity of result.entities) for (const name of [entity.name, ...entity.aliases]) {
    const key = normalized(name); names.set(key, [...new Set([...(names.get(key) ?? []), entity.id])]);
  }
  for (const [name, ids] of names) if (ids.length > 1) warn('LORE_NAME_AMBIGUOUS', `名称 ${name} 同时指向 ${ids.join('、')}；匹配时保留歧义供修正。`);
  for (const entity of result.entities) {
    if (entity.relatedIds.some(id => !result.entities.some(item => item.id === id))) warn('LORE_RELATION_UNMATCHED', `${entity.id} 的部分相关条目失配，已忽略。`);
    entity.relatedIds = entity.relatedIds.filter(id => result.entities.some(item => item.id === id));
  }
  return result;
}
