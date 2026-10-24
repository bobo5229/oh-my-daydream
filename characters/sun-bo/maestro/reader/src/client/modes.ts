import { readReadingMode, writeReadingMode } from './mode-model.ts';
import type { ReadingMode } from './mode-model.ts';
import { renderSequence, returnToNovel } from './sequence-navigation.ts';

let mode = readReadingMode();
function renderMode(): void {
  document.documentElement.dataset['readingMode'] = mode;
  document.querySelectorAll<HTMLSelectElement>('[data-mode-select]').forEach(select => { select.value = mode; });
  document.querySelectorAll<HTMLInputElement>('[data-mode-choice]').forEach(input => { input.checked = input.value === mode; });
}
renderMode();
renderSequence(mode, true);
function setMode(value: string): void {
  if ((value !== 'novel' && value !== 'chronicle') || value === mode) return;
  document.dispatchEvent(new Event('maestro:layout-before-change'));
  mode = value as ReadingMode;
  writeReadingMode(mode);
  renderMode();
  if (mode === 'novel') returnToNovel();
  renderSequence(mode);
  document.dispatchEvent(new CustomEvent('maestro:mode-change', { detail: { mode } }));
  document.dispatchEvent(new Event('maestro:layout-change'));
}
document.querySelectorAll<HTMLSelectElement>('[data-mode-select]').forEach(select => select.addEventListener('change', () => setMode(select.value)));
document.querySelectorAll<HTMLInputElement>('[data-mode-choice]').forEach(input => input.addEventListener('change', () => { if (input.checked) setMode(input.value); }));
