import { resolve } from 'node:path';
import { array, object, readYaml, string } from './yaml.ts';
import type { Nodes } from 'mdast';
import type { Diagnostic, ReaderContent } from '../content/types.ts';
import type { LoreEntity, LoreIndex } from './lore.ts';

export interface EntityHit { entityId: string; name: string; anchorId: string | null; via: 'name' | 'alias' | 'include' | 'resolve' }
export interface ChapterEntities { chapterId: string; entityIds: string[]; hits: EntityHit[]; ambiguous: { name: string; entityIds: string[]; anchorId: string }[] }
export interface EntityAssociations { chapters: ChapterEntities[]; diagnostics: Diagnostic[] }
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en');
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function readableText(node: Nodes): string {
  if (['code', 'inlineCode', 'yaml', 'html', 'definition', 'image', 'imageReference'].includes(node.type)) return '';
  if ('value' in node) return node.value;
  if ('children' in node) return node.children.map(readableText).join(node.type === 'paragraph' ? '' : '\n');
  return '';
}

export function findEntityNames(text: string, entities: LoreEntity[]): { name: string; entityIds: string[]; alias: boolean }[] {
  const input = normalize(text);
  const matches: { start: number; end: number; name: string; entityId: string; alias: boolean }[] = [];
  for (const entity of entities) for (const [index, name] of [entity.name, ...entity.aliases].entries()) {
    if (index > 0 && /^[a-z]{1,2}$/i.test(name)) continue; // ko 等短别称容易命中普通词或命令。
    const normalizedName = normalize(name);
    const pattern = escape(normalizedName).replace(/\s+/g, '\\s*');
    const boundary = '[a-z0-9_.-]';
    const regex = new RegExp(`${/^[a-z0-9]/.test(normalizedName) ? `(?<!${boundary})` : ''}${pattern}${/[a-z0-9]$/.test(normalizedName) ? `(?!${boundary})` : ''}`, 'g');
    for (const match of input.matchAll(regex)) matches.push({ start: match.index, end: match.index + match[0].length, name, entityId: entity.id, alias: index > 0 });
  }
  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const accepted: typeof matches = [];
  for (const match of matches) {
    if (accepted.some(item => item.start <= match.start && item.end >= match.end && (item.start !== match.start || item.end !== match.end))) continue;
    accepted.push(match);
  }
  const groups = new Map<string, { name: string; entityIds: string[]; alias: boolean }>();
  for (const match of accepted) {
    const key = `${match.start}:${match.end}`;
    const group = groups.get(key) ?? { name: match.name, entityIds: [], alias: match.alias };
    if (!group.entityIds.includes(match.entityId)) group.entityIds.push(match.entityId);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function associateEntities(content: ReaderContent, lore: LoreIndex, overrides: unknown): EntityAssociations {
  const result: EntityAssociations = { chapters: [], diagnostics: [] };
  const warn = (message: string) => result.diagnostics.push({ severity: 'warning', file: 'data/entity-overrides.yaml', code: 'ENTITY_OVERRIDE_UNMATCHED', message });
  const records = object(overrides) && overrides['version'] === 1 ? array(overrides['chapters']) : [];
  if (!object(overrides) || overrides['version'] !== 1) warn('关联修正缺失或版本不支持，继续使用保守自动识别。');
  const seenChapters = new Set<string>();
  for (const record of records) {
    if (!object(record) || !string(record['chapterId']) || !content.chapters.some(chapter => chapter.id === record['chapterId']) || seenChapters.has(record['chapterId'])) { warn('修正指向无效／重复章节，已忽略。'); continue; }
    seenChapters.add(record['chapterId']);
    for (const id of [...array(record['include']), ...array(record['exclude']), ...Object.values(object(record['resolve']) ? record['resolve'] : {})]) if (!lore.entities.some(entity => entity.id === id)) warn(`${record['chapterId']} 存在失配实体 ID ${String(id)}。`);
  }
  for (const chapter of content.chapters) {
    const record = records.find(record => object(record) && record['chapterId'] === chapter.id);
    const correction = object(record) ? record : {};
    const resolutions = object(correction['resolve']) ? correction['resolve'] : {};
    const mapped: ChapterEntities = { chapterId: chapter.id, entityIds: [], hits: [], ambiguous: [] };
    for (const block of chapter.novel.blocks) for (const match of findEntityNames(readableText(block.node), lore.entities)) {
      if (match.entityIds.length === 1) mapped.hits.push({ entityId: match.entityIds[0]!, name: match.name, anchorId: block.id, via: match.alias ? 'alias' : 'name' });
      else {
        const resolved = Object.entries(resolutions).find(([name, id]) => normalize(name) === normalize(match.name) && string(id) && match.entityIds.includes(id));
        if (resolved) mapped.hits.push({ entityId: resolved[1] as string, name: match.name, anchorId: block.id, via: 'resolve' });
        else mapped.ambiguous.push({ name: match.name, entityIds: match.entityIds, anchorId: block.id });
      }
    }
    for (const id of array(correction['include'])) if (string(id) && lore.entities.some(entity => entity.id === id)) mapped.hits.push({ entityId: id, name: lore.entities.find(entity => entity.id === id)!.name, anchorId: null, via: 'include' });
    const excluded = array(correction['exclude']);
    mapped.hits = mapped.hits.filter(hit => !excluded.includes(hit.entityId));
    mapped.entityIds = [...new Set(mapped.hits.map(hit => hit.entityId))];
    if (mapped.ambiguous.length) result.diagnostics.push({ severity: 'warning', file: chapter.source.path, code: 'ENTITY_NAME_AMBIGUOUS', message: `${chapter.id} 存在 ${mapped.ambiguous.length} 处重名，未自动指向任何一个条目；可用 resolve 修正。` });
    result.chapters.push(mapped);
  }
  return result;
}

export async function loadEntityAssociations(content: ReaderContent, lore: LoreIndex, dataRoot = resolve(process.cwd(), 'data')): Promise<EntityAssociations> {
  const diagnostics: Diagnostic[] = [];
  const value = await readYaml(resolve(dataRoot, 'entity-overrides.yaml'), diagnostics);
  const result = associateEntities(content, lore, value);
  result.diagnostics.unshift(...diagnostics);
  return result;
}
