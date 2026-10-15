import { categories, filterPrompts, parseSavedIds } from './src/catalog.mjs';
import { promptUrl, readPromptLocation } from './src/sharing.mjs';
import { createViewState, resetActiveFilters, navigationState, writeClipboard } from './src/ui-state.mjs';

const $ = selector => document.querySelector(selector);
const gallery = $('#gallery');
const dialog = $('#prompt-dialog');
const aboutDialog = $('#about-dialog');
const imageDialog = $('#image-dialog');
const search = $('#search');
const view = createViewState();
const filters = () => view.filters[view.active];
const storageKey = 'prompt-gallery:saved:v1';
const defaultTitle = 'Prompt Gallery — 내 사진으로 만드는 새로운 이미지';
const siteRoot = new URL('./', import.meta.url);
document.querySelectorAll('.wordmark, .footer-brand').forEach(link => { link.href = siteRoot.href; });
const defaultFeedback = 'ChatGPT에 사진 1장과 복사한 프롬프트를 함께 보내세요.';
let prompts = [];
let visiblePrompts = [];
let savedIds = new Set();
let currentPrompt = null;
let modalIds = [];
let openerId = null;
let lastTrigger = null;
let layoutFrame;
let toastTimer;
let toastTrigger = null;
let feedbackTimer;
let loading = false;
let imageViewerTrigger = null;
let imageViewerSource = null;
const copyTimers = new WeakMap();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function button(className, label, iconName) {
  const node = element('button', className);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  if (iconName) node.append(icon(iconName));
  return node;
}

function dismissToast() {
  clearTimeout(toastTimer);
  const toast = $('#toast');
  if (toast.contains(document.activeElement)) {
    if (toastTrigger?.isConnected) toastTrigger.focus({ preventScroll: true });
    else focusCard(openerId);
  }
  toast.classList.remove('is-visible');
  $('#toast-action').hidden = true;
}

function resetFeedback() {
  clearTimeout(feedbackTimer);
  if (document.activeElement === $('#detail-undo')) $('#detail-save').focus({ preventScroll: true });
  $('#detail-feedback').textContent = defaultFeedback;
  $('#detail-feedback').removeAttribute('data-tone');
  $('#detail-undo').hidden = true;
  $('#detail-undo').onclick = null;
}

function notify(message, { undo, error = false } = {}) {
  if (dialog.open) {
    clearTimeout(feedbackTimer);
    $('#detail-feedback').textContent = message;
    $('#detail-feedback').dataset.tone = error ? 'error' : 'success';
    if (!undo && document.activeElement === $('#detail-undo')) $('#detail-save').focus({ preventScroll: true });
    $('#detail-undo').hidden = !undo;
    $('#detail-undo').onclick = undo || null;
    if (!undo && !error) feedbackTimer = setTimeout(resetFeedback, 4500);
    return;
  }
  clearTimeout(toastTimer);
  if (!$('#toast').contains(document.activeElement)) toastTrigger = document.activeElement;
  $('#toast-message').textContent = message;
  $('#toast-message').dataset.tone = error ? 'error' : 'success';
  if (!undo && document.activeElement === $('#toast-action')) focusCard(openerId);
  $('#toast-action').hidden = !undo;
  $('#toast-action').onclick = undo || null;
  $('#toast').classList.add('is-visible');
  toastTimer = setTimeout(dismissToast, undo || error ? 10000 : 4500);
}

function layoutGallery() {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(() => {
    gallery.querySelectorAll('.prompt-card').forEach(card => {
      card.style.gridRowEnd = `span ${Math.ceil(card.firstElementChild.getBoundingClientRect().height + 20)}`;
    });
    if ($('#expand-prompt').getAttribute('aria-expanded') === 'true') expandPrompt(true);
  });
}
new ResizeObserver(layoutGallery).observe(gallery);

function skeletons() {
  gallery.replaceChildren();
  for (let i = 0; i < 8; i++) {
    const card = element('article', 'prompt-card skeleton');
    card.setAttribute('aria-hidden', 'true');
    const inner = element('div', 'card-inner');
    const summary = element('div', 'card-summary');
    summary.append(element('div', 'skeleton-line'), element('div', 'skeleton-line short'));
    inner.append(element('div', 'image-placeholder'), summary);
    card.append(inner);
    gallery.append(card);
  }
  layoutGallery();
}

