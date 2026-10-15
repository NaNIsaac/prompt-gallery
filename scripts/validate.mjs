import { readFile, access } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories } from '../src/catalog.mjs';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export async function readCatalog(root = projectRoot) {
  const items = JSON.parse(await readFile(resolve(root, 'data/prompts.json'), 'utf8'));
  if (!Array.isArray(items) || !items.length) throw new Error('The catalog must contain at least one prompt.');
  const ids = new Set();
  for (const item of items) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || ids.has(item.id)) throw new Error(`Invalid or duplicate id: ${item.id}`);
    ids.add(item.id);
    for (const field of ['title', 'prompt', 'usage', 'inputLabel', 'author']) {
      if (typeof item[field] !== 'string' || !item[field].trim()) throw new Error(`${item.id}: missing ${field}`);
    }
    if (item.exampleNote !== undefined && (typeof item.exampleNote !== 'string' || !item.exampleNote.trim())) throw new Error(`${item.id}: exampleNote must be non-empty text`);
    if (!categories.slice(1).includes(item.category)) throw new Error(`${item.id}: unsupported category`);
    if (!Array.isArray(item.tags) || !item.tags.every(tag => typeof tag === 'string')) throw new Error(`${item.id}: tags must be strings`);
    if (!Array.isArray(item.referenceImages) || !item.referenceImages.length) throw new Error(`${item.id}: at least one reference image is required`);
    if (!['image', 'portrait'].includes(item.inputRequirement)) throw new Error(`${item.id}: a photo input is required`);
    if (![item.width, item.height].every(n => Number.isFinite(n) && n > 0)) throw new Error(`${item.id}: invalid image dimensions`);
    if (!Number.isFinite(item.order)) throw new Error(`${item.id}: invalid order`);
    if (!/^#[0-9a-f]{6}$/i.test(item.color)) throw new Error(`${item.id}: invalid placeholder color`);
    for (const field of ['sourceUrl', 'collectionUrl', 'inspirationUrl']) {
      if (item[field] && new URL(item[field]).protocol !== 'https:') throw new Error(`${item.id}: ${field} must use HTTPS`);
    }
    for (const asset of [item.image, item.thumbnail, ...item.referenceImages]) {
      if (typeof asset !== 'string' || !asset.startsWith('assets/')) throw new Error(`${item.id}: image paths must start with assets/`);
      const path = resolve(root, asset);
      const rel = relative(root, path);
      if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`${item.id}: image path leaves the project`);
      await access(path);
    }
  }
  return items;
}
