import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PREFERENCES, PREFERENCES_KEY, readPreferences, writePreferences } from '../src/client/preferences-model.ts';
import type { StorageLike } from '../src/client/storage.ts';

test('阅读偏好验证版本与三态，损坏或存储不可用时回到默认', () => {
  for (const raw of [null, '{', 'null', '[]', '{"version":2,"theme":"dark"}', '{"version":1,"theme":"red"}']) {
    assert.deepEqual(readPreferences({ getItem: () => raw, setItem: () => {} }), DEFAULT_PREFERENCES);
  }
  const denied: StorageLike = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } };
  assert.deepEqual(readPreferences(denied), DEFAULT_PREFERENCES);
  assert.equal(writePreferences(DEFAULT_PREFERENCES, denied), false);
  assert.equal(writePreferences(DEFAULT_PREFERENCES, null), false);
});

test('三态偏好使用独立存储键并能恢复', () => {
  const values = new Map<string, string>();
  const storage: StorageLike = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  for (const theme of ['system', 'light', 'dark'] as const) {
    const preferences = { ...DEFAULT_PREFERENCES, theme };
    assert.equal(writePreferences(preferences, storage), true);
    assert.deepEqual(readPreferences(storage), preferences);
    assert.deepEqual([...values.keys()], [PREFERENCES_KEY]);
  }
});

test('排版偏好逐字段验证，越界数据不进入样式，主题仍可恢复', () => {
  const read = (value: object) => readPreferences({ getItem: () => JSON.stringify(value), setItem: () => {} });
  assert.deepEqual(read({ version: 1, theme: 'dark', fontSize: 1000, lineHeight: '2' }), { ...DEFAULT_PREFERENCES, theme: 'dark' });
  assert.deepEqual(read({ version: 1, theme: 'system', fontSize: 26, lineHeight: 2.3 }), { ...DEFAULT_PREFERENCES, fontSize: 26, lineHeight: 2.3 });
  assert.deepEqual(read({ version: 1, theme: 'system', fontSize: 16, lineHeight: 1.5 }), { ...DEFAULT_PREFERENCES, fontSize: 16, lineHeight: 1.5 });
});
