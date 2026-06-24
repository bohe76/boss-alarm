# 리팩토링 계획

기준일: 2026-06-24

## 목표

기존 기능은 유지하면서 내부 결합도와 사이드 이펙트를 줄인다. 리팩토링은 기능별로 작게 나누고, 각 단계는 변경 전후 같은 테스트와 E2E 시나리오를 통과해야 완료로 본다.

## 현재 구조 요약

- 앱 진입점: `index.html` + `src/app.js`
- 핵심 상태: `src/db.js` localStorage DB, `src/data-managers.js`의 `BossDataManager`/`LocalStorageManager`
- 화면: `src/screens/*.js`
- 렌더링: 대부분 `src/ui-renderer.js`에 집중
- 테스트: `test/*.test.js`, Vitest + jsdom
- E2E: `e2e/baseline.spec.js`, Playwright + headless Chromium
- 현재 검증 결과: `npm test` 162 passed, `npm run lint` passed, `npm run e2e` 3 passed
- E2E 실행 기준과 스크린샷 목록: `docs/guides/e2e_baseline.md`

## 주요 리스크

| 영역 | 관찰 | 리팩토링 위험 |
|---|---|---|
| `src/ui-renderer.js` | 1,275라인, 11개 모듈에서 호출 | 한 화면 수정이 다른 화면 렌더링을 깨기 쉬움 |
| `src/app.js` | 24개 import, 초기화/라우팅/공유 수신/마이그레이션 처리 | 부팅 순서 변경 시 데이터 복구·공유 링크 수신 회귀 가능 |
| `src/data-managers.js` | DB 조회, 48h 확장, draft, fixed alarm wrapper 혼재 | 시간 계산·알림·스케줄 저장 사이드 이펙트가 섞임 |
| `src/screens/timetable.js` | 자동 갱신, 필터, export modal, 화면 복구가 한 파일에 공존 | export 프리뷰와 실제 시간표 상태가 간섭 가능 |
| 전역 브라우저 API | `DOM.` 396회, `document.` 149회, `DB.` 66회, `alert()` 16회 | 테스트 격리와 순수 함수 추출이 어려움 |

## 로직 리뷰 반영

OMX 기반 코드 리뷰와 구조 분석에서 리팩토링 전 선행 정리가 필요한 로직 리스크를 확인했다.

| 우선순위 | 로직 이슈 | 리팩토링 방향 |
|---|---|---|
| High | 사용자 입력 boss name/memo가 `ui-renderer.js`, `logger.js`의 `innerHTML` 경로로 들어갈 수 있음 | 렌더링 전 escaping/DOM API 경계 확립 후 scheduler/share E2E로 고정 |
| High | `BossDataManager.setBossSchedule()`은 numeric schedule id 업데이트만 처리하고, 호출부는 신규/문자열 id schedule을 넘기는 경로가 있음 | public API 의도를 `replace/commit/update`로 분리하고 migration 테스트 추가 |
| Medium | `db.js`/draft load가 parse 실패를 `null`로 삼켜 데이터 손상 원인 추적이 어려움 | 저장소 계층에서 recoverable error와 empty state를 구분 |
| Medium | `screens/boss-scheduler.js`의 `_remainingTimes`, `_memoInputs`, `_isDirty`가 hidden mutable state로 유지됨 | draft view model과 event handler를 분리 |
| Medium | `renderTimetableList()`와 `renderExportCapture()`가 필터/정렬/HTML 생성을 중복 수행 | timetable view model을 하나로 만들고 화면/export renderer만 분리 |
| Low | 런타임 `[DEBUG]` 로그가 남아 테스트 출력과 운영 콘솔을 오염시킴 | 로깅 레벨 또는 개발 전용 guard로 이동 |

## 1차 적용 상태

- 사용자 입력 HTML 경계는 `src/html-utils.js`의 escaping helper와 `test/html-safety.test.js`로 고정했다.
- `logger.js`는 live DOM append에서 `innerHTML`을 사용하지 않도록 정리했다.
- `ui-renderer.js`의 boss name, memo, fixed alarm name, custom list name 등 사용자 입력 출력 경로를 escaping 처리했다.
- `pip-manager.js`의 PiP expanded list boss name 출력 경로를 escaping 처리했다.
- 런타임 `[DEBUG]` 콘솔 출력은 보스 스케줄러 관련 경로에서 제거했다.
- `setBossSchedule()` API 의미 분리, silent parse fallback 명시화, `renderTimetableList()`/`renderExportCapture()` 중복 제거를 완료했다.

## 선행 안전망

1. Playwright E2E baseline은 `e2e/baseline.spec.js`로 도입했다.
2. 정적 서버는 `scripts/serve-static.mjs`, 실행 명령은 `npm run e2e`로 고정했다.
3. 현재 자동 baseline은 대시보드/도움말, 스케줄러→시간표→내보내기→공유, 고정 알림→시간표 병합을 검증한다.
4. 생성 스크린샷은 `screenshots/e2e/`에 저장하고 git 추적에서 제외한다.
5. PiP, Notification, Speech API, 실제 TinyURL, 실제 image export 품질은 headless 자동화 한계가 있으므로 수동 smoke 체크리스트를 병행한다.

## 단계별 리팩토링 계획

### 0단계: 테스트 기반 확장