function updateSavedUI() {
  $('#saved-count').textContent = savedIds.size;
  document.querySelectorAll('[data-save-id]').forEach(btn => {
    const saved = savedIds.has(btn.dataset.saveId);
    const title = prompts.find(p => p.id === btn.dataset.saveId)?.title || '프롬프트';
    btn.setAttribute('aria-pressed', String(saved));
    btn.setAttribute('aria-label', `${title} ${saved ? '저장 취소' : '저장'}`);
    btn.title = saved ? '저장 취소' : '프롬프트 저장';
    const label = btn.querySelector('span');
    if (label) label.textContent = saved ? '저장됨' : '저장';
  });
}

function focusCard(id, fallbackIndex = 0) {
  const cards = [...gallery.querySelectorAll('.prompt-card')];
  const card = cards.find(item => item.dataset.id === id) || cards[Math.min(fallbackIndex, cards.length - 1)];
  (card?.querySelector('.card-open') || $('#saved-tab')).focus({ preventScroll: true });
}

function setSaved(id, saved, allowUndo = true) {
  const index = visiblePrompts.findIndex(p => p.id === id);
  const restoreFocus = !dialog.open && document.activeElement.closest?.('.prompt-card')?.dataset.id === id;
  if (saved) savedIds.add(id); else savedIds.delete(id);
  let persisted = true;
  try { localStorage.setItem(storageKey, JSON.stringify([...savedIds])); } catch { persisted = false; }
  if (view.active === 'saved') {
    renderGallery();
    if (restoreFocus) focusCard(id, Math.max(0, index));
  } else updateSavedUI();
  const undo = !saved && allowUndo ? () => {
    setSaved(id, true, false);
    if (!dialog.open) focusCard(id);
  } : null;
  notify(persisted ? (saved ? '이 브라우저에 저장했어요.' : '저장을 취소했어요.') : '브라우저 저장이 제한되어 이번 방문 동안만 유지돼요.', { undo, error: !persisted });
}

function setCopyButton(btn, phase) {
  if (!btn) return;
  if (!btn.dataset.defaultLabel) btn.dataset.defaultLabel = btn.getAttribute('aria-label') || btn.textContent.trim();
  if (!btn.dataset.defaultText) btn.dataset.defaultText = btn.querySelector('span')?.textContent || '';
  clearTimeout(copyTimers.get(btn));
  const isLink = btn.id === 'share-prompt';
  const text = phase === 'busy' ? '복사 중…' : phase === 'success' ? '복사 완료' : btn.dataset.defaultText;
  btn.replaceChildren(icon(phase === 'success' ? 'check' : isLink ? 'link' : 'copy'));
  if (btn.dataset.defaultText) btn.append(element('span', '', text));
  btn.dataset.copying = String(phase === 'busy');
  btn.setAttribute('aria-disabled', String(phase === 'busy'));
  btn.setAttribute('aria-label', phase === 'default' ? btn.dataset.defaultLabel : `${isLink ? '링크' : '프롬프트'} ${text}`);
  btn.classList.toggle('is-copied', phase === 'success');
  if (phase === 'success') copyTimers.set(btn, setTimeout(() => setCopyButton(btn, 'default'), 3000));
}

function legacyCopy(text) {
  const active = document.activeElement;
  const field = element('textarea', 'sr-only');
  field.value = text;
  (dialog.open ? dialog : document.body).append(field);
  field.focus({ preventScroll: true });
  field.select();
  try { return document.execCommand('copy'); }
  finally { field.remove(); active?.focus({ preventScroll: true }); }
}

