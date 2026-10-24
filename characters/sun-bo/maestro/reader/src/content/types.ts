import type { Root, RootContent } from 'mdast';

/** 源 offset 是含 BOM 的原始 UTF-8 文本中的 UTF-16 下标，end 不包含尾字符。 */
export interface SourcePoint {
  offset: number;
  line: number;
  column: number;
}

export interface SourceSpan {
  file: string;
  start: SourcePoint;
  end: SourcePoint;
}

export interface Diagnostic {
  severity: 'warning' | 'error';
  code: string;
  file: string;
  message: string;
  source?: SourceSpan;
}

export interface SourceFile {
  path: string;
  raw: string;
  markdown: string;
  hasBom: boolean;
  byteLength: number;
  sha256: string;
}

export interface ContentBlock {
  id: string;
  type: RootContent['type'];
  node: RootContent;
  source: SourceSpan;
  raw: string;
}

export interface ParsedDocument {
  id: string;
  source: SourceFile;
  tree: Root;
  blocks: ContentBlock[];
  title: string | null;
  frontmatter: string | null;
  html: string;
  diagnostics: Diagnostic[];
}

export interface Chapter extends ParsedDocument {
  ordinal: number;
  title: string;
}

export interface ChapterLibrary {
  chapters: Chapter[];
  diagnostics: Diagnostic[];
}

export interface ContentView {
  tree: Root;
  blocks: ContentBlock[];
  html: string;
}

export interface Interlude extends ContentView {
  id: string;
  number: string;
  title: string;
  chapterId: string;
  source: SourceSpan;
  raw: string;
}

export interface SourceSegment extends ContentView {
  id: string;
  kind: 'novel' | 'interlude';
  source: SourceSpan;
  raw: string;
  interludeId?: string;
}

export interface DerivedChapter extends Chapter {
  novel: ContentView;
  interludes: Interlude[];
  segments: SourceSegment[];
}

export interface DerivedLibrary {
  chapters: DerivedChapter[];
  interludes: Interlude[];
  diagnostics: Diagnostic[];
}

export interface ReaderContent extends DerivedLibrary {
  status: 'ready' | 'degraded' | 'invalid';
}
