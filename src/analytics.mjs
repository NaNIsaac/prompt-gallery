const eventNames = new Set(['prompt_impression', 'prompt_open', 'prompt_copy', 'prompt_save', 'prompt_unsave', 'prompt_link_copy']);

export function createAnalytics(config, win = globalThis.window, doc = globalThis.document) {
  const disabled = { track() {}, observeCards() {}, setCovered() {} };
  if (!win || !doc || !/^G-[A-Z0-9]+$/.test(config.measurementId || '')) return disabled;
  let root;
  try {
    root = new URL(config.siteUrl);
    if (win.location.origin !== root.origin || !win.location.pathname.startsWith(root.pathname)) return disabled;
    if (root.protocol !== 'https:' && !config.debug) return disabled;
  } catch { return disabled; }
  if (win.navigator?.globalPrivacyControl || win.navigator?.doNotTrack === '1') return disabled;

  const cleanUrl = value => {
    try { const url = new URL(value); return url.origin + url.pathname; } catch { return ''; }
  };
  try {
    win.dataLayer = win.dataLayer || [];
    win.gtag = win.gtag || function () { win.dataLayer.push(arguments); };
    win.gtag('js', new Date());
    win.gtag('config', config.measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: cleanUrl(win.location.href),
      page_referrer: cleanUrl(doc.referrer),
      ...(config.debug ? { debug_mode: true } : {}),
    });
    const script = doc.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`;
    doc.head.append(script);
    win.gtag('event', 'page_view', { page_location: cleanUrl(win.location.href), page_title: doc.title });
  } catch { return disabled; }

  function track(name, prompt, context = {}) {
    if (!eventNames.has(name) || !prompt?.id) return;
    try {
      win.gtag('event', name, {
        send_to: config.measurementId,
        prompt_id: prompt.id,
        prompt_title: prompt.title.slice(0, 100),
        prompt_category: prompt.category,
        surface: ['card', 'detail', 'direct', 'navigation'].includes(context.surface) ? context.surface : 'card',
        gallery_view: context.galleryView === 'saved' ? 'saved' : 'explore',
        ...(Number.isInteger(context.position) && context.position > 0 ? { card_position: context.position } : {}),
        page_location: cleanUrl(win.location.href),
        page_title: doc.title,
      });
    } catch { /* Analytics must never interrupt copying or browsing. */ }
  }

  const seen = new Set();
  const pending = new Map();
  let observer;
  let cards = [];
  let covered = false;
  const clearPending = () => {
    for (const timer of pending.values()) win.clearTimeout(timer);
    pending.clear();
  };
  function refreshObserver() {
    observer?.disconnect();
    clearPending();
    if (covered || doc.visibilityState !== 'visible' || !win.IntersectionObserver) return;
    observer = new win.IntersectionObserver(entries => {
      for (const entry of entries) {
        const item = cards.find(card => card.target === entry.target);
        if (!item) continue;
        const key = `${item.context.galleryView}:${item.prompt.id}`;
        if (!entry.isIntersecting || entry.intersectionRatio < .5) {
          win.clearTimeout(pending.get(key));
          pending.delete(key);
        } else if (!seen.has(key) && !pending.has(key)) {
          pending.set(key, win.setTimeout(() => {
            pending.delete(key);
            if (covered || doc.visibilityState !== 'visible') return;
            seen.add(key);
            track('prompt_impression', item.prompt, item.context);
            observer.unobserve(item.target);
          }, 1000));
        }
      }
    }, { threshold: .5 });
    for (const item of cards) {
      if (!seen.has(`${item.context.galleryView}:${item.prompt.id}`)) observer.observe(item.target);
    }
  }
  doc.addEventListener('visibilitychange', refreshObserver);
  return {
    track,
    observeCards(items) { cards = items; refreshObserver(); },
    setCovered(value) { covered = value; refreshObserver(); },
  };
}
