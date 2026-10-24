import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLore } from '../src/metadata/lore.ts';
import { associateEntities, findEntityNames, loadEntityAssociations, readableText } from '../src/metadata/entity-matches.ts';
import { decodeSource, parseDocument } from '../src/content/markdown.ts';
import { loadReaderContent } from '../src/content/index.ts';

test('S05-T01：实体均有真实资料来源，企业、基础模型、Harness 和产品相互区分', async () => {
  const lore = await loadLore();
  assert.deepEqual(lore.diagnostics, []);
  assert.equal(lore.entities.find(item => item.id === 'epochai')?.type, 'company');
  assert.equal(lore.entities.find(item => item.id === 'grm-41-byte')?.type, 'model');
  assert.equal(lore.entities.find(item => item.id === 'encoder')?.type, 'harness');
  assert.equal(lore.entities.find(item => item.id === 'epochchat')?.type, 'product');
  assert.equal(lore.entities.find(item => item.id === 'sun-bo')?.type, 'person');
  assert.ok(lore.entities.find(item => item.id === 'kybernetes')?.summary?.startsWith('2021.08｜Kybernetes'));
  for (const entity of lore.entities) {
    const source = lore.sources.find(source => source.id === entity.sourceId)!;
    assert.ok(source.text.includes(entity.name));
    assert.ok(entity.sourceUrl.includes(source.anchorId));
    if (entity.summary) assert.ok(source.text.includes(entity.summary));
  }
});

test('S05-T02：名称／别称与最长匹配保守识别，代码块、短别称和英文词内不误匹配', async () => {
  const lore = await loadLore();
  const document = await parseDocument('fixture', decodeSource('fixture.md', new TextEncoder().encode('我用 Norbert 网页端、Kybernetes 和探微。\n\n`Encoder`\n\n```text\nAtlas IV\n```\n\nxKybernetes GRM-4.1-Byte ko')));
  const text = readableText(document.tree);
  const ids = findEntityNames(text, lore.entities).flatMap(match => match.entityIds);
  assert.ok(ids.includes('norbert-web'));
  assert.ok(ids.includes('kybernetes'));
  assert.ok(ids.includes('fathom'));
  assert.ok(ids.includes('grm-41-byte'));
  for (const id of ['norbert', 'encoder', 'atlas-iv', 'grm-4', 'grm-41', 'ko-operator']) assert.ok(!ids.includes(id), id);
});

test('S05-T02：章节补充、排除和同名消解均可校正，真实关联含主角且不回写正文', async () => {
  const lore = await loadLore();
  const content = await loadReaderContent();
  const actual = await loadEntityAssociations(content, lore);
  assert.deepEqual(actual.diagnostics, []);
  assert.ok(actual.chapters.every(chapter => chapter.entityIds.includes('sun-bo')));
  const kybernetes = lore.entities.find(entity => entity.id === 'kybernetes')!;
  const ambiguousLore = { ...lore, entities: [kybernetes, { ...kybernetes, id: 'other', type: 'product' as const }] };
  const unresolved = associateEntities(content, ambiguousLore, { version: 1, chapters: [] });
  assert.ok(unresolved.chapters.some(chapter => chapter.ambiguous.length));
  const resolved = associateEntities(content, ambiguousLore, { version: 1, chapters: [{ chapterId: 'ch03', resolve: { Kybernetes: 'other' }, exclude: ['kybernetes'] }] });
  const chapter = resolved.chapters.find(chapter => chapter.chapterId === 'ch03')!;
  assert.deepEqual(chapter.entityIds, ['other']);
  assert.ok(chapter.hits.every(hit => hit.via === 'resolve'));
});
