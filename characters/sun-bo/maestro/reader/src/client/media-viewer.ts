import { readerEvents } from './events.ts';
import { registerOverlay, syncModalLock } from './dialogs.ts';

const viewer = document.querySelector<HTMLDialogElement>('#media-viewer');
const stage = viewer?.querySelector<HTMLElement>('[data-media-stage]');
const image = stage ? document.createElement('img') : null;
if (viewer && stage && image) {
  registerOverlay(viewer);
  image.dataset['mediaImage'] = ''; image.alt = ''; image.draggable = false; image.hidden = true; stage.append(image);
  const status = viewer.querySelector<HTMLElement>('[data-media-status]')!;
  let trigger: HTMLElement | null = null;
  let zoom = 1; let fit = 1; let x = 0; let y = 0;
  const pointers = new Map<number, { x: number; y: number }>();
  function draw(): void {
    const scale = fit * zoom;
    const limitX = Math.max(0, (image!.naturalWidth * scale - stage!.clientWidth) / 2 + 24);
    const limitY = Math.max(0, (image!.naturalHeight * scale - stage!.clientHeight) / 2 + 24);
    x = Math.max(-limitX, Math.min(limitX, x)); y = Math.max(-limitY, Math.min(limitY, y));
    image!.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`;
    viewer!.querySelector<HTMLOutputElement>('[data-zoom-label]')!.value = `${Math.round(zoom * 100)}%`;
    stage!.dataset['zoom'] = String(zoom); stage!.dataset['panX'] = String(x); stage!.dataset['panY'] = String(y);
  }
  function fitImage(): void {
    if (!image!.naturalWidth) return;
    fit = Math.min((stage!.clientWidth - 48) / image!.naturalWidth, (stage!.clientHeight - 48) / image!.naturalHeight, 1);
    zoom = 1; x = 0; y = 0; draw();
  }
  function zoomAt(next: number, clientX?: number, clientY?: number): void {
    if (!image!.naturalWidth) return;
    const target = Math.max(1, Math.min(8, next));
    const bounds = stage!.getBoundingClientRect();
    const anchorX = clientX === undefined ? 0 : clientX - bounds.left - bounds.width / 2;
    const anchorY = clientY === undefined ? 0 : clientY - bounds.top - bounds.height / 2;
    const factor = target / zoom;
    x = anchorX - (anchorX - x) * factor; y = anchorY - (anchorY - y) * factor;
    zoom = target; draw();
  }
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLElement>('[data-media-open]');
    if (!button?.dataset['mediaOpen']) return;
    const url = new URL(button.dataset['mediaOpen'], location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/media/')) return;
    readerEvents.emit('maestro:layout-before-change');
    trigger = button; pointers.clear(); zoom = 1; x = 0; y = 0;
    const alt = button.querySelector('img')?.alt ?? button.getAttribute('aria-label') ?? '图片预览';
    viewer.querySelector('#media-title')!.textContent = alt;
    image.alt = alt; image.hidden = true; status.hidden = false; status.textContent = '正在载入图片…';
    viewer.showModal(); syncModalLock();
    image.src = url.href;
  });
  image.addEventListener('load', () => { if (!viewer.open) return; image.hidden = false; status.hidden = true; fitImage(); });
  image.addEventListener('error', () => { image.hidden = true; status.hidden = false; status.textContent = '图像暂不可用，可关闭后继续阅读。'; });
  document.addEventListener('error', event => {
    if (!(event.target instanceof HTMLImageElement)) return;
    const button = event.target.closest('.image-trigger'); if (!button) return;
    const fallback = document.createElement('span'); fallback.className = 'missing-media'; fallback.textContent = `图像暂不可用 · ${event.target.alt}`; button.replaceWith(fallback);
  }, true);
  viewer.querySelector('[data-close-media]')?.addEventListener('click', () => viewer.close());
  viewer.querySelector('[data-zoom-in]')?.addEventListener('click', () => zoomAt(zoom * 1.25));
  viewer.querySelector('[data-zoom-out]')?.addEventListener('click', () => zoomAt(zoom / 1.25));
  viewer.querySelector('[data-fit-image]')?.addEventListener('click', fitImage);
  stage.addEventListener('wheel', event => { event.preventDefault(); zoomAt(zoom * Math.exp(-event.deltaY * 0.002), event.clientX, event.clientY); }, { passive: false });
  stage.addEventListener('pointerdown', event => { pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); stage.setPointerCapture(event.pointerId); stage.focus({ preventScroll: true }); });
  stage.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId); if (!previous) return;
    const oldPoints = [...pointers.values()];
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.values()];
    if (points.length >= 2) {
      const oldDistance = Math.hypot(oldPoints[1]!.x - oldPoints[0]!.x, oldPoints[1]!.y - oldPoints[0]!.y);
      const distance = Math.hypot(points[1]!.x - points[0]!.x, points[1]!.y - points[0]!.y);
      if (oldDistance) zoomAt(zoom * distance / oldDistance, (points[0]!.x + points[1]!.x) / 2, (points[0]!.y + points[1]!.y) / 2);
    } else { x += event.clientX - previous.x; y += event.clientY - previous.y; draw(); }
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(name, event => { pointers.delete((event as PointerEvent).pointerId); });
  viewer.addEventListener('keydown', event => {
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomAt(zoom * 1.25); }
    else if (event.key === '-') { event.preventDefault(); zoomAt(zoom / 1.25); }
    else if (event.key === '0') { event.preventDefault(); fitImage(); }
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault(); x += event.key === 'ArrowLeft' ? 40 : event.key === 'ArrowRight' ? -40 : 0; y += event.key === 'ArrowUp' ? 40 : event.key === 'ArrowDown' ? -40 : 0; draw();
    }
  });
  addEventListener('resize', () => { if (viewer.open) fitImage(); });
  viewer.addEventListener('close', () => {
    pointers.clear(); image.removeAttribute('src'); syncModalLock(); trigger?.focus({ preventScroll: true }); trigger = null;
    readerEvents.emit('maestro:overlay-close');
  });
}
