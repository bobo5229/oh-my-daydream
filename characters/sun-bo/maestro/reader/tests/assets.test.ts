import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadReaderContent } from '../src/content/index.ts';
import { loadLore } from '../src/metadata/lore.ts';
import { assetFile, loadAssets, safeSvg } from '../src/metadata/assets.ts';
import { decodeSource, parseDocument, textOf } from '../src/content/markdown.ts';
import { renderMedia } from '../src/content/media.ts';
import { parseIllustrations } from '../src/metadata/illustrations.ts';
import type { AssetIndex, VisualAsset } from '../src/metadata/assets.ts';
import { withAssetRelations } from '../src/metadata/asset-relations.ts';
import { parseEnhancements } from '../src/metadata/enhancements.ts';
import { renderInterlude } from '../src/content/enhancements.ts';

test('S06-T01：真实空资产清单有效，路径校验拒绝越界和远端，SVG 不执行脚本或外部引用', async () => {
  const index = await loadAssets(await loadReaderContent(), await loadLore());
  assert.deepEqual(index.assets, []); assert.deepEqual(index.diagnostics, []);
  assert.equal(assetFile('../assets/a.svg', 'chapters/ch01.md'), 'assets/a.svg');
  for (const path of ['../../outside.svg', 'https://example.com/a.svg', 'C:/a.svg', 'assets/%2e%2e/%2e%2e/a.svg']) assert.equal(assetFile(path), null);
  assert.equal(safeSvg(new TextEncoder().encode('<svg viewBox="0 0 10 10"><path d="M0 0h10"/></svg>')), true);
  for (const body of ['<script>alert(1)</script>', '<g onload="x()"/>', '<use href="https://example.com/x"/>', '<foreignObject/>', '<set attributeName="href" to="&#106;"/>']) assert.equal(safeSvg(new TextEncoder().encode(`<svg>${body}</svg>`)), false);
});

test('S06-T03：可选时间线摘录和卡片有来源校验，错误图表／文字回退到完整原文', async () => {
  const content = await loadReaderContent();
  const interlude = content.interludes[0]!;
  const anchor = interlude.tree.children[0]!.data!.readerAnchor!;
  const quote = textOf(interlude.tree.children[1]!);
  const assets = { assets: [], diagnostics: [] };
  const parsed = parseEnhancements({ version: 1, modules: [
    { id: 'fixture-timeline', interludeId: interlude.id, after: anchor, kind: 'timeline', items: [{ quote }] },
    { id: 'fixture-cards', interludeId: interlude.id, after: anchor, kind: 'cards', items: [{ quote }] },
    { id: 'missing-chart', interludeId: interlude.id, after: anchor, kind: 'diagram', assetId: 'missing' },
    { id: 'invented', interludeId: interlude.id, after: anchor, kind: 'cards', items: [{ quote: '这不是原文中的事实' }] },
  ] }, content, assets);
  assert.equal(parsed.modules.length, 2); assert.equal(parsed.diagnostics.length, 2);
  const html = await renderInterlude(interlude, assets, parsed.modules);
  assert.ok(html.includes('module-timeline')); assert.ok(html.includes('module-cards'));
  assert.ok(html.includes(quote)); assert.ok(!html.includes('这不是原文中的事实'));
  const plain = await renderInterlude(interlude, assets, []);
  assert.equal(plain, interlude.html);
});

test('S06-T02：原有 Markdown 图片与锚点插图复用同一 URL，缺图或错锚点不改变正文顺序', async () => {
  const asset: VisualAsset = { id: 'fixture', type: 'scene', file: 'assets/fixture.svg', alt: '测试夹具，非作品素材', caption: 'Test fixture', entityIds: [], chapterIds: [], interludeIds: [], available: true, src: '/media/fixture.svg', mime: 'image/svg+xml', bytes: null, sha256: null };
  const index = { assets: [asset], diagnostics: [] };
  const source = await parseDocument('fixture', decodeSource('chapters/fixture.md', new TextEncoder().encode('前文\n\n![测试夹具](../assets/fixture.svg)\n\n后文\n\n![缺图](../assets/missing.png)')));
  const html = await renderMedia(source.tree, index, source.source.path, [{ chapterId: 'fixture', after: source.blocks[0]!.id, assetId: 'fixture' }]);
  assert.ok(html.indexOf('前文') < html.indexOf('/media/fixture.svg'));
  assert.ok(html.indexOf('/media/fixture.svg') < html.indexOf('后文'));
  assert.equal((html.match(/src="\/media\/fixture.svg"/g) ?? []).length, 2);
  assert.ok(html.includes('图像暂不可用 · 缺图'));
  assert.equal(textOf(source.tree), '前文测试夹具后文缺图');
  const content = await loadReaderContent();
  const invalid = parseIllustrations({ version: 1, placements: [{ chapterId: 'ch03', after: 'removed', assetId: 'fixture' }] }, content, index);
  assert.equal(invalid.placements.length, 0); assert.equal(invalid.diagnostics.length, 1);
});

