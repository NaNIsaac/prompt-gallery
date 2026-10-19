import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalytics } from '../src/analytics.mjs';

const config = { measurementId: 'G-TEST12345', siteUrl: 'https://example.com/gallery/' };
const prompt = { id: 'example', title: '예시', category: '캐릭터' };
function environment(href = 'https://example.com/gallery/?secret=private#private') {
  const appended = [];
  const timers = new Map();
  const observers = [];
  const listeners = {};
  const win = {
    location: new URL(href), navigator: {},
    setTimeout(fn) { const id = Symbol(); timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; this.targets = new Set(); observers.push(this); }
      observe(target) { this.targets.add(target); }
      unobserve(target) { this.targets.delete(target); }
      disconnect() { this.targets.clear(); }
    },
  };
  const doc = {
    referrer: 'https://referrer.example/?email=private#private', title: 'Gallery', visibilityState: 'visible',
    createElement: () => ({}), head: { append: script => appended.push(script) },
    addEventListener(name, fn) { listeners[name] = fn; },
  };
  return { win, doc, appended, observers, timers, listeners,
    flush() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); },
    events() { return (win.dataLayer || []).map(args => [...args]).filter(args => args[0] === 'event'); },
  };
}

test('analytics is disabled without a valid ID, off site, locally, and for privacy preferences', () => {
  for (const [href, measurementId, navigator] of [
    ['https://example.com/gallery/', '', {}],
    ['https://example.com/gallery/', 'bad-id', {}],
    ['http://localhost:4173/gallery/', config.measurementId, {}],
    ['https://example.com/another/', config.measurementId, {}],
    ['https://fork.example/gallery/', config.measurementId, {}],
    ['https://example.com/gallery/', config.measurementId, { doNotTrack: '1' }],
    ['https://example.com/gallery/', config.measurementId, { globalPrivacyControl: true }],
  ]) {
    const env = environment(href);
    env.win.navigator = navigator;
    const analytics = createAnalytics({ ...config, measurementId }, env.win, env.doc);
    analytics.track('prompt_copy', prompt);
    analytics.observeCards([]);
    assert.equal(env.appended.length, 0);
    assert.equal(env.events().length, 0);
  }
});

test('events contain only approved metadata and sanitized URLs, with one initial page view', () => {
  const env = environment();
  const analytics = createAnalytics(config, env.win, env.doc);
  analytics.track('prompt_copy', prompt, { surface: 'detail', galleryView: 'explore', position: 2, query: 'private', text: 'private' });
  analytics.track('unapproved_event', prompt);
  assert.equal(env.appended.length, 1);
  assert.equal(env.events().filter(event => event[1] === 'page_view').length, 1);
  const event = env.events().find(event => event[1] === 'prompt_copy')[2];
  assert.equal(event.prompt_id, 'example');
  assert.equal(event.surface, 'detail');
  assert.equal(event.card_position, 2);
  assert.equal(event.page_location, 'https://example.com/gallery/');
  assert.ok(!JSON.stringify(env.win.dataLayer).includes('private'));
  const settings = [...env.win.dataLayer[1]][2];
  assert.equal(settings.send_page_view, false);
  assert.equal(settings.allow_google_signals, false);
  assert.equal(settings.allow_ad_personalization_signals, false);
});

test('impressions require continuous visibility, pause under dialogs, and deduplicate re-renders', () => {
  const env = environment();
  const analytics = createAnalytics(config, env.win, env.doc);
  const target = {};
  const cards = [{ target, prompt, context: { galleryView: 'explore', surface: 'card', position: 1 } }];
  const enter = () => env.observers.at(-1).callback([{ target, isIntersecting: true, intersectionRatio: .5 }]);
  analytics.observeCards(cards);
  enter();
  analytics.setCovered(true);
  env.flush();
  assert.equal(env.events().length, 1);
  analytics.setCovered(false);
  enter();
  env.observers.at(-1).callback([{ target, isIntersecting: false, intersectionRatio: 0 }]);
  env.flush();
  assert.equal(env.events().length, 1);
  enter();
  env.doc.visibilityState = 'hidden';
  env.listeners.visibilitychange();
  env.flush();
  assert.equal(env.events().length, 1);
  env.doc.visibilityState = 'visible';
  env.listeners.visibilitychange();
  enter();
  env.flush();
  assert.equal(env.events().filter(event => event[1] === 'prompt_impression').length, 1);
  analytics.observeCards(cards);
  assert.equal(env.observers.at(-1).targets.size, 0);
});

test('a broken analytics destination cannot interrupt gallery actions', () => {
  const env = environment();
  const analytics = createAnalytics(config, env.win, env.doc);
  env.win.gtag = () => { throw new Error('blocked'); };
  assert.doesNotThrow(() => analytics.track('prompt_copy', prompt));
});
