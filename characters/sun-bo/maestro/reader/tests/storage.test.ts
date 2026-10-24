import assert from 'node:assert/strict';
import test from 'node:test';
import { readNovelProgress, writeNovelProgress } from '../src/client/storage.ts';
import type { StorageLike } from '../src/client/storage.ts';

function storageOf(value: string | null): StorageLike {
  return { getItem: () => value, setItem: (_key, next) => { value = next; } };
}

test('损坏、未知版本和未知章节记录安全回退，旧章节记录仍可读', () => {
  for (const value of ['{bad', 'null', '{"version":2}', '{"version":1,"chapterId":"https://bad","updatedAt":1}']) {
    assert.equal(readNovelProgress(undefined, storageOf(value)), null);
  }
  const stored = storageOf(JSON.stringify({ version: 1, chapterId: 'ch03', updatedAt: 1 }));
  assert.equal(readNovelProgress(['ch01'], stored), null);
  assert.equal(readNovelProgress(['ch03'], stored)?.chapterId, 'ch03');
});

test('段落位置仅接受本章锚点及有限范围数字，不接受任意 DOM 或超界值', () => {
  const stored = storageOf(JSON.stringify({ version: 1, chapterId: 'ch03', updatedAt: 1,
    anchorId: 'r-ch02-b-0123456789abcdef', blockIndex: -1, blockFraction: 2, scrollFraction: -1 }));
  assert.deepEqual(readNovelProgress(undefined, stored), { version: 1, chapterId: 'ch03', updatedAt: 1 });
  const valid = { version: 1 as const, chapterId: 'ch03', updatedAt: 2, anchorId: 'r-ch03-b-0123456789abcdef', blockIndex: 4, blockFraction: 0.5, scrollFraction: 0.2 };
  assert.equal(writeNovelProgress(valid, stored), true);
  assert.deepEqual(readNovelProgress(undefined, stored), valid);
});

test('本地存储被禁用或写满时不抛异常', () => {
  const denied: StorageLike = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } };
  assert.equal(readNovelProgress(undefined, denied), null);
  assert.equal(writeNovelProgress({ version: 1, chapterId: 'ch01', updatedAt: 1 }, denied), false);
});
