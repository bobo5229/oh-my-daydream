import { searchLore } from './lore-search.ts';
import type { EntityType, LoreEntity } from '../metadata/lore.ts';
import { readNovelProgress } from './storage.ts';

const browser = document.querySelector<HTMLElement>('[data-lore-browser]');
if (browser) {
  const data = JSON.parse(document.querySelector('#reader-entities')?.textContent ?? '{"entities":[],"sources":[]}') as { entities: LoreEntity[]; sources: { id: string; file: string; heading: string }[] };
  const entities = data.entities;
  const context = JSON.parse(browser.dataset['chapterEntityIds'] ?? '{}') as Record<string, string[]>;
  const saved = document.querySelector('article[data-chapter-id]') ? null : readNovelProgress(Object.keys(context));
  const relatedIds = (saved ? context[saved.chapterId] : undefined) ?? JSON.parse(browser.dataset['relatedEntityIds'] ?? '[]') as string[];
  const input = browser.querySelector<HTMLInputElement>('[data-lore-search]')!;
  const category = browser.querySelector<HTMLSelectElement>('[data-lore-category]')!;
  const results = [...browser.querySelectorAll<HTMLElement>('[data-entity-result]')];
  const browse = browser.querySelector<HTMLElement>('[data-lore-browse]')!;
  const detail = browser.querySelector<HTMLElement>('[data-lore-detail]')!;
  const drawer = browser.closest('dialog');
  let scope = 'context';
  let selectedId: string | null = null;
  let previousIds: string[] = [];
  let listScroll = 0;
  const labels: Record<EntityType, string> = { person: '人物', company: '企业', model: '基础模型', harness: 'Harness', product: '产品', technology: '技术' };
  function update(): void {
    const all = Boolean(input.value.trim()) || scope === 'all';
    const matches = searchLore(entities, input.value, category.value as EntityType | 'all', all ? undefined : relatedIds);
    for (const row of results) row.hidden = !matches.some(entity => entity.id === row.dataset['entityResult']);
    browser!.querySelector('[data-lore-results-count]')!.textContent = `${all ? '全部资料' : '本章相关'} · ${matches.length} 个条目`;
    browser!.querySelector<HTMLElement>('[data-lore-empty]')!.hidden = matches.length > 0;
    browser!.querySelector<HTMLElement>('[data-lore-empty]')!.textContent = !all && !input.value ? '本章暂无匹配条目，可浏览全部资料。' : '没有找到匹配条目，可更换名称、别称或类别。';
    browser!.querySelectorAll<HTMLButtonElement>('[data-lore-scope]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset['loreScope'] === (all ? 'all' : 'context'))));
  }
  function showEntity(id: string): void {
    const entity = entities.find(entity => entity.id === id);
    if (!entity) return;
    if (!selectedId) listScroll = drawer?.scrollTop ?? 0;
    selectedId = id;
    browse.hidden = true; detail.hidden = false;
    detail.dataset['selectedEntity'] = id;
    const title = detail.querySelector<HTMLElement>('[data-entity-title]')!;
    title.textContent = entity.name;
    detail.querySelector('[data-entity-type]')!.textContent = labels[entity.type];
    detail.querySelectorAll<HTMLElement>('[data-entity-asset]').forEach(figure => { figure.hidden = !(JSON.parse(figure.dataset['entityOwners'] ?? '[]') as string[]).includes(id); });
    detail.querySelector('[data-entity-aliases]')!.textContent = entity.aliases.length ? `别称：${entity.aliases.join('、')}` : '';
    detail.querySelector('[data-entity-summary]')!.textContent = entity.summary ? (entity.summary.length > 240 ? `${entity.summary.slice(0, 240)}…` : entity.summary) : '暂无独立摘要，可查看完整来源资料。';
    const properties = detail.querySelector('[data-entity-properties]')!;
    properties.replaceChildren(...entity.properties.flatMap(property => {
      const term = document.createElement('dt'); term.textContent = property.label;
      const value = document.createElement('dd'); value.textContent = property.value;
      return [term, value];
    }));
    const source = data.sources.find(source => source.id === entity.sourceId);
    const credit = document.createElement('a');
    credit.href = entity.sourceUrl;
    credit.textContent = source ? `来源：${source.file} · ${source.heading}` : '来源暂不可用';
    detail.querySelector('[data-entity-source]')!.replaceChildren(credit);
    detail.querySelector<HTMLDetailsElement>('[data-lore-full]')!.open = false;
    detail.querySelectorAll<HTMLElement>('[data-lore-source]').forEach(view => { view.hidden = view.dataset['loreSource'] !== entity.sourceId; });
    const related = detail.querySelector('[data-related-entities]')!;
    related.replaceChildren(...entity.relatedIds.flatMap(id => {
      const target = entities.find(entity => entity.id === id);
      if (!target) return [];
      const row = document.createElement('li'); const button = document.createElement('button');
      button.type = 'button'; button.dataset['relatedEntity'] = id;
      const name = document.createElement('span'); name.textContent = target.name;
      const type = document.createElement('small'); type.textContent = labels[target.type];
      button.append(name, type); row.append(button); return [row];
    }));
    detail.querySelector<HTMLElement>('[data-entity-relations]')!.hidden = !related.children.length;
    detail.querySelector('[data-lore-back]')!.textContent = previousIds.length ? '返回上一条目' : '返回列表';
    if (drawer) drawer.scrollTop = 0;
    title.focus({ preventScroll: true });
  }
  browser.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const entry = event.target.closest<HTMLButtonElement>('[data-open-entity]');
    const related = event.target.closest<HTMLButtonElement>('[data-related-entity]');
    const scopeButton = event.target.closest<HTMLButtonElement>('[data-lore-scope]');
    if (entry?.dataset['openEntity']) { previousIds = []; showEntity(entry.dataset['openEntity']); }
    if (related?.dataset['relatedEntity']) { if (selectedId) previousIds.push(selectedId); showEntity(related.dataset['relatedEntity']); }
    if (scopeButton) { scope = scopeButton.dataset['loreScope'] ?? 'context'; if (scope === 'context') input.value = ''; update(); }
  });
  detail.querySelector('[data-lore-back]')!.addEventListener('click', () => {
    const previous = previousIds.pop();
    if (previous) { showEntity(previous); return; }
    const oldId = selectedId; selectedId = null;
    detail.hidden = true; browse.hidden = false;
    if (drawer) drawer.scrollTop = listScroll;
    browser!.querySelector<HTMLButtonElement>(`[data-open-entity="${oldId}"]`)?.focus({ preventScroll: true });
  });
  input.addEventListener('input', update);
  category.addEventListener('change', update);
  update();
}
