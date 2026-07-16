const HIGHLIGHT_IDS = new Set(['role-0', 'role-1', 'role-6', 'project-9']);

const MONTH_ABBREVIATIONS = new Map([
  ['January', 'Jan'],
  ['February', 'Feb'],
  ['March', 'Mar'],
  ['April', 'Apr'],
  ['June', 'Jun'],
  ['July', 'Jul'],
  ['August', 'Aug'],
  ['September', 'Sep'],
  ['October', 'Oct'],
  ['November', 'Nov'],
  ['December', 'Dec'],
]);

export function workItemId(item) {
  return `${item.kind}-${item.data.id}`;
}

export function partitionWorkItems(items) {
  const highlights = [];
  const other = [];

  for (const item of items) {
    (HIGHLIGHT_IDS.has(workItemId(item)) ? highlights : other).push(item);
  }

  return { highlights, other };
}

export function getWorkRowMeta(item) {
  if (item.kind === 'role') {
    return {
      label: `${item.data.role} @ ${item.data.company}`,
      date: item.data.date,
    };
  }

  return {
    label: `${item.data.category} @ ${item.data.title}`,
    date: item.data.date,
  };
}

export function getHighlightMeta(item) {
  const title = item.kind === 'role' ? item.data.company : item.data.title;
  const image = item.kind === 'role' ? item.data.img : item.data.image;
  const date = item.data.date
    .split(' ')
    .map((part) => MONTH_ABBREVIATIONS.get(part) ?? part)
    .join(' ')
    .replace(/\s+-\s+/, ' — ')
    .replace('Present', 'now');

  return { title, image, date };
}
