import { categories, filterPrompts, parseSavedIds, readPromptHash } from './src/catalog.mjs';

const $ = selector => document.querySelector(selector);
const gallery = $('#gallery');
const dialog = $('#prompt-dialog');
const aboutDialog = $('#about-dialog');
const search = $('#search');
const storageKey = 'prompt-gallery:saved:v1';
let prompts = [];
let visiblePrompts = [];
let savedIds = new Set();
let currentPrompt = null;
let lastTrigger = null;
let toastTimer;
let layoutFrame;
const state = { query: '', category: '전체', referenceOnly: false, savedOnly: false, sort: 'curated' };

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className, label, iconName) {
  const node = element('button', className);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  if (iconName) node.append(icon(iconName));
  return node;
}

function notify(message) {
  const toast = $('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function layoutGallery() {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(() => {
    gallery.querySelectorAll('.prompt-card').forEach(card => {
      card.style.gridRowEnd = `span ${Math.ceil(card.firstElementChild.getBoundingClientRect().height + 20)}`;
    });
  });
}

const resizeObserver = new ResizeObserver(layoutGallery);
resizeObserver.observe(gallery);

function skeletons() {
  gallery.replaceChildren();
  for (let i = 0; i < 8; i++) {
    const item = element('article', 'prompt-card skeleton');
    item.setAttribute('aria-hidden', 'true');
    const inner = element('div', 'card-inner');
    inner.append(element('div', 'image-placeholder'));
    const info = element('div', 'card-info');
    info.append(element('div', 'skeleton-line'), element('div', 'skeleton-line short'));
    inner.append(info);
    item.append(inner);
    gallery.append(item);
  }
  layoutGallery();
}

function updateSavedUI() {
  $('#saved-count').textContent = savedIds.size;
  document.querySelectorAll('[data-save-id]').forEach(btn => {
    const saved = savedIds.has(btn.dataset.saveId);
    btn.setAttribute('aria-pressed', String(saved));
    btn.setAttribute('aria-label', saved ? '저장 취소' : '프롬프트 저장');
  });
}

function toggleSaved(id) {
  if (savedIds.has(id)) savedIds.delete(id); else savedIds.add(id);
  try {
    localStorage.setItem(storageKey, JSON.stringify([...savedIds]));
    notify(savedIds.has(id) ? '이 브라우저에 프롬프트를 저장했어요.' : '저장한 프롬프트에서 지웠어요.');
  } catch { notify('브라우저 저장 공간을 사용할 수 없어 이번 방문 동안만 저장됩니다.'); }
  if (state.savedOnly) renderGallery();
  updateSavedUI();
}

async function copyText(text, trigger, success = '프롬프트를 복사했어요. ChatGPT에 붙여넣어 보세요.') {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const field = element('textarea', 'sr-only');
      field.value = text;
      (dialog.open ? dialog : document.body).append(field);
      field.focus();
      field.select();
      let copied;
      try { copied = document.execCommand('copy'); } finally { field.remove(); }
      trigger?.focus({ preventScroll: true });
      if (!copied) throw new Error('Clipboard unavailable');
    }
    if (trigger) {
      const previous = [...trigger.childNodes].map(node => node.cloneNode(true));
      trigger.replaceChildren(icon('check'), element('span', '', '복사 완료'));
      trigger.classList.add('is-copied');
      trigger.disabled = true;
      setTimeout(() => { trigger.replaceChildren(...previous); trigger.classList.remove('is-copied'); trigger.disabled = false; }, 1700);
    }
    notify(success);
  } catch {
    if (currentPrompt && dialog.open) {
      $('#detail-prompt').focus();
      $('#detail-prompt').select();
    }
    notify('자동 복사가 차단됐어요. 상세의 프롬프트를 선택해 직접 복사해 주세요.');
  }
}

function createCard(prompt, index) {
  const card = element('article', 'prompt-card');
  card.dataset.id = prompt.id;
  const inner = element('div', 'card-inner');
  const imageButton = button('image-button', `${prompt.title} 자세히 보기`);
  imageButton.style.setProperty('--image-ratio', Math.max(.72, Math.min(1.28, prompt.width / prompt.height)));
  imageButton.style.setProperty('--image-color', prompt.color);
  const img = new Image();
  img.src = new URL(prompt.thumbnail, document.baseURI).href;
  img.alt = prompt.title;
  img.width = prompt.width;
  img.height = prompt.height;
  img.loading = index < 8 ? 'eager' : 'lazy';
  img.decoding = 'async';
  img.addEventListener('load', layoutGallery, { once: true });
  img.addEventListener('error', () => { img.alt = `${prompt.title} — 이미지를 불러오지 못했어요`; });
  imageButton.append(img);
  if (prompt.inputRequirement) {
    const badge = element('span', 'input-badge');
    badge.append(icon('photo'), document.createTextNode(prompt.inputRequirement === 'portrait' ? '내 사진 활용' : '사진 활용'));
    imageButton.append(badge);
  }
  imageButton.addEventListener('click', () => openPrompt(prompt, imageButton));
  const save = button('icon-button save-button card-save', '프롬프트 저장', 'bookmark');
  save.dataset.saveId = prompt.id;
  save.setAttribute('aria-pressed', String(savedIds.has(prompt.id)));
  save.addEventListener('click', () => toggleSaved(prompt.id));
  const info = element('div', 'card-info');
  const heading = element('h2');
  const title = button('card-title', `${prompt.title} 자세히 보기`);
  title.textContent = prompt.title;
  title.title = prompt.title;
  title.addEventListener('click', () => openPrompt(prompt, title));
  heading.append(title);
  const bottom = element('div', 'card-bottom');
  const tags = element('div', 'card-tags');
  tags.append(element('span', '', prompt.category), element('span', 'tag-dot'), element('span', 'secondary-tag', prompt.tags[0]));
  const copy = button('copy-button', `${prompt.title} 프롬프트 복사`, 'copy');
  copy.append(element('span', '', '복사'));
  copy.addEventListener('click', () => copyText(prompt.prompt, copy));
  bottom.append(tags, copy);
  info.append(heading, bottom);
  inner.append(imageButton, info);
  card.append(inner, save);
  return card;
}

