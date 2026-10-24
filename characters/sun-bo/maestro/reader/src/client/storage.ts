export const NOVEL_PROGRESS_KEY = 'maestro.novel-progress.v1';

export interface NovelProgress {
  version: 1;
  chapterId: string;
  updatedAt: number;
  anchorId?: string;
  blockIndex?: number;
  blockFraction?: number;
  scrollFraction?: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): StorageLike | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; }
  catch { return null; }
}

export function readNovelProgress(allowedIds?: readonly string[], storage: StorageLike | null = browserStorage()): NovelProgress | null {
  try {
    const raw = storage?.getItem(NOVEL_PROGRESS_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const record = value as Partial<NovelProgress>;
    if (record.version !== 1 || typeof record.chapterId !== 'string' || !/^ch\d+$/.test(record.chapterId)
      || !Number.isFinite(record.updatedAt) || record.updatedAt! < 0 || (allowedIds && !allowedIds.includes(record.chapterId))) return null;
    const result: NovelProgress = { version: 1, chapterId: record.chapterId, updatedAt: record.updatedAt! };
    if (typeof record.anchorId === 'string' && record.anchorId.startsWith(`r-${record.chapterId}-b-`)
      && /^r-ch\d+-b-[0-9a-f]{16}(?:-\d+)?$/.test(record.anchorId)) result.anchorId = record.anchorId;
    if (Number.isSafeInteger(record.blockIndex) && record.blockIndex! >= 0) result.blockIndex = record.blockIndex!;
    if (Number.isFinite(record.blockFraction) && record.blockFraction! >= 0 && record.blockFraction! <= 1) result.blockFraction = record.blockFraction!;
    if (Number.isFinite(record.scrollFraction) && record.scrollFraction! >= 0 && record.scrollFraction! <= 1) result.scrollFraction = record.scrollFraction!;
    return result;
  } catch { return null; }
}

export function writeNovelProgress(progress: NovelProgress, storage: StorageLike | null = browserStorage()): boolean {
  try { storage?.setItem(NOVEL_PROGRESS_KEY, JSON.stringify(progress)); return storage !== null; }
  catch { return false; }
}