async function copyText(text, trigger, recoveryPrompt = null, isLink = false) {
  if (trigger?.dataset.copying === 'true') return;
  setCopyButton(trigger, 'busy');
  try {
    const primary = navigator.clipboard?.writeText && window.isSecureContext ? value => navigator.clipboard.writeText(value) : null;
    await writeClipboard(text, primary, legacyCopy);
    setCopyButton(trigger, 'success');
    notify(isLink ? '프롬프트 링크를 복사했어요.' : '프롬프트를 복사했어요. ChatGPT에 사진과 함께 보내세요.');
  } catch {
    setCopyButton(trigger, 'default');
    if (!isLink) {
      if (!dialog.open && recoveryPrompt) openPrompt(recoveryPrompt, trigger);
      if (dialog.open) { $('#detail-prompt').focus({ preventScroll: true }); $('#detail-prompt').select(); }
    }
    notify(isLink ? '복사가 제한되어 있어요. 주소창의 링크를 복사해 주세요.' : '자동 복사가 제한되어 원문을 선택했어요. Ctrl+C 또는 복사 메뉴를 사용하세요.', { error: true });
  }
}

function createCard(prompt, index) {
  const card = element('article', 'prompt-card');
  card.dataset.id = prompt.id;
  const inner = element('div', 'card-inner');
  const open = element('a', 'card-open');
  open.href = promptUrl(prompt.id, siteRoot);
  open.setAttribute('aria-labelledby', `card-title-${prompt.id}`);
  const preview = element('div', 'image-preview');
  preview.style.setProperty('--image-ratio', Math.max(.72, Math.min(1.28, prompt.width / prompt.height)));
  preview.style.setProperty('--image-color', prompt.color);
  const img = new Image();
  img.src = new URL(prompt.thumbnail, siteRoot).href;
  img.alt = '';
  img.width = prompt.width;
  img.height = prompt.height;
  img.loading = index < 8 ? 'eager' : 'lazy';
  img.decoding = 'async';
  img.addEventListener('error', () => {
    img.hidden = true;
    const error = element('div', 'preview-error');
    error.append(icon('photo'), element('span', '', '미리보기를 불러오지 못했어요.'), element('small', '', '눌러서 원본을 확인하세요.'));
    preview.append(error);
  }, { once: true });
  preview.append(img);
  const summary = element('div', 'card-summary');
  const title = element('h2', 'card-title', prompt.title);
  title.id = `card-title-${prompt.id}`;
  const meta = element('div', 'card-meta');
  meta.append(element('span', '', prompt.category), element('span', 'tag-dot'), element('span', 'secondary-tag', prompt.tags[0]));
  summary.append(title, meta);
  if (prompt.referenceImages[0]) {
    const reference = element('div', 'card-reference');
    const referenceImage = new Image();
    referenceImage.src = new URL(prompt.referenceImages[0], siteRoot).href;
    referenceImage.alt = '';
    referenceImage.width = 60;
    referenceImage.height = 44;
    referenceImage.loading = index < 8 ? 'eager' : 'lazy';
    referenceImage.addEventListener('error', () => { reference.hidden = true; layoutGallery(); }, { once: true });
    reference.append(referenceImage, element('span', '', '첨부 예시'));
    summary.prepend(reference);
  }
  open.append(preview, summary);
  open.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openPrompt(prompt, open);
  });
  const actions = element('div', 'card-actions');
  if (prompt.inputRequirement) {
    const badge = element('span', 'input-badge');
    badge.append(icon('photo'), document.createTextNode(prompt.inputRequirement === 'portrait' ? '인물 사진 1장 필요' : '사진 1장 필요'));
    actions.append(badge);
  }
  const copy = button('copy-button', `${prompt.title} 프롬프트 복사`, 'copy');
  copy.append(element('span', '', '프롬프트 복사'));
  copy.addEventListener('click', () => copyText(prompt.prompt, copy, prompt));
  actions.append(copy);
  const save = button('icon-button save-button card-save', `${prompt.title} 저장`, 'bookmark');
  save.dataset.saveId = prompt.id;
  save.addEventListener('click', () => setSaved(prompt.id, !savedIds.has(prompt.id)));
  inner.append(open, actions);
  card.append(inner, save);
  return card;
}

function hasFilters() {
  const { query, category, referenceOnly } = filters();
  return Boolean(query.trim() || category !== '전체' || referenceOnly);
}

