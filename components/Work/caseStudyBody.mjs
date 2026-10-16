const BULLET = /^[-•]\s+/;

/** @typedef {{ type: 'paragraph', text: string } | { type: 'list', items: string[] }} CaseStudyBlock */

/**
 * Turns a description written as blank-line separated blocks into paragraphs
 * and lists. Blocks that start with "- " become list items, and consecutive
 * items share one list; other blocks stay paragraphs with their line breaks.
 *
 * @param {string | null | undefined} text
 * @returns {CaseStudyBlock[]}
 */
export function parseCaseStudyBody(text) {
  if (!text) return [];

  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);

  /** @type {CaseStudyBlock[]} */
  const result = [];
  for (const lines of blocks) {
    if (BULLET.test(lines[0])) {
      const item = lines.join(' ').replace(BULLET, '');
      const last = result[result.length - 1];
      if (last?.type === 'list') last.items.push(item);
      else result.push({ type: 'list', items: [item] });
    } else {
      result.push({ type: 'paragraph', text: lines.join('\n') });
    }
  }
  return result;
}
