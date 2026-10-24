import { readerEvents } from './events.ts';
import { readNovelProgress } from './storage.ts';
import { readReadingMode } from './mode-model.ts';

const home = document.querySelector<HTMLElement>('[data-home]');
if (home) {
  const chapters = JSON.parse(home.dataset['chapters'] ?? '[]') as { id: string; title: string }[];
  const progress = readNovelProgress(chapters.map(chapter => chapter.id));
  const resume = chapters.find(chapter => chapter.id === progress?.chapterId);
  function updateStart(): void {
    if (resume) return;
    const link = home!.querySelector<HTMLAnchorElement>('[data-start-reading]');
    if (link && chapters[0]) link.href = (document.documentElement.dataset['readingMode'] ?? readReadingMode()) === 'chronicle' ? (home!.dataset['chronicleStart'] ?? `/read/${chapters[0].id}/`) : `/read/${chapters[0].id}/`;
  }
  updateStart();
  readerEvents.on('maestro:mode-change', updateStart);
  if (resume && home.dataset['autoResume'] === 'true') {
    location.replace(`/read/${resume.id}/`);
  } else if (resume) {
    const link = home.querySelector<HTMLAnchorElement>('[data-start-reading]');
    const title = home.querySelector<HTMLElement>('[data-resume-title]');
    if (link) {
      link.href = `/read/${resume.id}/`;
      const label = link.querySelector('[data-start-label]');
      if (label) label.textContent = '继续阅读';
    }
    if (title) { title.textContent = resume.title; title.hidden = false; }
  }
}
