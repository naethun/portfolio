const HIGHLIGHT_IDS = new Set(['role-0', 'role-3', 'role-1', 'role-6']);

const MONTH_ABBREVIATIONS = new Map([
  ['January', 'Jan'],
  ['February', 'Feb'],
  ['March', 'Mar'],
  ['April', 'Apr'],
  ['June', 'Jun'],
  ['July', 'Jul'],
  ['August', 'Aug'],
  ['September', 'Sep'],
  ['Sept', 'Sep'],
  ['October', 'Oct'],
  ['November', 'Nov'],
  ['December', 'Dec'],
]);

export function workItemId(item) {
  return `${item.kind}-${item.data.id}`;
}

export function isHighlightedWork(item) {
  return HIGHLIGHT_IDS.has(workItemId(item));
}

export function partitionWorkItems(items) {
  const highlights = [];
  const other = [];

  for (const item of items) {
    (isHighlightedWork(item) ? highlights : other).push(item);
  }

  return { highlights, other };
}

/** "June 2025 - December 2025" → "Jun 2025 — Dec 2025"; "Present" reads as "now". */
export function formatDateRange(date) {
  return date
    .split(' ')
    .map((part) => MONTH_ABBREVIATIONS.get(part) ?? part)
    .join(' ')
    .replace(/\s+-\s+/, ' — ')
    .replace('Present', 'now');
}

function nameOf(item) {
  return item.kind === 'role' ? item.data.company : item.data.title;
}

function roleOf(item) {
  return item.kind === 'role' ? item.data.role : item.data.category;
}

export function getWorkRowMeta(item) {
  return {
    name: nameOf(item),
    role: roleOf(item),
    date: formatDateRange(item.data.date),
  };
}

export function getHighlightMeta(item) {
  const summary = item.data.summary;

  return {
    title: nameOf(item),
    image: item.kind === 'role' ? item.data.img : item.data.image,
    date: formatDateRange(item.data.date),
    descriptor: summary ? `${roleOf(item)} · ${summary}` : roleOf(item),
  };
}

/** The item after `id` in reading order, wrapping to the first; null if `id` is unknown. */
export function nextWorkItemId(items, id) {
  const index = items.findIndex((item) => workItemId(item) === id);
  if (index === -1) return null;
  return workItemId(items[(index + 1) % items.length]);
}
