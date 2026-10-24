import { readerEvents } from './events.ts';
import type { ReaderLocation } from './events.ts';

let currentLocation: ReaderLocation | null = null;

/** 当前页面的临时正文位置，与持久化进度分开；资料浏览不写入这里。 */
export function readCurrentLocation(chapterId: string): ReaderLocation | null {
  return currentLocation?.chapterId === chapterId ? { ...currentLocation } : null;
}

export function publishCurrentLocation(location: ReaderLocation): void {
  currentLocation = { ...location };
  readerEvents.emit('maestro:location-change', { ...currentLocation });
}
