import { createHash } from 'node:crypto';
import { readFile, readdir, realpath, lstat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep, dirname } from 'node:path';

export type SourceSnapshot = Record<string, string>;
export interface SourceChange { path: string; kind: 'added' | 'removed' | 'changed' }

function isWithin(root: string, target: string): boolean {
  const name = relative(root, target);
  return !isAbsolute(name) && name !== '..' && !name.startsWith(`..${sep}`);
}

export async function captureSource(sourceRoot: string): Promise<SourceSnapshot> {
  const root = await realpath(sourceRoot);
  const snapshot: SourceSnapshot = Object.create(null) as SourceSnapshot;
  const visit = async (directory: string) => {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = resolve(directory, entry.name);
      const path = relative(root, absolute).split(sep).join('/');
      if (entry.isSymbolicLink()) throw new Error(`源内容不能通过链接越过校验边界：${path}`);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) snapshot[path] = createHash('sha256').update(await readFile(absolute)).digest('hex');
    }
  };
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isSymbolicLink() && !['reader', 'reader-stages'].includes(entry.name)) {
      throw new Error(`源内容不能通过链接越过校验边界：${entry.name}`);
    }
    if (entry.isFile()) snapshot[entry.name] = createHash('sha256').update(await readFile(resolve(root, entry.name))).digest('hex');
    else if (['chapters', 'assets'].includes(entry.name)) {
      if (entry.isSymbolicLink()) throw new Error(`源内容目录不能是链接：${entry.name}`);
      if (entry.isDirectory()) await visit(resolve(root, entry.name));
    }
  }
  return Object.fromEntries(Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b)));
}

export function sourceChanges(before: SourceSnapshot, after: SourceSnapshot): SourceChange[] {
  const changes: SourceChange[] = [];
  for (const path of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!Object.hasOwn(before, path)) changes.push({ path, kind: 'added' });
    else if (!Object.hasOwn(after, path)) changes.push({ path, kind: 'removed' });
    else if (before[path] !== after[path]) changes.push({ path, kind: 'changed' });
  }
  return changes;
}

export async function withSourceGuard<T>(sourceRoot: string, operation: () => Promise<T>): Promise<T> {
  const before = await captureSource(sourceRoot);
  try {
    return await operation();
  } finally {
    const changes = sourceChanges(before, await captureSource(sourceRoot));
    if (changes.length) throw new Error(`原稿在操作期间发生变化，请检查写回或并行编辑：${JSON.stringify(changes)}`);
  }
}

export async function assertSafeOutput(projectRoot: string, target: string): Promise<void> {
  const root = await realpath(projectRoot);
  const absolute = resolve(root, target);
  if (!isWithin(root, absolute) || relative(root, absolute) === '') throw new Error(`输出路径必须位于工程目录内部：${target}`);
  let existing = absolute;
  while (true) {
    try {
      await lstat(existing);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      existing = dirname(existing);
    }
  }
  if (!isWithin(root, await realpath(existing))) throw new Error(`输出路径通过链接越出工程目录：${target}`);
}
