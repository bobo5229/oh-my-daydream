import { syncModalLock, outsideDialog } from './dialogs.ts';

const expanded = document.querySelector<HTMLDialogElement>('#expanded-reader');
const host = expanded?.querySelector<HTMLElement>('[data-expanded-host]');
if (expanded && host) {
  let origin: HTMLElement | null = null;
  let article: HTMLElement | null = null;
  let trigger: HTMLButtonElement | null = null;
  let drawerScroll = 0;
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-expand-resource]');
    const home = button?.closest('[data-resource-selection]')?.querySelector<HTMLElement>('[data-resource-home]');
    const selected = home?.querySelector<HTMLElement>('[data-resource-text]:not([hidden])');
    if (!button || !home || !selected) return;
    document.dispatchEvent(new Event('maestro:layout-before-change'));
    origin = home; article = selected; trigger = button;
    drawerScroll = home.closest('dialog')?.scrollTop ?? 0;
    host.append(article);
    expanded.showModal();
    host.scrollTop = 0;
    syncModalLock();
  });
  expanded.querySelector('[data-close-expanded]')?.addEventListener('click', () => expanded.close());
  expanded.addEventListener('click', event => { if (outsideDialog(expanded, event)) expanded.close(); });
  expanded.addEventListener('close', () => {
    if (origin && article) {
      origin.append(article);
      const drawer = origin.closest('dialog');
      if (drawer) drawer.scrollTop = drawerScroll;
    }
    syncModalLock();
    if (trigger?.closest('dialog')?.open) trigger.focus({ preventScroll: true });
    origin = null; article = null; trigger = null;
    document.dispatchEvent(new Event('maestro:overlay-close'));
  });
  document.addEventListener('maestro:drawer-open', () => { if (expanded.open) expanded.close(); });
}