test('S06-T01：同一源文件复用一个 URL，缺图有诊断但保留索引和文字', async () => {
  const root = await mkdtemp(join(tmpdir(), 'maestro-assets-'));
  await mkdir(join(root, 'assets')); await mkdir(join(root, 'data'));
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><text x="4" y="30">Test fixture</text></svg>';
  await writeFile(join(root, 'assets', 'fixture.svg'), svg);
  await writeFile(join(root, 'data', 'assets.yaml'), 'version: 1\nassets:\n  - { id: fixture, type: diagram, file: assets/fixture.svg, alt: Test fixture, chapterIds: [ch03], entityIds: [kybernetes], interludeIds: [interlude-02] }\n  - { id: missing, type: scene, file: assets/missing.png, alt: Missing fixture }');
  try {
    const index = await loadAssets(await loadReaderContent(), await loadLore(), root, join(root, 'data'));
    assert.equal(index.assets[0]?.available, true); assert.equal(index.assets[0]?.src, '/media/fixture.svg');
    assert.equal(index.assets[0]?.width, 100); assert.equal(index.assets[1]?.available, false);
    assert.ok(index.diagnostics.some(item => item.code === 'ASSET_UNAVAILABLE'));
  } finally {
    await unlink(join(root, 'assets', 'fixture.svg')); await unlink(join(root, 'data', 'assets.yaml'));
    await rmdir(join(root, 'assets')); await rmdir(join(root, 'data')); await rmdir(root);
  }
});

test('增强解析不修改冻结输入，资产关联由组装层合并且重复合并不增加条目', async () => {
  const content = await loadReaderContent();
  const chapter = content.chapters.find(chapter => chapter.id === 'ch03')!;
  const interlude = content.interludes.find(interlude => interlude.id === 'interlude-02')!;
  const asset: VisualAsset = { id: 'fixture', type: 'diagram', file: 'assets/fixture.svg', alt: '测试夹具，非作品素材', caption: '', entityIds: ['kybernetes'], chapterIds: ['ch01'], interludeIds: ['interlude-01'], available: true, src: '/media/fixture.svg', mime: 'image/svg+xml', bytes: null, sha256: null };
  const index: AssetIndex = { assets: [asset], diagnostics: [] };
  const freeze = (value: unknown, seen = new Set<object>()): void => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    for (const child of Object.values(value)) freeze(child, seen);
    Object.freeze(value);
  };
  freeze(content); freeze(index);
  const before = JSON.stringify(index);
  const placement = { chapterId: chapter.id, after: chapter.novel.blocks[0]!.id, assetId: asset.id };
  const illustrations = parseIllustrations({ version: 1, placements: [placement, placement, { ...placement, after: 'removed' }] }, content, index);
  const module = { id: 'fixture-diagram', interludeId: interlude.id, after: interlude.tree.children[0]!.data!.readerAnchor!, kind: 'diagram', assetId: asset.id };
  const enhancements = parseEnhancements({ version: 1, modules: [module, { ...module, id: 'fixture-second' }, { ...module, id: 'fixture-invalid', after: 'removed' }] }, content, index);
  assert.equal(illustrations.placements.length, 1); assert.equal(illustrations.diagnostics.length, 2);
  assert.equal(enhancements.modules.length, 2); assert.equal(enhancements.diagnostics.length, 1);
  assert.equal(JSON.stringify(index), before);
  const linked = withAssetRelations(index, illustrations.placements, enhancements.modules);
  assert.deepEqual(linked.assets[0]!.chapterIds, ['ch01', 'ch03']);
  assert.deepEqual(linked.assets[0]!.interludeIds, ['interlude-01', 'interlude-02']);
  assert.deepEqual(linked.assets[0]!.entityIds, ['kybernetes']);
  assert.deepEqual(withAssetRelations(linked, illustrations.placements, enhancements.modules), linked);
  assert.equal(JSON.stringify(index), before);
  assert.notEqual(linked.assets[0], asset);
});