function syncControls() {
  const active = filters();
  search.value = active.query;
  $('#reference-only').checked = active.referenceOnly;
  $('#sort').value = active.sort;
  $('#clear-search').hidden = !active.query;
  $('#clear-filters').hidden = !hasFilters();
  $('#categories').querySelectorAll('button').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.category === active.category)));
  const saved = view.active === 'saved';
  for (const [id, selected] of [['explore-tab', !saved], ['saved-tab', saved]]) {
    $(`#${id}`).classList.toggle('is-active', selected);
    $(`#${id}`).setAttribute('aria-pressed', String(selected));
  }
  $('#page-title').replaceChildren(document.createTextNode(saved ? '저장한 프롬프트' : '사진 한 장, 새로운 모습으로'), element('span', 'accent-dot', '.'));
  $('#page-subtitle').textContent = saved ? '이 브라우저에 저장한 프롬프트를 다시 찾아 복사하세요.' : '원본과 결과를 보고, 내 사진에 써볼 프롬프트를 골라보세요.';
}

function renderGallery() {
  visiblePrompts = filterPrompts(prompts, { ...filters(), savedOnly: view.active === 'saved', savedIds });
  gallery.replaceChildren(...visiblePrompts.map(createCard));
  gallery.hidden = visiblePrompts.length === 0;
  $('#empty-state').hidden = visiblePrompts.length !== 0;
  const savedEmpty = view.active === 'saved' && savedIds.size === 0;
  $('#empty-title').textContent = savedEmpty ? '아직 저장한 프롬프트가 없어요.' : view.active === 'saved' ? '조건에 맞는 저장한 프롬프트가 없어요.' : '검색 결과가 없어요.';
  $('#empty-message').textContent = savedEmpty ? '이미지의 북마크 버튼을 누르면 여기에 모입니다.' : '검색어나 필터를 바꿔 다시 찾아보세요.';
  $('#reset-filters').textContent = savedEmpty ? '프롬프트 둘러보기' : '필터 초기화';
  $('#empty-icon use').setAttribute('href', `#i-${savedEmpty ? 'bookmark' : 'search'}`);
  const query = filters().query.trim();
  const context = query ? ` · “${query.length > 40 ? query.slice(0, 40) + '…' : query}” 검색` : filters().category !== '전체' ? ` · ${filters().category}` : '';
  $('#results-status').replaceChildren(element('strong', '', visiblePrompts.length), document.createTextNode(`개의 ${view.active === 'saved' ? '저장한 ' : ''}프롬프트${context}`));
  syncControls();
  updateSavedUI();
  layoutGallery();
}

function switchView(name) {
  if (loading || !prompts.length || view.active === name) return;
  view.active = name;
  dismissToast();
  renderGallery();
}

function expandPrompt(expanded) {
  const field = $('#detail-prompt');
  const control = $('#expand-prompt');
  control.setAttribute('aria-expanded', String(expanded));
  control.textContent = expanded ? '접기' : '전체 보기';
  field.classList.toggle('is-expanded', expanded);
  field.style.height = '';
  if (expanded) field.style.height = `${field.scrollHeight + 2}px`;
}

function updateModalNavigation() {
  if (!currentPrompt) return;
  const nav = navigationState(modalIds, currentPrompt.id);
  $('#previous-prompt').disabled = !nav.previous;
  $('#next-prompt').disabled = !nav.next;
  $('#detail-position').textContent = `${nav.index + 1} / ${nav.count}`;
}

function loadDetailImage(prompt) {
  const image = $('#detail-image');
  $('#detail-image-frame').setAttribute('aria-busy', 'true');
  $('#detail-image-error').hidden = true;
  $('#detail-image-loading').hidden = false;
  image.hidden = true;
  image.alt = prompt.title;
  image.src = new URL(prompt.image, siteRoot).href;
}

function loadViewerImage() {
  if (!imageDialog.open || !imageViewerSource) return;
  $('#image-viewer-content').setAttribute('aria-busy', 'true');
  $('#image-viewer-error').hidden = true;
  $('#image-viewer-loading').hidden = false;
  const image = $('#image-viewer-image');
  image.hidden = true;
  image.src = imageViewerSource;
}

