'use strict';
const normalized = text => text.normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g, '');
for (const zone of document.querySelectorAll('.filter-zone')) {
  const input = zone.querySelector('input[type="search"]');
  const entries = [...zone.querySelectorAll('.reference-entry')];
  const count = zone.querySelector('[data-count]');
  const empty = zone.querySelector('.no-results');
  const indexed = entries.map(entry => ({entry, text:normalized(entry.textContent)}));
  input.addEventListener('input', () => {
    const query = normalized(input.value);
    let shown = 0;
    for (const {entry, text} of indexed) {
      const matches = !query || text.includes(query);
      entry.hidden = !matches;
      if (query && matches) entry.open = true;
      if (!query) entry.open = false;
      if (matches) shown++;
    }
    count.textContent = query ? shown+'종 / 전체 '+entries.length+'종이 검색됐어요.' : entries.length+'종을 볼 수 있어요.';
    empty.hidden = shown !== 0;
  });
}
