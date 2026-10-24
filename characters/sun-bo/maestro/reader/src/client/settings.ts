import { readerEvents } from './events.ts';
import { DEFAULT_PREFERENCES, readPreferences, writePreferences } from './preferences-model.ts';
import type { ThemePreference } from './preferences-model.ts';

const settings = document.querySelector<HTMLDetailsElement>('[data-reading-settings]');
const themeSelect = settings?.querySelector<HTMLSelectElement>('[data-theme-preference]');
const fontSizeInput = settings?.querySelector<HTMLInputElement>('[data-font-size]');
const lineHeightInput = settings?.querySelector<HTMLInputElement>('[data-line-height]');
let preferences = readPreferences();

function applyTheme(): void {
  document.documentElement.dataset['theme'] = preferences.theme;
  if (themeSelect) themeSelect.value = preferences.theme;
}
applyTheme();
function applyTypography(): void {
  document.documentElement.style.setProperty('--reader-font-size', `${preferences.fontSize}px`);
  document.documentElement.style.setProperty('--reader-line-height', String(preferences.lineHeight));
  if (fontSizeInput) fontSizeInput.value = String(preferences.fontSize);
  if (lineHeightInput) lineHeightInput.value = String(preferences.lineHeight);
  const fontOutput = settings?.querySelector<HTMLOutputElement>('[data-font-size-value]');
  const lineOutput = settings?.querySelector<HTMLOutputElement>('[data-line-height-value]');
  if (fontOutput) fontOutput.value = `${preferences.fontSize}px`;
  if (lineOutput) lineOutput.value = preferences.lineHeight.toFixed(2);
}
applyTypography();
function changeTypography(fontSize: number, lineHeight: number): void {
  readerEvents.emit('maestro:layout-before-change');
  preferences = { ...preferences, fontSize, lineHeight };
  applyTypography();
  writePreferences(preferences);
  readerEvents.emit('maestro:layout-change');
}
fontSizeInput?.addEventListener('input', () => changeTypography(fontSizeInput.valueAsNumber, preferences.lineHeight));
lineHeightInput?.addEventListener('input', () => changeTypography(preferences.fontSize, lineHeightInput.valueAsNumber));
settings?.querySelector('[data-reset-typography]')?.addEventListener('click', () => changeTypography(DEFAULT_PREFERENCES.fontSize, DEFAULT_PREFERENCES.lineHeight));
themeSelect?.addEventListener('change', () => {
  if (!['system', 'light', 'dark'].includes(themeSelect.value)) return;
  preferences = { ...preferences, theme: themeSelect.value as ThemePreference };
  applyTheme();
  writePreferences(preferences);
});
// system 由原生 color-scheme 响应系统切换；手动 light/dark 覆盖具有更高优先级。
document.addEventListener('click', event => {
  if (event.target instanceof Node && settings?.open && !settings.contains(event.target)) settings.open = false;
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && settings?.open) {
    settings.open = false;
    settings.querySelector('summary')?.focus();
  }
});