function openImageViewer(src, label, trigger) {
  imageViewerTrigger = trigger;
  imageViewerSource = new URL(src, siteRoot).href;
  $('#image-viewer-title').textContent = label;
  $('#image-viewer-image').alt = `${currentPrompt?.title || ''} · ${label}`;
  $('#image-download').href = imageViewerSource;
  $('#image-download').download = new URL(imageViewerSource).pathname.split('/').at(-1);
  if (!imageDialog.open) imageDialog.showModal();
  $('#close-image-viewer').focus({ preventScroll: true });
  loadViewerImage();
}

function closeImageViewer(restoreFocus = true) {
  if (!imageDialog.open) return;
  imageDialog.close();
  $('#image-viewer-image').removeAttribute('src');
  $('#image-viewer-image').hidden = true;
  $('#image-viewer-content').setAttribute('aria-busy', 'false');
  imageViewerSource = null;
  if (restoreFocus && imageViewerTrigger?.isConnected) imageViewerTrigger.focus({ preventScroll: true });
  imageViewerTrigger = null;
}

function openPrompt(prompt, trigger = null, writeHistory = true) {
  closeImageViewer(false);
  const wasOpen = dialog.open;
  if (!wasOpen) {
    modalIds = (visiblePrompts.some(p => p.id === prompt.id) ? visiblePrompts : prompts).map(p => p.id);
    openerId = prompt.id;
    lastTrigger = trigger;
  }
  currentPrompt = prompt;
  $('#detail-title').textContent = prompt.title;
  $('#detail-category').textContent = prompt.category;
  $('#detail-tags').replaceChildren(...prompt.tags.map(tag => element('span', 'detail-tag', tag)));
  $('#detail-usage').textContent = prompt.usage;
  $('#input-guide').classList.toggle('is-text', !prompt.inputRequirement);
  $('#input-guide use').setAttribute('href', `#i-${prompt.inputRequirement ? 'photo' : 'spark'}`);
  $('#detail-prompt').value = prompt.prompt;
  expandPrompt(false);
  $('#detail-prompt').scrollTop = 0;
  $('#detail-credit-label').replaceChildren(document.createTextNode(prompt.sample ? '커뮤니티 샘플 · ' : '작성 · '), element('span', '', prompt.author));
  $('#detail-source').href = prompt.sourceUrl;
  $('#detail-save').dataset.saveId = prompt.id;
  const refs = $('#reference-images');
  refs.replaceChildren(...prompt.referenceImages.map((path, index) => {
    const open = button('reference-open', `첨부 예시 ${index + 1} 크게 보기`);
    const image = new Image();
    image.src = new URL(path, siteRoot).href;
    image.alt = '';
    open.append(image);
    open.addEventListener('click', () => openImageViewer(path, `첨부 예시 ${index + 1}`, open));
    return open;
  }));
  $('#reference-section').hidden = !prompt.referenceImages.length;
  setCopyButton($('#detail-copy'), 'default');
  setCopyButton($('#share-prompt'), 'default');
  resetFeedback();
  dismissToast();
  updateSavedUI();
  updateModalNavigation();
  loadDetailImage(prompt);
  if (!wasOpen) { dialog.showModal(); $('#close-dialog').focus({ preventScroll: true }); }
  $('.detail-body').scrollTop = 0;
  if (writeHistory) {
    const url = promptUrl(prompt.id, siteRoot);
    if (wasOpen) history.replaceState(history.state, '', url);
    else history.pushState({ ...history.state, promptGallery: true }, '', url);
  }
  document.title = `${prompt.title} — Prompt Gallery`;
}

function closePrompt(writeHistory = true) {
  closeImageViewer(false);
  const returnIndex = Math.max(0, modalIds.indexOf(openerId));
  if (dialog.open) dialog.close();
  currentPrompt = null;
  resetFeedback();
  document.title = defaultTitle;
  if (writeHistory && readPromptLocation(location.href, siteRoot)) {
    if (history.state?.promptGallery) history.back();
    else history.replaceState(null, '', siteRoot.href);
  }
  if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
  else focusCard(openerId, returnIndex);
}