- Playwright E2E baseline 유지/확장.
- `npm test`, `npm run lint`, `npx playwright test`를 기본 게이트로 고정.
- 테스트 중 남는 `[DEBUG]` 콘솔 출력은 별도 cleanup 후보로 기록한다.

완료 조건: 현재 기능 baseline E2E가 main에서 통과한다. 2026-06-24 기준 `npm run e2e` 3 passed.

### 1단계: 순수 도메인 로직 추출

- `data-managers.js`에서 48시간 확장, GC, Future Anchor Keeper, 다음 보스 계산을 순수 함수로 분리한다.
- 후보 경로: `src/domain/schedule-expansion.js`, `src/domain/boss-status.js`
- 기존 `BossDataManager` public API는 유지하고 내부 구현만 위임한다.

완료 조건: `data-managers.test.js`, `boss-sorting-logic.test.js`, E2E 스케줄러/시간표 통과.

### 2단계: 저장소 경계 정리

- `db.js`는 CRUD와 localStorage 직렬화만 담당하게 유지한다.
- `LocalStorageManager` 호환 wrapper는 설정 전용 모듈로 이동한다.
- draft 저장(`v3_draft_*`)과 app settings 저장을 분리한다.

완료 조건: DB/import/export, draft, fixed alarm 테스트 통과. localStorage key 호환성 유지.

### 3단계: 보스 스케줄러 기능 분리

- `screens/boss-scheduler.js`에서 입력 파싱, draft 동기화, apply 로직을 분리한다.
- `ui-renderer.js`의 scheduler 렌더링 함수를 scheduler 화면 전용 renderer로 이동한다.
- 화면 모듈은 event binding과 화면 생명주기만 담당하게 줄인다.

완료 조건: `boss-scheduler.*.test.js`와 스케줄러 E2E 통과.

### 4단계: 시간표와 내보내기 분리

- 시간표 view model 생성, fixed alarm 병합, card/table HTML 생성을 분리한다.
- export modal 상태 백업/복구를 `screens/timetable.js`에서 별도 controller로 추출한다.
- `renderTimetableList()`와 `renderExportCapture()`의 중복 필터·정렬 로직을 하나로 합친다.

완료 조건: `timetable.test.js`, 내보내기 E2E, 화면 복구 E2E 통과.

### 5단계: 부팅과 공유 수신 단순화

- `app.js`의 `loadInitialData()`를 공유 URL 수신, 로컬 데이터 검증, 샘플 데이터 로드, 마이그레이션 단계로 분리한다.
- v4 `#d=`와 v3 `?v3data=` 수신 호환성은 그대로 유지한다.
- DOM 이벤트 등록은 화면별 init으로 이동하고 `app.js`는 orchestration만 남긴다.

완료 조건: 공유 URL E2E, 최초 방문 E2E, migration 관련 unit/integration 통과.

### 6단계: 알림 런타임 경계 정리

- worker, speech, notification, DB 업데이트를 작은 adapter로 나눈다.
- 알림 발생 판정은 순수 함수로 만들고, 실제 side effect는 adapter에서만 실행한다.
- fixed alarm과 manual boss alarm의 shape 차이를 명시한다.

완료 조건: alarm scheduler 테스트 보강, worker mock 테스트, 알림 수동 smoke 체크 통과.

### 7단계: 렌더러 축소와 dead code cleanup

- `ui-renderer.js`를 dashboard, help/faq, calculator, timetable, scheduler renderer로 분리한다.
- inline style과 debug log는 기능별 테스트가 있는 범위에서만 제거한다.
- 사용되지 않는 compatibility 함수는 참조 검색 후 삭제한다.

완료 조건: 전체 unit/integration/E2E/lint 통과, `ui-renderer.js`가 화면 공통 helper만 남는 상태.

## Fallback 점검

- v3 `?v3data=` 수신 fallback: 구형 공유 링크 호환 목적이 명확하므로 보존. E2E로 고정 필요.
- 데이터 로드 실패 시 alert + 샘플/빈 데이터 fallback: 사용자 보호 목적은 있으나 실패 원인 노출과 테스트가 부족하다. 삭제보다 명시적 에러 경계와 테스트 보강 우선.
- `loadDraftFromLs()`와 `db.load()`의 parse 실패 silent null: masking fallback 후보. 리팩토링 전 로그/복구 정책을 정하고 테스트로 고정해야 한다.
- TinyURL 실패 시 원본 URL fallback: grounded fail-safe로 보존하되 공유 E2E 또는 integration test 필요.

## 작업 원칙

- 한 PR은 한 기능 슬라이스만 다룬다.
- public API와 localStorage key를 바꾸지 않는다. 변경이 필요하면 migration 테스트를 먼저 작성한다.
- 테스트를 먼저 추가하고, 그 다음 추출·삭제를 진행한다.
- 새 추상화는 중복 제거 또는 side effect 격리에 직접 기여할 때만 만든다.
- 각 단계 종료 보고에는 변경 파일, 삭제/단순화 내용, 실행한 테스트, 남은 리스크를 포함한다.

## 권장 실행 순서

1. Playwright E2E baseline 유지 및 누락 시나리오 확장
2. `data-managers.js` 순수 도메인 로직 추출
3. storage/settings/draft 경계 정리
4. boss scheduler 분리
5. timetable/export 분리
6. app bootstrap/share/migration 분리
7. alarm runtime adapter화
8. `ui-renderer.js` 최종 축소와 dead code cleanup