function renderGallery() {
  visiblePrompts = filterPrompts(prompts, { ...state, savedIds });
  gallery.replaceChildren(...visiblePrompts.map(createCard));
  gallery.hidden = visiblePrompts.length === 0;
  const empty = $('#empty-state');
  empty.hidden = visiblePrompts.length !== 0;
  const savedEmpty = state.savedOnly && savedIds.size === 0;
  $('#empty-title').textContent = savedEmpty ? '다음에 또 쓰고 싶은 프롬프트를 모아보세요.' : '아직 일치하는 프롬프트가 없어요.';
  $('#empty-message').textContent = savedEmpty ? '이미지 오른쪽 위의 북마크를 누르면 여기에 모입니다.' : '다른 검색어나 카테고리로 새로운 이미지를 찾아보세요.';
  $('#results-status').replaceChildren(element('strong', '', visiblePrompts.length), document.createTextNode(state.savedOnly ? '개의 저장한 프롬프트' : '개의 프롬프트'));
  $('#clear-search').hidden = !state.query;
  $('#categories').querySelectorAll('button').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.category === state.category)));
  $('#explore-tab').classList.toggle('is-active', !state.savedOnly);
  $('#saved-tab').classList.toggle('is-active', state.savedOnly);
  $('#explore-tab').setAttribute('aria-pressed', String(!state.savedOnly));
  $('#saved-tab').setAttribute('aria-pressed', String(state.savedOnly));
  $('#page-title').replaceChildren(document.createTextNode(state.savedOnly ? '다음에도 꺼내 쓰고 싶은 아이디어' : '발견하고, 복사하고, 만들어보세요'), element('span', 'accent-dot', '.'));
  $('#page-subtitle').textContent = state.savedOnly ? '마음에 들어 저장해 둔 프롬프트를 다시 만나보세요.' : '마음에 드는 이미지에서 시작하는, 나만의 다음 아이디어.';
  updateSavedUI();
  layoutGallery();
}

function openPrompt(prompt, trigger = null, writeHash = true) {
  if (trigger) lastTrigger = trigger;
  currentPrompt = prompt;
  $('#detail-title').textContent = prompt.title;
  $('#detail-category').textContent = prompt.category;
  $('#detail-image').src = new URL(prompt.image, document.baseURI).href;
  $('#detail-image').alt = prompt.title;
  $('#original-image').href = new URL(prompt.image, document.baseURI).href;
  $('#detail-tags').replaceChildren(...prompt.tags.map(tag => element('span', 'detail-tag', tag)));
  $('#detail-usage').textContent = prompt.usage;
  $('#input-guide').classList.toggle('is-text', !prompt.inputRequirement);
  $('#input-guide').querySelector('use').setAttribute('href', `#i-${prompt.inputRequirement ? 'photo' : 'spark'}`);
  $('#detail-prompt').value = prompt.prompt;
  $('#detail-prompt').scrollTop = 0;
  $('#detail-author').textContent = prompt.author;
  $('#detail-source').href = prompt.sourceUrl;
  const credit = $('.detail-credit');
  credit.firstElementChild.firstChild.nodeValue = prompt.sample ? '커뮤니티 샘플 · ' : '작성 · ';
  $('#detail-save').dataset.saveId = prompt.id;
  const refs = $('#reference-images');
  refs.replaceChildren(...prompt.referenceImages.map(path => {
    const link = element('a');
    const img = new Image();
    img.src = new URL(path, document.baseURI).href;
    img.alt = '이 프롬프트의 레퍼런스 이미지';
    link.href = img.src;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.append(img);
    return link;
  }));
  refs.hidden = !prompt.referenceImages.length;
  const currentList = visiblePrompts.some(p => p.id === prompt.id) ? visiblePrompts : prompts;
  const position = currentList.findIndex(p => p.id === prompt.id);
  $('#previous-prompt').disabled = position <= 0;
  $('#next-prompt').disabled = position >= currentList.length - 1;
  updateSavedUI();
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  if (writeHash) history.pushState(null, '', `#prompt=${encodeURIComponent(prompt.id)}`);
  document.title = `${prompt.title} — Prompt Gallery`;
}