function syncHash() {
  const id = readPromptLocation(location.href, siteRoot);
  const prompt = prompts.find(item => item.id === id);
  if (prompt && currentPrompt?.id !== id) openPrompt(prompt, null, false);
  else if (!prompt && dialog.open) closePrompt(false);
  else if (id && !prompt && !loading) notify('이 프롬프트를 찾을 수 없어요. 갤러리에서 다른 이미지를 찾아보세요.', { error: true });
}

function navigatePrompt(direction) {
  if (!currentPrompt) return;
  const nav = navigationState(modalIds, currentPrompt.id);
  const id = direction < 0 ? nav.previous : nav.next;
  const prompt = prompts.find(item => item.id === id);
  if (prompt) openPrompt(prompt);
}

async function loadCatalog() {
  if (loading) return;
  const retrying = document.activeElement === $('#retry-load');
  loading = true;
  $('#explore-tab').disabled = true;
  $('#saved-tab').disabled = true;
  $('#explore-controls').disabled = true;
  $('#error-state').hidden = true;
  $('#empty-state').hidden = true;
  $('#clear-filters').hidden = true;
  $('#results-status').textContent = '프롬프트를 불러오는 중…';
  $('#retry-load').disabled = true;
  gallery.hidden = false;
  gallery.setAttribute('aria-busy', 'true');
  skeletons();
  try {
    const response = await fetch(new URL('./data/prompts.json', import.meta.url));
    if (!response.ok) throw new Error(`Catalog: ${response.status}`);
    prompts = await response.json();
    if (!Array.isArray(prompts)) throw new Error('Invalid catalog');
    try { savedIds = parseSavedIds(localStorage.getItem(storageKey), new Set(prompts.map(p => p.id))); } catch { savedIds = new Set(); }
    $('.reference-toggle').hidden = prompts.every(prompt => prompt.inputRequirement);
    $('#categories').replaceChildren(...categories.filter(category => category === '전체' || prompts.some(prompt => prompt.category === category)).map(category => {
      const btn = button('category-button', category);
      btn.textContent = category;
      btn.dataset.category = category;
      btn.setAttribute('aria-controls', 'gallery');
      btn.addEventListener('click', () => { filters().category = category; renderGallery(); });
      return btn;
    }));
    $('#explore-controls').disabled = false;
    $('#explore-tab').disabled = false;
    $('#saved-tab').disabled = false;
    renderGallery();
    if (retrying) search.focus({ preventScroll: true });
  } catch (error) {
    console.error('Unable to load the prompt catalog.', error);
    gallery.replaceChildren();
    gallery.hidden = true;
    $('#results-status').textContent = '프롬프트를 불러오지 못했어요.';
    $('#error-state').hidden = false;
  } finally {
    loading = false;
    gallery.setAttribute('aria-busy', 'false');
    $('#retry-load').disabled = false;
  }
  if (!$('#error-state').hidden) return;
  syncHash();
}

