import type { StorageLike } from './storage.ts';
export const READING_MODE_KEY = 'maestro.reading-mode.v1';
export type ReadingMode = 'novel' | 'chronicle';
function browserStorage(): StorageLike | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}
export function readReadingMode(storage: StorageLike | null = browserStorage()): ReadingMode {
  try {
    const value: unknown = JSON.parse(storage?.getItem(READING_MODE_KEY) ?? 'null');
    if (value && typeof value === 'object') {
      const item = value as { version?: unknown; mode?: unknown };
      if (item.version === 1 && (item.mode === 'novel' || item.mode === 'chronicle')) return item.mode;
    }
  } catch { /* 禁用存储时默认纯小说。 */ }
  return 'novel';
}
export function writeReadingMode(mode: ReadingMode, storage: StorageLike | null = browserStorage()): boolean {
  try { storage?.setItem(READING_MODE_KEY, JSON.stringify({ version: 1, mode })); return storage !== null; } catch { return false; }
}
