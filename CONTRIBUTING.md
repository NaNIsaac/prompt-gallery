# 기여 안내

[개발 문서 목차](docs/README.md)와 [프롬프트 작업 스킬](.agents/skills/prompt-gallery-workflow/SKILL.md)을 시작점으로 사용하세요. 이 스킬은 저장소에 포함되어 clone 또는 fork로 함께 받습니다. 최신 기준은 원본 저장소의 기본 브랜치입니다.

## Codex에서 같은 스킬 사용하기

저장소 폴더를 Codex에서 열고 다음처럼 요청할 수 있습니다.

```text
$prompt-gallery-workflow 이 아이디어로 프롬프트를 만들고 가상 사진으로 시험해줘.
$prompt-gallery-workflow 최종 문구와 예시를 갤러리에 추가하고 기여 PR을 제출해줘.
```

기여자는 PR 제출까지, 담당자는 실제 권한과 병합·배포 요청이 확인된 경우 검토 이후 단계까지 진행합니다. 스킬을 받는 것만으로 GitHub 병합·배포 권한이 생기지는 않습니다. 이미지 생성 도구가 없는 환경에서는 이미 준비된 실제 원본·결과·입력 기록으로 등록 작업을 진행하거나, 생성 테스트가 아직 수행되지 않았음을 명시하세요. 가상·미생성 자료를 시험 완료 예시로 등록하지 않습니다.

## 일반 기여자

1. 원본 저장소에 직접 push할 권한이 없으면 본인 계정으로 fork하고 그 복사본에서 작업합니다. origin이 본인 fork인지, upstream이 원본 프로젝트인지 실제 URL을 확인하세요. 원본과 fork를 혼동하지 않습니다.
2. 원본 프로젝트의 최신 기본 브랜치를 fetch하고 codex/작업명 등 목적이 드러나는 전용 브랜치를 만듭니다. 기존의 다른 작업 변경은 보존하세요.
3. 새 환경에서는 npm ci와 npx playwright install chromium을 실행합니다. 프롬프트나 이미지 추가는 [등록 원칙](docs/prompt-publishing.md)에 따라 실제 원본·문구·결과와 한계를 연결하고 author에 실제 기여자를 표시하세요.
4. npm run check를 실행하고 관련 파일만 커밋합니다. 본인 fork의 작업 브랜치에 push한 뒤 원본 Q07K/prompt-gallery의 main을 대상으로 PR을 제출하세요. base 저장소와 head 저장소·브랜치를 확인합니다.
5. PR에 변경 내용·검증 결과·원본과 결과·생성 기록·한계를 적습니다. CI 실패는 같은 브랜치에서 수정합니다. 외부 fork의 Actions가 담당자 승인 대기이면 그 상태를 남기고 검토를 기다립니다.
6. PR 제출과 담당자 검토 대기까지가 기여자의 완료 범위입니다. 미병합 브랜치는 후속 수정을 위해 남겨 둡니다. 실제 병합·배포·공개 확인 후 자신의 브랜치를 안전하게 정리할 수 있습니다.

GitHub CLI를 쓰는 fork 흐름 예시입니다. 이미 upstream이 있으면 다시 추가하지 않고, 원격 URL과 실제 기본 브랜치가 다르면 확인한 값으로 사용하세요.

```sh
git remote -v
git remote add upstream https://github.com/Q07K/prompt-gallery.git
git fetch upstream main
git switch -c codex/my-photo-prompt upstream/main
# 변경과 검증 후 본인 fork로 push
git push -u origin codex/my-photo-prompt
gh pr create --repo Q07K/prompt-gallery --base main --head YOUR_LOGIN:codex/my-photo-prompt
```

GitHub CLI가 없으면 웹이나 연결된 GitHub 도구로 동일한 base와 head를 선택해 제출할 수 있습니다.

## 프로젝트 담당자

담당자도 요청 범위를 따릅니다. 검토만 요청받았으면 검토 결과까지 보고하고, 명시적인 병합·배포 요청이 있을 때 다음 게시 단계를 진행합니다.

1. 요청된 PR의 원본·문구·예시·출처와 변경 범위를 검토합니다. 외부 fork의 workflow 실행 승인이 필요하면 변경을 먼저 검토하고 실행을 승인하세요. [GitHub의 승인 절차](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/approve-runs-from-forks)를 따릅니다.
2. 현재 PR head의 필수 CI 통과와 병합 가능 상태를 확인한 뒤 main에 병합합니다. 다른 사람의 별도 승인 요구가 없는 이 프로젝트에서도 필수 CI는 유지합니다.
3. 병합 커밋의 CI와 Pages deploy 성공, 공개 상세·카탈로그·이미지를 확인합니다. 실행을 시작했다는 이유로 배포 완료라고 보고하지 않습니다.
4. 이번 작업에서 자신이 만든 브랜치와 임시 작업 공간만 정리합니다. 외부 기여자의 fork 브랜치를 임의로 삭제하지 않습니다.

원격 보호 규칙을 임의로 해제하거나 검증 실패를 우회하지 않습니다. 사용자나 다른 기여자의 별도 변경·미추적 파일을 커밋에 섞지 않습니다. 신규 항목은 위에 배치하되 기존 항목의 상대 순서를 유지합니다.
