# Prompt Gallery

내 사진을 첨부해 변환하는 프롬프트 갤러리입니다. 첨부 예시와 결과를 보고, 프롬프트를 복사해 ChatGPT에 사진과 함께 보내면 됩니다. 카드에서 즉시 복사, 이미지 확대, 검색과 카테고리, 정렬, 브라우저 북마크를 지원합니다. 제작 과정과 버전 이력은 Git으로 관리합니다.

HTML, CSS, JavaScript만 사용하는 정적 사이트입니다. 런타임 서버, API 키, 데이터베이스, 외부 이미지 호스팅이 필요하지 않습니다.

## 로컬 실행

Node.js 22 이상에서 다음 명령을 사용합니다. 빌드 시 결과 이미지를 공유용 JPEG로 변환하기 위해 Sharp를 사용합니다.

```sh
npm ci
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

상세 공유 링크는 `prompts/handcrafted-diorama/`처럼 프롬프트별 정적 페이지를 사용합니다. 빌드가 각 페이지의 Open Graph 메타태그와 실제 결과 이미지로 만든 1200×600 JPEG를 생성하므로, 카카오톡에서도 제목과 결과 이미지를 읽을 수 있습니다. 세로 이미지는 잘리지 않도록 여백을 넣습니다. 이미지 파일명에 원본 해시를 넣어 결과 교체 시 이미지 캐시도 갱신됩니다. 기존 `#prompt=...` 링크도 계속 열리며, 상세의 링크 복사 버튼은 새 공유 주소를 복사합니다. PR에서는 테스트와 빌드만 실행합니다.

기본 공유 도메인은 `https://q07k.github.io/prompt-gallery/`이며, 다른 도메인에 배포한다면 `SITE_URL` 환경변수에 사이트 루트 주소를 지정하고 빌드하세요. 카카오톡에 예전 미리보기가 남아 있다면 [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 해당 URL의 캐시를 초기화한 뒤 새 메시지로 보내세요. 이미 보낸 메시지의 카드는 갱신되지 않을 수 있습니다.

워크플로는 [GitHub의 공식 Pages 배포 안내](https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically)를 따릅니다.

## 프롬프트 추가

1. `assets/images/`에 첨부 예시, 결과 이미지, 가벼운 썸네일을 넣습니다. WebP 형식을 권장합니다.
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
- `inputRequirement`: 인물 사진은 `"portrait"`, 일반 사진은 `"image"`. 모든 항목에 사진 첨부가 필요합니다.
- `referenceImages`: 공개할 첨부 예시 이미지의 로컬 경로 배열. 최소 1개가 필요합니다.
- `order`: 작은 숫자가 먼저 보입니다. 기존 항목을 수정하면 Git에 변경 이력이 남습니다.
- `sample: false`: 직접 작성한 게시물은 상세의 커뮤니티 샘플 표시가 없어집니다.

## 샘플과 출처

직접 등록한 `handcrafted-diorama`는 사용자가 제공한 한국어 프롬프트를 원문 그대로 보관합니다. 내장 이미지 생성 도구로 제주 감성의 가상 돌집·귤나무 레퍼런스를 먼저 만들고, 그 이미지를 첨부해 등록된 프롬프트만으로 미니어처 결과를 생성했습니다. 레퍼런스는 실제 장소를 촬영한 사진이 아니며, 결과 속 지명과 표지판도 생성된 표현입니다. 상세 화면에서 예시 레퍼런스를 열어 저장하거나 본인의 풍경·건물·사물 사진으로 바꿔 사용할 수 있습니다.

결과는 `assets/images/handcrafted-diorama.webp`, 레퍼런스는 `assets/images/handcrafted-diorama.reference.webp`, 카드용 썸네일은 `assets/images/handcrafted-diorama.thumb.webp`에 보관합니다.

현재 공개 항목은 기존 디오라마와 새로 만든 사진 변환 프롬프트 6개, 총 7개입니다. 새 항목의 첨부 예시와 결과는 내장 이미지 생성 도구로 직접 생성했습니다. 각 변환에는 갤러리에 표시된 1~2문장의 프롬프트를 그대로 사용했습니다.

[전체 프롬프트·예시·스타일 참고 출처](docs/photo-transform-prompts.md)를 확인할 수 있습니다. 이전 커뮤니티 샘플과 사용하지 않는 이미지 파일은 공개 목록에서 제거했습니다. 초기 참고 컬렉션의 CC0 문서는 `licenses/sample-collection-CC0.txt`에 보관합니다.

북마크는 `localStorage`에 저장됩니다. 브라우저와 기기 사이의 동기화는 하지 않습니다.
