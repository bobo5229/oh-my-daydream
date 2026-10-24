import { readFile, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { decodeSource, parseDocument } from './markdown.ts';
import type { Chapter, ChapterLibrary, Diagnostic } from './types.ts';

function isWithin(root: string, target: string): boolean {
  const path = relative(root, target);
  return !isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`);
}

function chapterLabel(ordinal: number): string {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  let number = String(ordinal);
  if (ordinal < 10) number = digits[ordinal]!;
  else if (ordinal < 100) {
    const tens = Math.floor(ordinal / 10);
    number = `${tens === 1 ? '' : digits[tens]}十${ordinal % 10 ? digits[ordinal % 10] : ''}`;
  }
  return `第${number}章`;
}

export async function loadChapterLibrary(options: { sourceRoot?: string } = {}): Promise<ChapterLibrary> {
  // npm 脚本工作目录固定为 reader；测试与其他调用者可显式指定只读源根。
  const sourceRoot = resolve(options.sourceRoot ?? resolve(process.cwd(), '..'));
  const chapters: Chapter[] = [];
  const diagnostics: Diagnostic[] = [];
  const report = (code: string, file: string, message: string, severity: Diagnostic['severity'] = 'error') => {
    diagnostics.push({ code, file, message, severity });
  };
  try {
    const root = await realpath(sourceRoot);
    const directory = await realpath(resolve(root, 'chapters'));
    if (!isWithin(root, directory)) {
      report('SOURCE_OUTSIDE_ROOT', 'chapters', '章节目录指向源根之外，未读取。');
      return { chapters, diagnostics };
    }
    const entries = await readdir(directory, { withFileTypes: true });
    const ordinals = new Set<number>();
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))) {
      if (!entry.name.toLowerCase().endsWith('.md')) continue;
      const file = `chapters/${entry.name}`;
      const match = /^ch(\d+)\.md$/.exec(entry.name);
      if (!match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) < 1) {
        report('UNKNOWN_CHAPTER_NAME', file, '章节文件名应为 ch01.md 等正整数编号；未自动纳入目录。', 'warning');
        continue;
      }
      if (!entry.isFile()) {
        report('UNSUPPORTED_SOURCE', file, '章节必须为源根内的常规文件，不能是链接或目录。');
        continue;
      }
      const ordinal = Number(match[1]);
      if (ordinals.has(ordinal)) {
        report('DUPLICATE_CHAPTER_NUMBER', file, `章节编号 ${ordinal} 重复，未生成含糊的导航。`);
        continue;
      }
      try {
        const absolutePath = await realpath(resolve(directory, entry.name));
        if (!isWithin(root, absolutePath)) {
          report('SOURCE_OUTSIDE_ROOT', file, '章节指向源根之外，未读取。');
          continue;
        }
        const source = decodeSource(file, await readFile(absolutePath));
        const document = await parseDocument(entry.name.slice(0, -3), source);
        if (!document.title) {
          document.diagnostics.push({
            severity: 'warning', code: 'FALLBACK_CHAPTER_TITLE', file,
            message: '没有章标题，使用章节编号作为目录标签。',
          });
        }
        if (document.frontmatter !== null) {
          document.diagnostics.push({
            severity: 'warning', code: 'CHAPTER_FRONTMATTER', file,
            message: '章节出现 frontmatter，已单独解析；请核对正文格式规则。',
          });
        }
        chapters.push({ ...document, ordinal, title: document.title || chapterLabel(ordinal) });
        ordinals.add(ordinal);
        diagnostics.push(...document.diagnostics);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code === 'ERR_ENCODING_INVALID_ENCODED_DATA' ? 'INVALID_UTF8' : 'CONTENT_LOAD_FAILED';
        report(code, file, error instanceof Error ? error.message : String(error));
      }
    }
    chapters.sort((a, b) => a.ordinal - b.ordinal);
    if (!chapters.length) report('NO_CHAPTERS', 'chapters', '没有可读取的章节。');
  } catch (error) {
    report('CONTENT_DIRECTORY_UNAVAILABLE', 'chapters', error instanceof Error ? error.message : String(error));
  }
  return { chapters, diagnostics };
}
