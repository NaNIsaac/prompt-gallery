import { escapeHtml } from './social.mjs';
import { promptUrl } from '../src/sharing.mjs';

import { searchGuides } from '../src/search-guides.mjs';

const e = escapeHtml;
const ordered = prompts => [...prompts].sort((a, b) => a.order - b.order);

export function renderStaticCatalog(prompts) {
  return `<details open id="static-content" class="static-content" aria-label="사진 변환 프롬프트 목록">
    <summary>전체 프롬프트 목록 보기</summary><h2>사진 변환 프롬프트 모음</h2>
    <p>원본 사진과 AI 변환 결과를 비교하고, 필요한 사진과 사용 방법을 확인하세요.</p>
    <ul class="static-catalog">${ordered(prompts).map(prompt => `<li><a href="./prompts/${encodeURIComponent(prompt.id)}/"><img src="./${e(prompt.thumbnail)}" alt="${e(prompt.title)} — AI 변환 결과" width="${prompt.width}" height="${prompt.height}" loading="lazy"><h3>${e(prompt.title)}</h3></a><p>${e(prompt.inputLabel)}</p></li>`).join('\n')}</ul>
  </details>`;
}

export function renderStaticPrompt(prompt, prompts) {
  const examples = prompt.examples || [{ label: '변환 예시', image: prompt.image, width: prompt.width, height: prompt.height, referenceImages: prompt.referenceImages, note: prompt.exampleNote }];
  return `<details open id="static-content" class="static-content" aria-label="${e(prompt.title)} 사용 방법과 예시">
    <summary>${e(prompt.title)} — 사용법과 예시</summary>
    <p><a href="../../">전체 프롬프트 둘러보기</a> · ${e(prompt.category)}</p>
    <h2>사용 방법</h2>
    <p>${e(prompt.inputLabel)}</p><p>${e(prompt.usage)}</p>
    <ol><li>안내에 맞는 사진 한 장을 준비하세요.</li><li>사진과 아래 프롬프트 원문을 ChatGPT에 함께 보내세요.</li></ol>
    <h2>원본 사진과 AI 변환 결과</h2>
    ${examples.map(example => `<article class="static-example"><h3>${e(example.label)}</h3><div class="static-image-pair">${example.referenceImages.map((path, index) => `<figure><img src="../../${e(path)}" alt="${e(prompt.title)} — ${e(example.label)}의 입력 사진 ${index + 1}" loading="lazy"><figcaption>입력 사진 ${index + 1}</figcaption></figure>`).join('')}<figure><img src="../../${e(example.image)}" alt="${e(prompt.title)} — ${e(example.label)}의 AI 변환 결과" width="${example.width}" height="${example.height}" loading="lazy"><figcaption>AI 변환 결과</figcaption></figure></div>${example.note ? `<p>${e(example.note)}</p>` : ''}</article>`).join('\n')}
    ${renderSearchGuide(prompt)}
    <h2>프롬프트 원문</h2><pre class="static-prompt">${e(prompt.prompt)}</pre>
    <p>작성: ${e(prompt.author)} · <a href="${e(prompt.sourceUrl)}" rel="noopener noreferrer">원본 출처</a></p>
    <h2>같은 카테고리의 프롬프트</h2>
    <ul>${ordered(prompts).filter(item => item.id !== prompt.id && item.category === prompt.category).slice(0, 6).map(item => `<li><a href="../${encodeURIComponent(item.id)}/">${e(item.title)}</a></li>`).join('')}</ul>
  </details>`;
}

export function renderSearchGuide(prompt) {
  const guide = searchGuides[prompt.id];
  if (!guide) return '';
  return '<section class="prompt-guide" aria-label="사진 준비와 결과 안내"><h2>' + e(guide.title) + '</h2><p>' + e(guide.intro) + '</p>' + guide.sections.map(section => '<h3>' + e(section.heading) + '</h3><p>' + e(section.body) + '</p>').join('') + '</section>';
}

export function renderSitemap(prompts, siteRoot) {
  const urls = [new URL(siteRoot).href, ...ordered(prompts).map(prompt => promptUrl(prompt.id, siteRoot))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${e(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
}
