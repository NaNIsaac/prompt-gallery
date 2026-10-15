import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export async function createSocialImage(prompt, projectRoot, output) {
  const source = await readFile(resolve(projectRoot, prompt.image));
  const version = createHash('sha256').update(source).digest('hex').slice(0, 12);
  const path = `assets/social/${prompt.id}-${version}.jpg`;
  // Keep the whole result visible inside Kakao's 2:1 preview, including portrait art.
  const image = await sharp(source).rotate().resize(1200, 600, { fit: 'contain', background: '#f5f3ef' }).jpeg({ quality: 90 }).toBuffer();
  await mkdir(resolve(output, 'assets/social'), { recursive: true });
  await writeFile(resolve(output, path), image);
  return path;
}

export function socialTags({ title, description, url, image, imageAlt }) {
  const tags = {
    'og:type': 'website', 'og:site_name': 'Prompt Gallery', 'og:locale': 'ko_KR',
    'og:title': title, 'og:description': description, 'og:url': url,
    'og:image': image, 'og:image:secure_url': image, 'og:image:type': 'image/jpeg',
    'og:image:width': '1200', 'og:image:height': '600', 'og:image:alt': imageAlt,
  };
  return [
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    ...Object.entries(tags).map(([key, value]) => `<meta property="${key}" content="${escapeHtml(value)}">`),
    '<meta name="twitter:card" content="summary_large_image">',
    ...Object.entries({ title, description, image, 'image:alt': imageAlt }).map(([key, value]) => `<meta name="twitter:${key}" content="${escapeHtml(value)}">`),
  ].join('\n  ');
}
