# 리팩토링 실행 계획

기준일: 2026-06-24

## 목표

기존 기능과 저장 데이터 호환성을 유지하면서 남은 리팩토링 후보를 모두 작은 단위로 닫는다. 각 단계는 테스트를 먼저 고정하고, 구현 후 `lint`, Vitest, Playwright E2E를 통과해야 완료로 본다.

## 범위

1. `BossDataManager.setBossSchedule()` 의미 분리
   - 현재 이름은 전체 schedule 교체처럼 보이지만 실제로는 numeric schedule id의 alert/memo update만 수행한다.
   - 새 내부 의도는 `updateExistingScheduleState()`와 `replaceBossSchedule(gameId, items)`로 분리하고, 기존 public API는 입력 shape에 따라 두 경로로 라우팅하는 호환 wrapper로 유지한다.
   - `commitDraft()`/DB replace 흐름은 기존 동작 그대로 둔다.

2. silent parse fallback 명시화
   - `db.js`와 draft load의 JSON parse 실패가 조용히 `null`로 떨어지는 경로를 테스트로 고정한다.
   - 데이터 보호용 empty-state fallback은 유지하되, parse 실패는 `console.error`로 증거를 남긴다.
   - localStorage key와 반환값 호환성은 유지한다.

3. timetable/export 중복 제거
   - `renderTimetableList()`와 `renderExportCapture()`의 데이터 수집, dateRange, nextBossOnly, 정렬, name width 계산을 하나의 view model helper로 합친다.
   - 화면 렌더러와 export 렌더러는 컨테이너 클래스/폭 정책 차이만 유지한다.
   - 출력 HTML 구조와 E2E 시나리오는 유지한다.

## Fallback 분류

| 발견 | 분류 | 조치 |
|---|---|---|
| `db.load()` JSON parse 실패 시 `null` | masking fallback slop | 반환값은 유지하되 오류 로그를 남겨 원인 추적 가능하게 변경 |
| `loadDraftFromLs()` JSON parse 실패 시 `null` | masking fallback slop | 반환값은 유지하되 game id와 함께 오류 로그를 남김 |
| `setBossSchedule()` 이름/동작 불일치 | boundary violation | 의도 이름을 가진 내부 함수로 분리하고 public wrapper는 호환 유지 |
| timetable/export 중복 | duplication | 공통 view model helper로 병합 |

## 검증 계획

- 사전 테스트 고정:
  - `db.test.js`: DB parse 실패 로그와 empty fallback 확인
  - `data-managers.test.js`: draft parse 실패 로그, `setBossSchedule()`이 기존 numeric id update와 신규 schedule replace를 모두 명확히 처리하는지 확인
  - `data-managers.test.js`: numeric id update는 `alerted_*`/`memo`만 바꾸고 `scheduledDate`/`bossId`는 유지하는지 확인
  - `ui-renderer.timetable.test.js`: `renderTimetableList()`와 `renderExportCapture()`가 같은 필터·정렬·escape·fixed alarm 병합 기준을 공유하는지 확인
  - `ui-renderer.timetable.test.js`: 화면과 export의 name width 산식 차이는 의도된 레이아웃 차이로 유지되는지 확인
- 구현 후 게이트:
  - `npm run lint`
  - `npm test`
  - `npm run e2e`
  - OMC/OMX verifier 재검증

## 완료 조건

- 남은 세 후보가 코드와 문서에서 완료 상태로 반영된다.
- `docs/architecture/system_module_details.md`의 `setBossSchedule()` 설명이 실제 public wrapper 의미와 맞는다.
- 자동 검증 실패 0건.
- E2E 스크린샷은 `screenshots/e2e/`에 생성되고 Git 추적에서 제외된다.

## 적용 결과

- `setBossSchedule()`은 `updateExistingScheduleState()`와 `replaceBossSchedule(gameId, items)`로 내부 의도를 분리했다.
- `db.js`와 draft loader의 JSON parse 실패는 기존 empty fallback을 유지하되 `console.error`로 key/game id와 원인을 남긴다.
- `renderTimetableList()`와 `renderExportCapture()`는 공통 시간표 view model 및 카드/표 HTML helper를 공유한다.
- 회귀 테스트는 `test/db.test.js`, `test/data-managers.test.js`, `test/ui-renderer.timetable.test.js`에 추가했다.
