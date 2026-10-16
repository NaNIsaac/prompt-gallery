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
    const exampleAssets = [];
    if (item.examples !== undefined) {
      if (!Array.isArray(item.examples) || item.examples.length < 2) throw new Error(`${item.id}: examples must contain at least two variants`);
      const labels = new Set();
      for (const example of item.examples) {
        if (typeof example.label !== 'string' || !example.label.trim() || labels.has(example.label)) throw new Error(`${item.id}: invalid or duplicate example label`);
        labels.add(example.label);
        if (![example.width, example.height].every(n => Number.isFinite(n) && n > 0)) throw new Error(`${item.id}: invalid example dimensions`);
        if (!Array.isArray(example.referenceImages) || !example.referenceImages.length) throw new Error(`${item.id}: each example needs its own reference`);
        if (typeof example.note !== 'string' || !example.note.trim()) throw new Error(`${item.id}: each example needs a note`);
        exampleAssets.push(example.image, ...example.referenceImages);
      }
      const first = item.examples[0];
      if (first.image !== item.image || first.width !== item.width || first.height !== item.height || JSON.stringify(first.referenceImages) !== JSON.stringify(item.referenceImages)) throw new Error(`${item.id}: first example must match the card preview`);
    }
    for (const asset of [item.image, item.thumbnail, ...item.referenceImages, ...exampleAssets]) {
      if (typeof asset !== 'string' || !asset.startsWith('assets/')) throw new Error(`${item.id}: image paths must start with assets/`);
      const path = resolve(root, asset);
      const rel = relative(root, path);
      if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`${item.id}: image path leaves the project`);
      await access(path);
    }
  }
  return items;
}
