# GA4 이용 통계

GitHub Pages는 그대로 유지하고 브라우저에서 Google Analytics 4 표준 속성으로 이벤트를 보낸다. 별도 API 서버, DB, BigQuery 연결은 사용하지 않는다.

## 연결 정보

- 속성: Prompt Gallery (`559520260`), 기존 F7project 계정 아래 별도 속성
- 웹 스트림: Prompt Gallery Web (`16158654707`)
- 측정 ID: `G-FJ0FKHBV1X`
- 시간대: 대한민국 (GMT+09:00), 통화: KRW
- [맞춤 정의 관리](https://analytics.google.com/analytics/web/#/a248557085p559520260/admin/customdefinitions/hub)
- 이벤트 범위 맞춤 측정기준 5개 등록 완료. 수집은 코드의 Pages 배포 후 시작하며 실제 유입 확인은 별도 단계다.

## 연결

`src/analytics-config.mjs`에 웹 스트림의 공개 측정 ID(`G-…`)와 실제 사이트 루트를 설정한다. 측정 ID는 비밀 키가 아니다. `siteUrl`의 origin과 경로 안에서만 태그를 실행하므로 로컬 개발·테스트·다른 도메인의 fork는 수집하지 않는다. ID를 빈 문자열로 바꾸면 수집을 끌 수 있다. 도메인이나 Pages 경로를 바꿀 때 이 설정도 함께 변경한다.

GA4 웹 스트림의 **향상된 측정은 끈다.** 문서 로드당 `page_view` 한 번과 아래 앱 이벤트를 직접 전송한다. 상세 모달의 history 변경은 추가 페이지 조회로 세지 않고 `prompt_open`으로 센다. 다른 태그나 GTM에서 같은 ID를 중복 설치하지 않는다.

## 수집 항목

| 이벤트 | 의미 |
|---|---|
| `prompt_impression` | 카드 이미지가 50% 이상 1초 연속 보임. 문서 방문당 프롬프트·둘러보기/저장 목록 조합별 1회. 필터 재렌더는 중복 집계하지 않음 |
| `prompt_open` | 상세 열기·다른 프롬프트로 이동·직접 상세 접속. 같은 상세의 중복 동기화는 제외 |
| `prompt_copy` | 프롬프트 클립보드 쓰기 성공. 수동 복사 안내·실패는 제외 |
| `prompt_save` / `prompt_unsave` | 북마크 추가·제거. 브라우저 저장 제한 시 이번 방문의 상태 변경도 포함 |
| `prompt_link_copy` | 공유 URL의 클립보드 쓰기 성공. 외부 전송이나 결과물 공유 완료를 의미하지 않음 |

이벤트 매개변수는 `prompt_id`, `prompt_title`, `prompt_category`, `surface`(card/detail/direct/navigation), `gallery_view`(explore/saved), `card_position`(현재 목록에서 1부터 시작)이다. 사진·검색어·프롬프트 원문·클립보드 내용은 앱 분석 매개변수로 보내지 않는다. 페이지와 referrer URL에서 query/hash를 제거하고 광고 개인화 신호·Google signals를 사용하지 않는다. GA4 자체의 기본 방문·기기 정보 수집과 쿠키 동작은 Google의 정책을 따른다. 브라우저의 DNT 또는 Global Privacy Control이 켜져 있으면 태그를 로드하지 않는다. 갤러리 소개에서 수집 내용을 안내한다.

탭이 숨겨지거나 상세/소개 모달이 카드를 가리면 노출 타이머를 취소한다. 스크립트 차단이나 추적 거부로 모든 사용자의 행동을 수집할 수는 없다.

## GA4 관리 화면

관리 → 데이터 표시 → 맞춤 정의에서 다음 **이벤트 범위** 맞춤 측정기준을 등록한다.

| 이름 | 이벤트 매개변수 |
|---|---|
| 프롬프트 ID | `prompt_id` |
| 프롬프트 제목 | `prompt_title` |
| 프롬프트 카테고리 | `prompt_category` |
| 행동 위치 | `surface` |
| 갤러리 화면 | `gallery_view` |

필요하면 맞춤 측정항목으로 `card_position`(표준 단위)을 등록한다. `prompt_copy`를 주요 이벤트로 지정하면 사용 의향을 대표하는 지표로 볼 수 있다. 실제 생성 완료를 뜻하지는 않는다.

실시간 보고서에서 이벤트 유입을 확인한다. 맞춤 측정기준을 이용하는 일반 보고서에는 처리 시간이 필요하다. 검증용 DebugView는 별도 로컬 테스트 설정의 `debug: true`와 테스트용 측정 ID로 사용한다. 실제 운영 ID로 로컬 테스트를 켜지 않는다. 자동 테스트는 가짜 Google 태그를 사용해 외부 전송 없이 이벤트를 확인한다.

## 해석

탐색에서 행에 프롬프트 제목/ID, 열에 이벤트 이름, 값에 이벤트 수 또는 총 사용자를 두고 비교한다. 카드 유입을 비교하려면 `gallery_view=explore` 및 카드에서 발생한 열람만 보며, 직접 상세 유입과 저장 목록 유입을 섞지 않는다. 노출은 문서당 중복 제거하지만 복사·열람은 반복 가능하므로 단순 이벤트 수의 비율이 항상 100% 이하인 전환율은 아니다. 엄밀한 전환율은 탐색의 사용자 기준 퍼널로 `prompt_impression → prompt_open → prompt_copy`를 동일 프롬프트에 한정해 비교한다. 카드에서 바로 복사하는 경로도 별도로 본다.

이 통계는 관심과 복사 행동을 보여준다. 외부 이미지 생성, 결과 만족도, 실제 결과물 공유는 직접 관측하지 못하므로 별도 사용자 테스트나 피드백이 필요하다. 적은 표본의 순위를 확정적인 대중성 평가로 해석하지 않는다.

공식 문서: [이벤트 설정](https://developers.google.com/analytics/devguides/collection/ga4/events), [맞춤 정의](https://support.google.com/analytics/answer/14240153).