search.addEventListener('input', () => { filters().query = search.value; renderGallery(); });
$('#clear-search').addEventListener('click', () => { filters().query = ''; renderGallery(); search.focus(); });
$('#reference-only').addEventListener('change', event => { filters().referenceOnly = event.target.checked; renderGallery(); });
$('#sort').addEventListener('change', event => { filters().sort = event.target.value; renderGallery(); });
$('#clear-filters').addEventListener('click', () => { resetActiveFilters(view); renderGallery(); search.focus(); });
$('#reset-filters').addEventListener('click', () => {
  if (view.active === 'saved' && !savedIds.size) switchView('explore');
  else { resetActiveFilters(view); renderGallery(); search.focus(); }
});
$('#explore-tab').addEventListener('click', () => switchView('explore'));
$('#saved-tab').addEventListener('click', () => switchView('saved'));
$('#detail-save').addEventListener('click', () => { if (currentPrompt) setSaved(currentPrompt.id, !savedIds.has(currentPrompt.id)); });
$('#detail-copy').addEventListener('click', event => { if (currentPrompt) copyText(currentPrompt.prompt, event.currentTarget, currentPrompt); });
$('#share-prompt').addEventListener('click', event => {
  if (currentPrompt) copyText(promptUrl(currentPrompt.id, siteRoot), event.currentTarget, null, true);
});
$('#previous-prompt').addEventListener('click', () => navigatePrompt(-1));
$('#next-prompt').addEventListener('click', () => navigatePrompt(1));
$('#close-dialog').addEventListener('click', () => closePrompt());
$('#original-image').addEventListener('click', event => {
  if (currentPrompt) openImageViewer(currentPrompt.image, '생성 결과 원본', event.currentTarget);
});
$('#close-image-viewer').addEventListener('click', () => closeImageViewer());
$('#retry-viewer-image').addEventListener('click', () => { loadViewerImage(); $('#close-image-viewer').focus({ preventScroll: true }); });
$('#image-viewer-image').addEventListener('load', () => {
  if (!imageDialog.open) return;
  $('#image-viewer-content').setAttribute('aria-busy', 'false');
  $('#image-viewer-loading').hidden = true;
  $('#image-viewer-error').hidden = true;
  $('#image-viewer-image').hidden = false;
});
$('#image-viewer-image').addEventListener('error', () => {
  if (!imageDialog.open) return;
  $('#image-viewer-content').setAttribute('aria-busy', 'false');
  $('#image-viewer-loading').hidden = true;
  $('#image-viewer-image').hidden = true;
  $('#image-viewer-error').hidden = false;
});
imageDialog.addEventListener('cancel', event => { event.preventDefault(); event.stopPropagation(); closeImageViewer(); });
imageDialog.addEventListener('click', event => backdropClick(event, imageDialog, closeImageViewer));
$('#expand-prompt').addEventListener('click', () => expandPrompt($('#expand-prompt').getAttribute('aria-expanded') !== 'true'));
$('#detail-image').addEventListener('load', () => {
  $('#detail-image-frame').setAttribute('aria-busy', 'false');
  $('#detail-image-loading').hidden = true;
  $('#detail-image').hidden = false;
});
$('#detail-image').addEventListener('error', () => {
  $('#detail-image-frame').setAttribute('aria-busy', 'false');
  $('#detail-image-loading').hidden = true;
  $('#detail-image').hidden = true;
  $('#detail-image-error').hidden = false;
});
$('#retry-image').addEventListener('click', () => {
  if (!currentPrompt) return;
  loadDetailImage(currentPrompt);
  $('#original-image').focus({ preventScroll: true });
});
dialog.addEventListener('cancel', event => { event.preventDefault(); closePrompt(); });
function backdropClick(event, target, close) {
  if (event.target !== target) return;
  const box = target.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
}
dialog.addEventListener('click', event => backdropClick(event, dialog, closePrompt));
$('#about-button').addEventListener('click', () => { dismissToast(); aboutDialog.showModal(); $('#close-about').focus(); });
$('#close-about').addEventListener('click', () => aboutDialog.close());
aboutDialog.addEventListener('click', event => backdropClick(event, aboutDialog, () => aboutDialog.close()));
$('#retry-load').addEventListener('click', loadCatalog);
$('#toast-dismiss').addEventListener('click', dismissToast);
$('#toast').addEventListener('mouseenter', () => clearTimeout(toastTimer));
$('#toast').addEventListener('focusin', () => clearTimeout(toastTimer));
$('#toast').addEventListener('mouseleave', () => { toastTimer = setTimeout(dismissToast, 10000); });
window.addEventListener('popstate', syncHash);
window.addEventListener('hashchange', syncHash);
window.addEventListener('storage', event => {
  if (event.key !== storageKey) return;
  savedIds = parseSavedIds(event.newValue, new Set(prompts.map(prompt => prompt.id)));
  if (view.active === 'saved') renderGallery(); else updateSavedUI();
});
document.addEventListener('keydown', event => {
  if (imageDialog.open) return;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.isComposing) return;
  const active = document.activeElement;
  if (active.isContentEditable || active.matches('input, textarea, select')) return;
  if (event.key === '/' && !dialog.open && !aboutDialog.open && !loading) { event.preventDefault(); search.focus(); }
  if (dialog.open && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    navigatePrompt(event.key === 'ArrowLeft' ? -1 : 1);
  }
});
loadCatalog();
