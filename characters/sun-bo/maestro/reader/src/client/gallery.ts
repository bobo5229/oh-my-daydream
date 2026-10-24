const gallery = document.querySelector('[data-gallery]');
if (gallery) {
  const search = gallery.querySelector<HTMLInputElement>('[data-gallery-search]')!;
  const category = gallery.querySelector<HTMLSelectElement>('[data-gallery-category]')!;
  const rows = [...gallery.querySelectorAll<HTMLElement>('[data-gallery-asset]')];
  const normalized = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g, '');
  function update(): void {
    let count = 0;
    for (const row of rows) {
      row.hidden = (category.value !== 'all' && row.dataset['assetType'] !== category.value) || !normalized(row.dataset['assetSearch'] ?? '').includes(normalized(search.value));
      if (!row.hidden) count++;
    }
    gallery!.querySelector('[data-gallery-count]')!.textContent = `${count} 项资料`;
    gallery!.querySelector<HTMLElement>('[data-gallery-empty]')!.hidden = count > 0;
  }
  search.addEventListener('input', update); category.addEventListener('change', update); update();
}
export {};
