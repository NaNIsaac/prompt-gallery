// Builds docs/images/readme-examples.webp: four input → result pairs for the README header.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examples = ['kakao-emoticons', 'travel-ceramic-nightlight', 'shinchan-world', 'teenieping'];
const output = path.join(root, 'docs/images/readme-examples.webp');

const cell = { width: 800, height: 440 };
const pad = 24;
const input = { width: 220, height: 392 };
const result = { width: 470, height: 392 };
const arrowWidth = cell.width - pad * 2 - input.width - result.width;
const background = '#f4f1ec';

const arrow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${arrowWidth}" height="${input.height}">
  <path d="M${arrowWidth / 2 - 14} ${input.height / 2 - 18} l18 18 -18 18" fill="none" stroke="#8a8178" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);

const fitted = (file, box, fit) => sharp(path.join(root, file))
  .resize({ ...box, fit, background, position: 'attention' })
  .flatten({ background })
  .toBuffer();

const layers = [];
for (const [index, id] of examples.entries()) {
  const left = (index % 2) * cell.width + pad;
  const top = Math.floor(index / 2) * cell.height + pad;
  layers.push(
    { input: await fitted(`assets/images/${id}.reference.webp`, input, 'cover'), left, top },
    { input: arrow, left: left + input.width, top },
    { input: await fitted(`assets/images/${id}.webp`, result, 'contain'), left: left + input.width + arrowWidth, top }
  );
}

await sharp({ create: { width: cell.width * 2, height: cell.height * 2, channels: 3, background } })
  .composite(layers)
  .webp({ quality: 80 })
  .toFile(output);
console.log(`Wrote ${path.relative(root, output)}`);
