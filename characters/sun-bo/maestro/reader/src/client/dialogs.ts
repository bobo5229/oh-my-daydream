export function syncModalLock(): void {
  document.documentElement.classList.toggle('has-modal', Boolean(document.querySelector('dialog:modal')));
}
export function outsideDialog(dialog: HTMLDialogElement, event: MouseEvent): boolean {
  const bounds = dialog.getBoundingClientRect();
  return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
}

// 明确保持顶层模态框的 Tab 循环，避免末项之后把焦点交给浏览器工具栏。
document.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const modal = [...document.querySelectorAll<HTMLDialogElement>('dialog:modal')].at(-1);
  if (!modal) return;
  const focusable = [...modal.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, summary, [tabindex]')].filter(node => {
    if (node.tabIndex < 0 || !node.getClientRects().length || node.matches(':disabled') || node.closest('[inert]')) return false;
    if (node instanceof HTMLInputElement && node.type === 'radio' && !node.checked && node.name
      && [...modal.querySelectorAll<HTMLInputElement>('input[type="radio"]')].some(input => input.name === node.name && input.checked)) return false;
    return true;
  });
  const first = focusable[0]; const last = focusable.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
});
