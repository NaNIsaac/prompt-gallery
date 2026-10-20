# Cloudflare Pages 운영

운영 주소: https://q07k-prompt-gallery.pages.dev/
코드 저장소: https://github.com/Q07K/prompt-gallery

## 새 세션과 운영 현황 확인

현재 로컬 브랜치의 README나 과거 Actions 성공 기록만으로 운영 환경을 판단하지 않는다. [저장소 시작 지침](../AGENTS.md)에 따라 원본 저장소의 최신 기본 브랜치를 fetch하고 그 ref의 이 문서와 CI 구성을 읽는다. 오래된 콘텐츠 브랜치는 그대로 보존한다. 설정 확인과 실제 배포 성공은 구분하고, 배포 성공은 Cloudflare에서 운영 브랜치 main의 커밋 SHA와 상태를 확인한다.

이관 후에는 새 세션이 여는 기본 프로젝트 폴더에도 이 운영 문서와 시작 지침을 반영한다. 사이트맵 오류나 색인 상태는 별도로 실제 Search Console 결과를 확인하며 이 문서를 성공 증빙으로 사용하지 않는다.

## 자동 배포

Cloudflare Pages의 GitHub 연동에서 main을 운영 브랜치로 설정한다. 빌드 명령은 `npm test && npm run build`, 출력 디렉터리는 `dist`, 환경 변수는 NODE_VERSION=22, SITE_URL=https://q07k-prompt-gallery.pages.dev/ 이다.
GitHub Actions의 필수 CI는 단위 검사·빌드·데스크톱/모바일 브라우저 검사를 수행한다. main 보호 규칙의 CI를 통과한 PR만 병합하며 우회하지 않는다. Cloudflare가 main 커밋을 감지해 자체 빌드 후 배포한다. 프리뷰는 별도 주소이고 운영 분석 수집·색인을 끈다.

## 분석과 SEO

기존 GA4 속성 559520260, 스트림 16158654707, 측정 ID G-FJ0FKHBV1X를 유지한다. 웹 스트림 주소를 새 주소로 변경한다. 기존 이벤트와 맞춤 정의를 그대로 사용하고 다른 태그를 중복 설치하지 않는다.
Search Console은 새 URL 접두어 속성을 HTML 태그로 인증하고 sitemap.xml을 제출한다. 기존 속성과 데이터는 보존한다. 사이트맵 제출과 수집 성공, 페이지 색인과 검색 유입은 각각 확인한다.

## 운영 주소 기준

공개 주소와 공유 링크, GA4 웹 스트림, canonical, robots.txt와 sitemap.xml은 https://q07k-prompt-gallery.pages.dev/ 를 기준으로 관리한다. GitHub Pages는 게시를 중지하며 이전 GitHub 주소용 리다이렉트·인증 태그·배포 워크플로를 운영하지 않는다. Search Console의 과거 속성 및 GA4의 기존 기록은 보존한다.

브라우저 북마크는 origin별 localStorage에 저장된다.

## 비용과 확장

초기에는 Pages 무료 플랜과 기존 로컬 WebP 이미지를 사용한다. R2 구독·유료 플랜·도메인 구매는 이 이관에 포함하지 않는다. 큰 이미지의 저장소 분리는 후속 작업이다.
