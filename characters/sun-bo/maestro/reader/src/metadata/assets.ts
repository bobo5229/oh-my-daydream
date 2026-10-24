import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, extname, posix, resolve } from 'node:path';
import { array, object, readYaml, string } from './yaml.ts';
import type { Nodes } from 'mdast';
import type { Diagnostic, ReaderContent } from '../content/types.ts';
import type { LoreIndex } from './lore.ts';

export const ASSET_TYPES = { character: '人物立绘', scene: '场景插图', logo: '企业 Logo', diagram: '技术图表' } as const;
export type AssetType = keyof typeof ASSET_TYPES;
export interface VisualAsset { id: string; type: AssetType; file: string; alt: string; caption: string; entityIds: string[]; chapterIds: string[]; interludeIds: string[]; available: boolean; src: string | null; mime: string; bytes: Uint8Array | null; sha256: string | null; width?: number; height?: number }
export interface AssetIndex { assets: VisualAsset[]; diagnostics: Diagnostic[] }
const mimeTypes: Record<string, string> = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };

export function assetFile(input: string, from = ''): string | null {
  try {
    const decoded = decodeURIComponent(input).replace(/\\/g, '/');
    if (/^(?:[a-z]+:|\/)/i.test(decoded) || /[?#\0]/.test(decoded)) return null;
    const file = posix.normalize(posix.join(from ? dirname(from).replace(/\\/g, '/') : '', decoded));
    return /^(assets|chapters)\/.+/.test(file) && Boolean(mimeTypes[extname(file).toLowerCase()]) ? file : null;
  } catch { return null; }
}

export function safeSvg(bytes: Uint8Array): boolean {
  try {
    const svg = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return /<svg[\s>]/i.test(svg) && !/<(?:[\w.-]+:)?(?:script|foreignObject|iframe|object|embed|image|use|a|animate\w*|set)\b|\bon\w+\s*=|\b(?:href|src)\s*=|<!DOCTYPE|<!ENTITY|&#|javascript:|@import|url\s*\(|<\?(?!xml\s)/i.test(svg);
  } catch { return false; }
}

function images(node: Nodes, definitions: Map<string, string> = new Map()): { url: string; alt: string }[] {
  if (node.type === 'root') for (const child of node.children) if (child.type === 'definition') definitions.set(child.identifier, child.url);
  if (node.type === 'image') return [{ url: node.url, alt: node.alt ?? '' }];
  if (node.type === 'imageReference') { const url = definitions.get(node.identifier); return url ? [{ url, alt: node.alt ?? '' }] : []; }
  return 'children' in node ? node.children.flatMap(child => images(child, definitions)) : [];
}

export async function loadAssets(content: ReaderContent, lore: LoreIndex, sourceRoot = resolve(process.cwd(), '..'), dataRoot = resolve(process.cwd(), 'data')): Promise<AssetIndex> {
  const result: AssetIndex = { assets: [], diagnostics: [] };
  const warn = (code: string, message: string) => result.diagnostics.push({ severity: 'warning', file: 'data/assets.yaml', code, message });
  const value = await readYaml(resolve(dataRoot, 'assets.yaml'), result.diagnostics);
  const definitions = object(value) && value['version'] === 1 ? array(value['assets']) : [];
  if (!object(value) || value['version'] !== 1) warn('ASSET_VERSION', '资产增强缺失或版本不支持，仍保留文字与 Markdown 图片解析。');
  for (const definition of definitions) {
    if (!object(definition) || !string(definition['id']) || !/^[a-z0-9-]+$/.test(definition['id']) || result.assets.some(item => item.id === definition['id']) || !string(definition['type']) || !Object.hasOwn(ASSET_TYPES, definition['type']) || !string(definition['file']) || !string(definition['alt'])) { warn('ASSET_INVALID', '资产缺少有效 ID、类型、源路径或替代文本，或 ID 重复。'); continue; }
    const file = assetFile(definition['file']);
    if (!file) { warn('ASSET_PATH_INVALID', `${definition['id']} 路径无效或越界，已忽略。`); continue; }
    if (result.assets.some(item => item.file === file)) { warn('ASSET_DUPLICATE_FILE', `${file} 已有索引，保留单一源资源。`); continue; }
    const links = (field: string, valid: string[]) => array(definition[field]).filter((id): id is string => {
      if (string(id) && valid.includes(id)) return true;
      warn('ASSET_LINK_UNMATCHED', `${definition['id']} 的 ${field} 包含失配条目。`); return false;
    });
    result.assets.push({ id: definition['id'], type: definition['type'] as AssetType, file, alt: definition['alt'], caption: string(definition['caption']) ? definition['caption'] : '',
      entityIds: links('entityIds', lore.entities.map(entity => entity.id)), chapterIds: links('chapterIds', content.chapters.map(chapter => chapter.id)), interludeIds: links('interludeIds', content.interludes.map(item => item.id)), available: false, src: null, mime: '', bytes: null, sha256: null });
  }
  const references = [
    ...content.chapters.flatMap(chapter => images(chapter.tree).map(image => ({ ...image, file: chapter.source.path, chapterId: chapter.id, interludeId: '' }))),
    ...content.interludes.flatMap(interlude => images(interlude.tree).map(image => ({ ...image, file: interlude.source.file, chapterId: '', interludeId: interlude.id }))),
    ...lore.sources.flatMap(source => images({ type: 'root', children: source.blocks.map(block => block.node) }).map(image => ({ ...image, file: source.file, chapterId: '', interludeId: '' }))),
  ];
  for (const reference of references) {
    const file = assetFile(reference.url, reference.file);
    if (!file) { warn('MARKDOWN_IMAGE_UNAVAILABLE', `${reference.file} 的图片路径不支持或不在本地作品资产范围：${reference.url}`); continue; }
    let asset = result.assets.find(asset => asset.file === file);
    if (!asset) {
      asset = { id: `image-${createHash('sha256').update(file).digest('hex').slice(0, 16)}`, type: extname(file) === '.svg' ? 'diagram' : 'scene', file, alt: reference.alt || '原稿图片', caption: '', entityIds: [], chapterIds: [], interludeIds: [], available: false, src: null, mime: '', bytes: null, sha256: null };
      result.assets.push(asset);
    }
    if (reference.chapterId && !asset.chapterIds.includes(reference.chapterId)) asset.chapterIds.push(reference.chapterId);
    if (reference.interludeId && !asset.interludeIds.includes(reference.interludeId)) asset.interludeIds.push(reference.interludeId);
  }
  for (const asset of result.assets) {
    try {
      const path = resolve(sourceRoot, asset.file);
      if ((await realpath(path)).toLowerCase() !== path.toLowerCase()) throw new Error('不跟随资产文件或目录链接');
      const bytes = await readFile(path);
      const extension = extname(asset.file).toLowerCase();
      if (extension === '.svg' && !safeSvg(bytes)) throw new Error('SVG 包含不支持的脚本、外部引用或动态内容');
      asset.bytes = new Uint8Array(bytes); asset.mime = mimeTypes[extension]!; asset.src = `/media/${asset.id}${extension}`;
      asset.available = true; asset.sha256 = createHash('sha256').update(bytes).digest('hex');
      if (extension === '.svg') {
        const viewBox = bytes.toString('utf8').match(/viewBox\s*=\s*["']\s*[\d.-]+[ ,]+[\d.-]+[ ,]+([\d.]+)[ ,]+([\d.]+)\s*["']/i);
        if (viewBox && Number(viewBox[1]) > 0 && Number(viewBox[2]) > 0) { asset.width = Number(viewBox[1]); asset.height = Number(viewBox[2]); }
      } else if (extension === '.png' && bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) { asset.width = bytes.readUInt32BE(16); asset.height = bytes.readUInt32BE(20); }
    } catch (error) { warn('ASSET_UNAVAILABLE', `${asset.file} 不可用，保留文字与占位：${error instanceof Error ? error.message : String(error)}`); }
  }
  return result;
}
