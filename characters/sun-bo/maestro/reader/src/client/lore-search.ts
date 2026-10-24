import type { EntityType, LoreEntity } from '../metadata/lore.ts';
const normalized = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g, '');
export function searchLore(entities: LoreEntity[], query: string, type: EntityType | 'all' = 'all', allowedIds?: readonly string[]): LoreEntity[] {
  const key = normalized(query.trim());
  return entities.filter(entity => (type === 'all' || entity.type === type) && (!allowedIds || allowedIds.includes(entity.id))
    && (!key || [entity.name, ...entity.aliases].some(name => normalized(name).includes(key))));
}
