# Prompt Gallery

결과 이미지를 둘러보고 마음에 들면 프롬프트를 바로 복사하는 이미지 갤러리입니다. 카드에서 즉시 복사, 이미지 확대, 검색과 카테고리, 사진 활용 필터, 브라우저 북마크를 지원합니다. 제작 과정과 버전 이력은 Git으로 관리합니다.

HTML, CSS, JavaScript만 사용하는 정적 사이트입니다. 런타임 서버, API 키, 데이터베이스, 외부 이미지 호스팅이 필요하지 않습니다.

## 로컬 실행

Node.js 22 이상에서 다음 명령을 사용합니다. 설치할 패키지는 없습니다.

```sh
npm run dev
```

`http://127.0.0.1:4173/`에서 열립니다. 사이트는 모듈과 JSON을 읽으므로 파일을 더블클릭하는 대신 HTTP로 실행하세요.

```sh
npm test
npm run build
npm run preview
```

GitHub Pages와 같은 하위 경로에서도 확인할 수 있습니다.

```sh
node scripts/serve.mjs --dist --base /prompt-gallery/ --port 4174
```

## GitHub Pages 배포

1. GitHub 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
2. `main` 브랜치에 푸시하면 `.github/workflows/pages.yml`이 테스트, 정적 파일 빌드, Pages 배포를 순서대로 수행합니다.
3. Actions의 배포 작업에 표시된 URL에서 확인합니다. 이 저장소의 기본 주소는 `https://q07k.github.io/prompt-gallery/`입니다.

이미지, 모듈, JSON은 모두 상대 경로를 사용합니다. 상세 공유 링크는 `#prompt=mini-me`처럼 해시를 사용하므로 Pages에서 직접 열거나 새로고침해도 서버 라우팅이 필요하지 않습니다. PR에서는 테스트와 빌드만 실행합니다.

워크플로는 [GitHub의 공식 Pages 배포 안내](https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically)를 따릅니다.

## 프롬프트 추가

1. `assets/images/`에 결과 이미지와 가벼운 썸네일을 넣습니다. WebP 형식을 권장합니다.
2. `data/prompts.json` 배열에 아래 구조의 항목을 추가합니다.
3. `npm test`와 `npm run build`로 데이터와 파일 경로를 확인합니다.

```json
{
  "id": "my-first-prompt",
  "title": "나의 첫 이미지",
  "category": "캐릭터",
  "tags": ["3D", "피규어"],
  "image": "assets/images/my-first-prompt.webp",
  "thumbnail": "assets/images/my-first-prompt.thumb.webp",
  "width": 1024,
  "height": 1536,
  "color": "#a2b3c4",
  "prompt": "첨부한 사진의 인물을 3D 피규어로 만들어 주세요...",
  "inputRequirement": "portrait",
  "usage": "인물 사진 1장을 첨부하고 프롬프트를 붙여넣으세요.",
  "referenceImages": ["assets/images/my-first-reference.webp"],
  "author": "@Q07K",
  "sourceUrl": "https://github.com/Q07K/prompt-gallery",
  "sample": false,
  "order": -1
}
```

- 카테고리: `인물`, `캐릭터`, `일러스트`, `제품`, `포스터`, `아트·밈`.
- `inputRequirement`: 인물 사진은 `"portrait"`, 일반 사진은 `"image"`, 텍스트만 쓰는 프롬프트는 `null`.
- `referenceImages`: 공개할 레퍼런스 이미지의 로컬 경로 배열. 없으면 `[]`.
- `order`: 작은 숫자가 먼저 보입니다. 기존 항목을 수정하면 Git에 변경 이력이 남습니다.
- `sample: false`: 직접 작성한 게시물은 상세의 커뮤니티 샘플 표시가 없어집니다.

## 샘플과 출처

초기 16개 항목은 [EvoLinkAI의 공개 프롬프트 컬렉션](https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts)에서 선별한 커뮤니티 샘플입니다. 원문 프롬프트, 작성자, 원본 게시물 링크를 각 항목에 보관했습니다. 한국어 제목과 탐색용 태그는 이 갤러리를 위해 추가했습니다. 이 프로젝트에서 직접 생성하거나 재검증한 결과로 표시하지 않습니다.

원본 컬렉션의 CC0 라이선스는 `licenses/sample-collection-CC0.txt`에 보관합니다. 일부 원본에는 브랜드나 서명이 포함되어 있으며 이미지는 해당 공개 예시 그대로입니다. 샘플은 본인의 결과와 프롬프트로 교체할 수 있습니다.

북마크는 `localStorage`에 저장됩니다. 브라우저와 기기 사이의 동기화는 하지 않습니다.
