const HIGHLIGHT_IDS = new Set(['role-0', 'role-1', 'role-6', 'project-9']);

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
