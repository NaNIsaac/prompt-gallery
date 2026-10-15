import { readPromptHash } from './catalog.mjs';

export function promptUrl(id, siteRoot) {
  return new URL(`prompts/${encodeURIComponent(id)}/`, siteRoot).href;
}

export function readPromptLocation(href, siteRoot) {
  const url = new URL(href);
  if (url.hash) return readPromptHash(url.hash);
  const root = new URL(siteRoot);
  if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return null;
  const match = /^prompts\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(?:index\.html)?$/.exec(url.pathname.slice(root.pathname.length));
  return match?.[1] ?? null;
}
