import { test } from 'node:test';
import assert from 'node:assert/strict';
import { READING_MODE_KEY, readReadingMode, writeReadingMode } from '../src/client/mode-model.ts';

test('模式存储独立于正文进度，版本错误、损坏或禁用时默认纯小说', () => {
  let raw: string | null = null;
  const storage = { getItem: () => raw, setItem: (key: string, value: string) => { assert.equal(key, READING_MODE_KEY); raw = value; } };
  assert.equal(readReadingMode(storage), 'novel');
  assert.equal(writeReadingMode('chronicle', storage), true);
  assert.equal(readReadingMode(storage), 'chronicle');
  for (const invalid of ['{', '{"version":2,"mode":"chronicle"}', '{"version":1,"mode":"other"}']) { raw = invalid; assert.equal(readReadingMode(storage), 'novel'); }
  const denied = { getItem: () => { throw new Error(); }, setItem: () => { throw new Error(); } };
  assert.equal(readReadingMode(denied), 'novel');
  assert.equal(writeReadingMode('chronicle', denied), false);
});
