export const categories = ['전체', '인물', '캐릭터', '일러스트', '제품', '포스터', '아트·밈'];

export function normalizeSearch(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('ko').trim();
}

export function filterPrompts(prompts, { query = '', category = '전체', referenceOnly = false, savedOnly = false, savedIds = new Set(), sort = 'curated' } = {}) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const items = prompts.filter(prompt => {
    if (category !== '전체' && prompt.category !== category) return false;
    if (referenceOnly && !prompt.inputRequirement) return false;
    if (savedOnly && !savedIds.has(prompt.id)) return false;
    const text = normalizeSearch([prompt.title, prompt.category, ...prompt.tags, prompt.prompt, prompt.author].join(' '));
    return terms.every(term => text.includes(term));
  });
  return items.sort(sort === 'title'
    ? (a, b) => a.title.localeCompare(b.title, 'ko')
    : (a, b) => a.order - b.order);
}

export function readPromptHash(hash) {
  if (!hash.startsWith('#prompt=')) return null;
  try { return decodeURIComponent(hash.slice(8)); } catch { return null; }
}

export function parseSavedIds(raw, validIds) {
  try {
    const ids = JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string' && validIds.has(id)) : []);
  } catch { return new Set(); }
}
