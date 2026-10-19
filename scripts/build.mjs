import { cp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { readCatalog, projectRoot } from './validate.mjs';
import { createSocialImage, socialTags, escapeHtml } from './social.mjs';
import { promptUrl } from '../src/sharing.mjs';
import { renderStaticCatalog, renderStaticPrompt, renderSitemap } from './static-content.mjs';

const prompts = await readCatalog();
const output = resolve(projectRoot, 'dist');
if (relative(projectRoot, output) !== 'dist') throw new Error('Build output must be the project dist directory.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'src', 'data', 'assets', 'licenses']) {
  await cp(resolve(projectRoot, file), resolve(output, file), { recursive: true });
}
await writeFile(resolve(output, '.nojekyll'), '');
const siteUrl = new URL(process.env.SITE_URL || 'https://q07k.github.io/prompt-gallery/');
if (siteUrl.protocol !== 'https:' || siteUrl.search || siteUrl.hash) throw new Error('SITE_URL must be an HTTPS site root without a query or hash.');
if (!siteUrl.pathname.endsWith('/')) siteUrl.pathname += '/';
const template = await readFile(resolve(projectRoot, 'index.html'), 'utf8');
const images = new Map();
for (const prompt of prompts) images.set(prompt.id, await createSocialImage(prompt, projectRoot, output));
const featured = [...prompts].sort((a, b) => a.order - b.order)[0];
const tagsFor = (prompt, url, title, description) => socialTags({
  title, description, url, image: new URL(images.get(prompt.id), siteUrl).href,
  imageAlt: `${prompt.title} — AI 생성 결과 예시`,
});
const homeTitle = /<title>(.*?)<\/title>/.exec(template)[1];
const homeDescription = /<meta name="description" content="(.*?)">/.exec(template)[1];
await writeFile(resolve(output, 'index.html'), template.replace('<!-- static-content -->', renderStaticCatalog(prompts)).replace('</head>', `  ${tagsFor(featured, siteUrl.href, homeTitle, homeDescription)}\n</head>`));
for (const prompt of prompts) {
  const title = `${prompt.title} — Prompt Gallery`;
  const description = `${prompt.inputLabel || '사진 1장 필요'}. ${prompt.usage}`;
  const page = template
    .replace('<!-- static-content -->', renderStaticPrompt(prompt, prompts))
    .replace(/(<h1 id="page-title">)[\s\S]*?(<\/h1>)/, (_, start, end) => start + escapeHtml(prompt.title) + end)
    .replace(/(href|src)="\.\//g, '$1="../../')
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${escapeHtml(description)}">`)
    .replace('</head>', `  ${tagsFor(prompt, promptUrl(prompt.id, siteUrl), title, description)}\n</head>`);
  const directory = resolve(output, 'prompts', prompt.id);
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'index.html'), page);
}
await writeFile(resolve(output, 'sitemap.xml'), renderSitemap(prompts, siteUrl));
console.log(`Built ${prompts.length} prompts with individual sharing pages and JPEG previews into dist/.`);
