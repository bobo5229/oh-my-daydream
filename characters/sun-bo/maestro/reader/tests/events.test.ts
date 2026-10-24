import test from 'node:test';
import assert from 'node:assert/strict';
import { createReaderEvents } from '../src/client/events.ts';

test('交互契约：共享接收方保持同步事件顺序，载荷可读且订阅可以取消', () => {
  const target = new EventTarget();
  const reader = createReaderEvents(target);
  const drawer = createReaderEvents(target);
  const observed: string[] = [];
  drawer.on('maestro:layout-before-change', () => observed.push('before'));
  const stop = drawer.on('maestro:location-change', location => observed.push(`${location.chapterId}:${location.anchorId}`));
  drawer.on('maestro:layout-change', () => observed.push('after'));
  reader.emit('maestro:layout-before-change');
  reader.emit('maestro:location-change', { chapterId: 'ch03', anchorId: 'test-anchor' });
  reader.emit('maestro:layout-change');
  assert.deepEqual(observed, ['before', 'ch03:test-anchor', 'after']);
  stop();
  reader.emit('maestro:location-change', { chapterId: 'ch04' });
  createReaderEvents(new EventTarget()).emit('maestro:layout-change');
  assert.equal(observed.length, 3);

  if (false) {
    // @ts-expect-error 抽屉方向只能使用契约规定的值。
    reader.emit('maestro:drawer-open', 'bottom');
    // @ts-expect-error 正文位置事件必须携带章节。
    reader.emit('maestro:location-change', { anchorId: 'test-anchor' });
    // @ts-expect-error 布局事件没有业务载荷。
    reader.emit('maestro:layout-change', { mode: 'novel' });
    // @ts-expect-error 不接受未定义的事件名。
    reader.on('maestro:unknown', () => {});
  }
});
