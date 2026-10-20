# Cloudflare Pages 운영

운영 주소: https://q07k-prompt-gallery.pages.dev/
코드 저장소: https://github.com/Q07K/prompt-gallery

## 자동 배포

Cloudflare Pages의 GitHub 연동에서 main을 운영 브랜치로 설정한다. 빌드 명령은 `npm test && npm run build`, 출력 디렉터리는 `dist`, 환경 변수는 NODE_VERSION=22, SITE_URL=https://q07k-prompt-gallery.pages.dev/ 이다.
GitHub Actions의 필수 CI는 단위 검사·빌드·데스크톱/모바일 브라우저 검사를 수행한다. main 보호 규칙의 CI를 통과한 PR만 병합하며 우회하지 않는다. Cloudflare가 main 커밋을 감지해 자체 빌드 후 배포한다. 프리뷰는 별도 주소이고 운영 분석 수집·색인을 끈다.

## 분석과 SEO

기존 GA4 속성 559520260, 스트림 16158654707, 측정 ID G-FJ0FKHBV1X를 유지한다. 웹 스트림 주소를 새 주소로 변경한다. 기존 이벤트와 맞춤 정의를 그대로 사용하고 다른 태그를 중복 설치하지 않는다.
Search Console은 새 URL 접두어 속성을 HTML 태그로 인증하고 sitemap.xml을 제출한다. 기존 속성과 데이터는 보존한다. 사이트맵 제출과 수집 성공, 페이지 색인과 검색 유입은 각각 확인한다.

## 이전 주소

새 운영 사이트를 검증한 다음에만 Actions의 Publish legacy GitHub Pages redirects를 main에서 수동 실행한다. 기존 루트와 상세별 HTML을 가벼운 이동 안내로 바꾸며 canonical·즉시 meta refresh·JavaScript replace를 사용한다. 기존 #prompt= 링크와 query/hash를 보존한다. 이는 HTTP 301이 아니다. 기존 사이트용 이미지·GA4 태그는 이동 안내에 배포하지 않는다. 이후 콘텐츠 CD는 Cloudflare가 담당한다.
기존 브라우저 북마크는 origin별 localStorage라 새 도메인으로 자동 이전되지 않는다.

## 비용과 확장

초기에는 Pages 무료 플랜과 기존 로컬 WebP 이미지를 사용한다. R2 구독·유료 플랜·도메인 구매는 이 이관에 포함하지 않는다. 큰 이미지의 저장소 분리는 후속 작업이다.
