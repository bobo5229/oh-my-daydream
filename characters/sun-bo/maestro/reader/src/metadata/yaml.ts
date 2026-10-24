import { readFile } from 'node:fs/promises';
import { parseDocument } from 'yaml';
import type { Diagnostic } from '../content/types.ts';

export const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
export const string = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
export const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export async function readYaml(path: string, diagnostics: Diagnostic[]): Promise<unknown> {
  try {
    const document = parseDocument(await readFile(path, 'utf8'), { uniqueKeys: true });
    if (document.errors.length) throw new Error(document.errors.map(error => error.message).join('; '));
    return document.toJS({ maxAliasCount: 0 });
  } catch (error) {
    diagnostics.push({ severity: 'warning', code: 'METADATA_UNREADABLE', file: path, message: `增强数据不可用，保留原文阅读：${error instanceof Error ? error.message : String(error)}` });
    return null;
  }
}
