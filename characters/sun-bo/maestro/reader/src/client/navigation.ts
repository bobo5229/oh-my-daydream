import { syncModalLock, outsideDialog } from './dialogs.ts';
const dialog = document.querySelector<HTMLDialogElement>('#chapter-navigation');
const opener = document.querySelector<HTMLButtonElement>('[data-open-contents]');
if (dialog && opener) {
  let returnFocus = true;
  opener.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('maestro:drawer-open', { detail: 'left' }));
    dialog.showModal();
    syncModalLock();
    dialog.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
  });
  dialog.querySelector('[data-close-contents]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (outsideDialog(dialog, event)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    syncModalLock();
    if (returnFocus) opener.focus({ preventScroll: true });
    returnFocus = true;
  });
  document.addEventListener('maestro:drawer-open', event => {
    if ((event as CustomEvent).detail === 'right' && dialog.open) { returnFocus = false; dialog.close(); }
  });
}
export {};

