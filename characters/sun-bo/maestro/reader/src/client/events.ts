import type { ReadingMode } from './mode-model.ts';

export interface ReaderLocation { chapterId: string; anchorId?: string }

/** 跨组件通信契约；事件名、载荷和同步派发顺序由这里统一约束。 */
export interface ReaderEventMap {
  'maestro:layout-before-change': undefined;
  'maestro:layout-change': undefined;
  'maestro:location-change': ReaderLocation;
  'maestro:mode-change': { mode: ReadingMode };
  'maestro:drawer-open': 'left' | 'right';
  'maestro:overlay-close': undefined;
  'maestro:story-stage-change': { stageId: string | null };
}

type EventArgs<K extends keyof ReaderEventMap> = ReaderEventMap[K] extends undefined ? [] : [detail: ReaderEventMap[K]];

export function createReaderEvents(target?: EventTarget) {
  function emit<K extends keyof ReaderEventMap>(name: K, ...args: EventArgs<K>): void {
    (target ?? document).dispatchEvent(new CustomEvent(name, { detail: args[0] }));
  }
  function on<K extends keyof ReaderEventMap>(name: K, handler: (detail: ReaderEventMap[K]) => void): () => void {
    const receiver = target ?? document;
    const listener = (event: Event) => handler((event as CustomEvent<ReaderEventMap[K]>).detail);
    receiver.addEventListener(name, listener);
    return () => receiver.removeEventListener(name, listener);
  }
  return { emit, on };
}

export const readerEvents = createReaderEvents();
