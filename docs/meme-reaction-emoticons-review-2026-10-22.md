# 밈 리액션 임티 9종 — 확정·PR 제출

사용자가 v2 시안을 보고 **결과 확정·PR 제출**을 선택했다. 병합·배포 요청은 아직 없다.

## 원본과 실제 문구
- 원본: [AI 가상 성인 여성](../assets/images/meme-reaction-emoticons.reference.webp)
- 결과: [공개 v2 결과](../assets/images/meme-reaction-emoticons.webp)
- 실제 공개 문구: [prompt v2](meme-reaction-emoticons-prompt-v2.txt)
- 생성 입력·재시도·파일 해시: [생성 기록](image-generation-2026-10-22-meme-reaction-emoticons.json)
- 기준 커밋: bf4c284ac929ffa6c9d43cb874ae3aba6ab87dbf
- base/head 저장소: Q07K/prompt-gallery (origin)
- 브랜치: codex/meme-reaction-emoticons

## 육안 비교
AI 가상 원본·결과 · 가상 성인 여성 사진 한 장에 공개 v2 문구만 적용했습니다. 단발·남색 둥근 안경·보라색 카디건을 아홉 칸에서 유지하고 서로 다른 리액션을 표현했습니다. 흰 배경 정적 시트이며 개별 투명 파일은 아닙니다. 지정한 칸당 15% 여백은 정확하지 않고 일부 글씨·효과선이 경계에 가까워 균등 분할 자르기는 검증하지 않았습니다. 아 예?는 윙크한 표정이며 물결 기호 개수는 장식적으로 표현됐습니다.

v1 투명 시안에 흰 잔점이 많아, v2에서 순백색 배경과 더 넓은 여백을 지정했다. v2는 새로 보정한 시트가 아니라 같은 원본 한 장과 공개 v2 문구만으로 직접 생성했다. 이후 이미지 후편집은 없으며 공개 원본·결과는 무손실 WebP 변환 전후 디코딩 RGBA 픽셀 일치를 검증했다. 썸네일은 비율을 유지해 축소했다.

기존 kakao-emoticons(일반 감정 9종), slang-chat-reactions-2026-10(6종)과 구분되는 새 9종 구성이다. 기존 항목은 수정하지 않고 최솟값보다 작은 order로 위에 추가했다.

## 검증
- npm run check 통과: 단위 검사 34개, 프롬프트 46개 정적 빌드, 데스크톱·모바일 Chromium 검사 54개.
- 기존 카탈로그 45개 항목·상대 순서 보존, 새 order -40.
- 공개 문구와 v2 실제 도구 입력 일치. 자산 치수·SHA-256·문서 링크 검증 통과.
- git diff --check 통과. 자동 검사는 이미지 미적 품질이나 외부 카카오 심사를 판정하지 않는다.

## 후속
Draft PR 담당자 검토 대기. 병합·배포는 별도 요청과 해당 커밋 검증 후 진행한다.
