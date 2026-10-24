import { createHash } from 'node:crypto';
import type { Nodes, Root } from 'mdast';
import type { Element } from 'hast';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import type { Diagnostic, ParsedDocument, SourceFile, SourceSpan } from './types.ts';

declare module 'mdast' {
  interface Data { readerAnchor?: string }
}

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml']);
const renderer = unified().use(remarkRehype).use(rehypeSanitize).use(rehypeStringify);

export function textOf(node: Nodes): string {
  if ('value' in node) return node.value;
  if ('alt' in node) return node.alt ?? '';
  if ('children' in node) return node.children.map(textOf).join('');
  return '';
}

export function decodeSource(path: string, bytes: Uint8Array): SourceFile {
  // ignoreBOM=true 保留 BOM；仅供解析的 markdown 视图去掉它，原始字节可重建。
  const raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const hasBom = raw.startsWith('\uFEFF');
  return {
    path,
    raw,
    markdown: hasBom ? raw.slice(1) : raw,
    hasBom,
    byteLength: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

export function spanOf(node: Nodes, source: SourceFile): SourceSpan {
  const position = node.position;
  if (position?.start.offset === undefined || position.end.offset === undefined) {
    throw new Error(`Missing source position in ${source.path}`);
  }
  const shift = source.hasBom ? 1 : 0;
  return {
    file: source.path,
    start: { ...position.start, offset: position.start.offset + shift },
    end: { ...position.end, offset: position.end.offset + shift },
  };
}

export function sourceRange(source: SourceFile, start: number, end: number): SourceSpan {
  const point = (offset: number) => {
    const lines = source.raw.slice(0, offset).split(/\r\n|\r|\n/);
    const bomShift = source.hasBom && lines.length === 1 && offset > 0 ? 1 : 0;
    return { offset, line: lines.length, column: lines[lines.length - 1]!.length + 1 - bomShift };
  };
  return { file: source.path, start: point(start), end: point(end) };
}

export interface RenderExtensions { image?: (node: Element) => Element; afterBlock?: (id: string) => Element[] }
export function renderElements(elements: Element[]): string { return renderer.stringify({ type: 'root', children: elements }); }
export async function renderTree(tree: Root, extensions: RenderExtensions = {}): Promise<string> {
  const displayTree: Root = { ...tree, children: tree.children.filter(node => node.type !== 'yaml') };
  const rendered = await renderer.run(displayTree);
  const anchors = new Map(displayTree.children.flatMap(node => {
    const anchor = node.data?.['readerAnchor'];
    const offset = node.position?.start.offset;
    return typeof anchor === 'string' && offset !== undefined ? [[offset, anchor] as const] : [];
  }));
  // 先清理 HTML，再把受控的 r- 前缀锚点写入顶层元素，避开用户 HTML 与 DOM clobbering。
  for (const node of rendered.children) {
    if (node.type !== 'element') continue;
    const offset = node.position?.start.offset;
    const anchor = offset === undefined ? undefined : anchors.get(offset);
    if (anchor) node.properties.id = anchor;
  }
  {
    const transform = (parent: { children: typeof rendered.children }) => {
      parent.children = parent.children.map(node => {
        if (node.type !== 'element') return node;
        transform(node);
        if (node.tagName === 'table') { node.properties.tabIndex = 0; node.properties['aria-label'] = '资料表格，可横向滚动'; }
        return node.tagName === 'img' && extensions.image ? extensions.image(node) : node;
      });
    };
    transform(rendered);
  }
  if (extensions.afterBlock) rendered.children = rendered.children.flatMap(node => node.type === 'element' && typeof node.properties.id === 'string' ? [node, ...extensions.afterBlock!(node.properties.id)] : [node]);
  return renderer.stringify(rendered);
}

export async function parseDocument(id: string, source: SourceFile): Promise<ParsedDocument> {
  const tree = parser.parse(source.markdown);
  const heading = tree.children.find(node => node.type === 'heading' && node.depth === 1);
  const yaml = tree.children.find(node => node.type === 'yaml');
  const diagnostics: Diagnostic[] = [];
  const occurrences = new Map<string, number>();
  const hashes = new Map<string, string>();
  const blocks = tree.children.map(node => {
    const span = spanOf(node, source);
    const raw = source.raw.slice(span.start.offset, span.end.offset);
    const canonical = raw.replace(/\r\n|\r/g, '\n').trim();
    const fullHash = createHash('sha256').update(canonical).digest('hex');
    const hash = fullHash.slice(0, 16);
    const occurrence = (occurrences.get(hash) ?? 0) + 1;
    if (hashes.has(hash) && hashes.get(hash) !== fullHash) {
      diagnostics.push({ severity: 'error', code: 'ANCHOR_HASH_COLLISION', file: source.path, source: span,
        message: '内容锚点散列冲突，需要调整锚点长度。' });
    } else if (occurrence > 1) {
      diagnostics.push({ severity: 'warning', code: 'DUPLICATE_BLOCK_TEXT', file: source.path, source: span,
        message: '存在完全相同的内容块，锚点使用出现次序后缀；修改重复块后定位可能回退。' });
    }
    hashes.set(hash, fullHash);
    occurrences.set(hash, occurrence);
    const anchor = `r-${id}-b-${hash}${occurrence > 1 ? `-${occurrence}` : ''}`;
    node.data = { ...node.data, readerAnchor: anchor };
    return { id: anchor, type: node.type, node, source: span, raw };
  });
  return {
    id,
    source,
    tree,
    blocks,
    title: heading ? textOf(heading) : null,
    frontmatter: yaml?.type === 'yaml' ? yaml.value : null,
    html: await renderTree(tree),
    diagnostics,
  };
}
