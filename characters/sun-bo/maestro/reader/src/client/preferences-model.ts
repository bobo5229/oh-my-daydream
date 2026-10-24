import type { StorageLike } from './storage.ts';

export const PREFERENCES_KEY = 'maestro.reading-preferences.v1';
export type ThemePreference = 'system' | 'light' | 'dark';
export interface ReadingPreferences { version: 1; theme: ThemePreference; fontSize: number; lineHeight: number }
export const DEFAULT_PREFERENCES: ReadingPreferences = { version: 1, theme: 'system', fontSize: 18, lineHeight: 1.85 };
export const FONT_SIZE_LIMITS = { min: 16, max: 26, step: 1 };
export const LINE_HEIGHT_LIMITS = { min: 1.5, max: 2.3, step: 0.05 };

function browserStorage(): StorageLike | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; }
  catch { return null; }
}

export function readPreferences(storage: StorageLike | null = browserStorage()): ReadingPreferences {
  try {
    const value: unknown = JSON.parse(storage?.getItem(PREFERENCES_KEY) ?? 'null');
    if (value && typeof value === 'object') {
      const record = value as Partial<ReadingPreferences>;
      if (record.version === 1) {
        return {
          ...DEFAULT_PREFERENCES,
          ...(['system', 'light', 'dark'].includes(record.theme ?? '') ? { theme: record.theme! } : {}),
          ...(Number.isFinite(record.fontSize) && record.fontSize! >= FONT_SIZE_LIMITS.min && record.fontSize! <= FONT_SIZE_LIMITS.max ? { fontSize: record.fontSize! } : {}),
          ...(Number.isFinite(record.lineHeight) && record.lineHeight! >= LINE_HEIGHT_LIMITS.min && record.lineHeight! <= LINE_HEIGHT_LIMITS.max ? { lineHeight: record.lineHeight! } : {}),
        };
      }
    }
  } catch { /* 存储不可用时仍可阅读。 */ }
  return { ...DEFAULT_PREFERENCES };
}

export function writePreferences(preferences: ReadingPreferences, storage: StorageLike | null = browserStorage()): boolean {
  try { storage?.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); return storage !== null; }
  catch { return false; }
}
