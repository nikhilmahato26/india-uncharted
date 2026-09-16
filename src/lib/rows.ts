/**
 * A grid of four in three columns leaves one card alone on a second row, which
 * reads as an accident rather than a choice. Show whole rows, or everything
 * when there is less than a row of them.
 */
export function wholeRows<T>(items: T[], columns: number): T[] {
  if (items.length <= columns) return items;
  return items.slice(0, Math.floor(items.length / columns) * columns);
}
