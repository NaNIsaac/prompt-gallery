export function createViewState() {
  const defaults = () => ({ query: '', category: '전체', referenceOnly: false, sort: 'curated' });
  return { active: 'explore', filters: { explore: defaults(), saved: defaults() } };
}

export function resetActiveFilters(view) {
  Object.assign(view.filters[view.active], { query: '', category: '전체', referenceOnly: false });
}

export function navigationState(ids, currentId) {
  const index = ids.indexOf(currentId);
  return { index, count: ids.length, previous: index > 0 ? ids[index - 1] : null, next: index >= 0 ? ids[index + 1] ?? null : null };
}

export async function writeClipboard(text, primary, fallback) {
  if (primary) {
    try { await primary(text); return; } catch { /* Permission failures can still allow the legacy copy path. */ }
  }
  if (!fallback(text)) throw new Error('Clipboard unavailable');
}