function closePrompt(writeHash = true) {
  if (dialog.open) dialog.close();
  currentPrompt = null;
  document.title = 'Prompt Gallery — 발견하고, 복사하고, 만들어보세요.';
  if (writeHash && location.hash.startsWith('#prompt=')) history.replaceState(null, '', location.pathname + location.search);
  if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
}

function syncHash() {
  const id = readPromptHash(location.hash);
  const match = prompts.find(prompt => prompt.id === id);
  if (match) openPrompt(match, null, false);
  else if (dialog.open) closePrompt(false);
}

function navigatePrompt(direction) {
  if (!currentPrompt) return;
  const list = visiblePrompts.some(p => p.id === currentPrompt.id) ? visiblePrompts : prompts;
  const index = list.findIndex(p => p.id === currentPrompt.id);
  const next = list[index + direction];
  if (next) {
    history.replaceState(null, '', `#prompt=${encodeURIComponent(next.id)}`);
    openPrompt(next, null, false);
  }
}

function resetFilters() {
  Object.assign(state, { query: '', category: '전체', referenceOnly: false, savedOnly: false, sort: 'curated' });
  search.value = '';
  $('#reference-only').checked = false;
  $('#sort').value = 'curated';
  renderGallery();
}

async function loadCatalog() {
  $('#error-state').hidden = true;
  gallery.hidden = false;
  gallery.setAttribute('aria-busy', 'true');
  skeletons();
  try {
    const response = await fetch(new URL('./data/prompts.json', import.meta.url));
    if (!response.ok) throw new Error(`Catalog: ${response.status}`);
    prompts = await response.json();
    const validIds = new Set(prompts.map(prompt => prompt.id));
    try { savedIds = parseSavedIds(localStorage.getItem(storageKey), validIds); } catch { savedIds = new Set(); }
    $('#categories').replaceChildren(...categories.map(category => {
      const btn = button('category-button', category);
      btn.textContent = category;
      btn.dataset.category = category;
      btn.setAttribute('aria-pressed', String(category === state.category));
      btn.addEventListener('click', () => { state.category = category; renderGallery(); });
      return btn;
    }));
    renderGallery();
    syncHash();
  } catch (error) {
    console.error('Unable to load the prompt catalog.', error);
    gallery.replaceChildren();
    gallery.hidden = true;
    $('#results-status').textContent = '잠시 후 다시 시도해 주세요.';
    $('#error-state').hidden = false;
  } finally { gallery.setAttribute('aria-busy', 'false'); }
}

search.addEventListener('input', () => { state.query = search.value; renderGallery(); });
$('#clear-search').addEventListener('click', () => { search.value = ''; state.query = ''; renderGallery(); search.focus(); });
$('#reference-only').addEventListener('change', event => { state.referenceOnly = event.target.checked; renderGallery(); });
$('#sort').addEventListener('change', event => { state.sort = event.target.value; renderGallery(); });
$('#reset-filters').addEventListener('click', resetFilters);
$('#explore-tab').addEventListener('click', resetFilters);
$('#saved-tab').addEventListener('click', () => { state.savedOnly = true; state.query = ''; state.category = '전체'; state.referenceOnly = false; search.value = ''; $('#reference-only').checked = false; renderGallery(); });
$('#detail-save').addEventListener('click', () => { if (currentPrompt) toggleSaved(currentPrompt.id); });
$('#detail-copy').addEventListener('click', event => { if (currentPrompt) copyText(currentPrompt.prompt, event.currentTarget); });
$('#mobile-detail-copy').addEventListener('click', event => { if (currentPrompt) copyText(currentPrompt.prompt, event.currentTarget); });
$('#share-prompt').addEventListener('click', () => { if (currentPrompt) copyText(location.href, null, '이 프롬프트의 링크를 복사했어요.'); });
$('#previous-prompt').addEventListener('click', () => navigatePrompt(-1));
$('#next-prompt').addEventListener('click', () => navigatePrompt(1));
$('#close-dialog').addEventListener('click', () => closePrompt());
dialog.addEventListener('cancel', event => { event.preventDefault(); closePrompt(); });
dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closePrompt(); } });
$('#about-button').addEventListener('click', () => aboutDialog.showModal());
$('#close-about').addEventListener('click', () => aboutDialog.close());
$('#retry-load').addEventListener('click', loadCatalog);
window.addEventListener('popstate', syncHash);
window.addEventListener('hashchange', syncHash);
window.addEventListener('storage', event => {
  if (event.key !== storageKey) return;
  savedIds = parseSavedIds(event.newValue, new Set(prompts.map(prompt => prompt.id)));
  if (state.savedOnly) renderGallery(); else updateSavedUI();
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !dialog.open && !aboutDialog.open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); search.focus(); }
  if (dialog.open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    if (event.key === 'ArrowLeft') navigatePrompt(-1);
    if (event.key === 'ArrowRight') navigatePrompt(1);
  }
});
loadCatalog();
