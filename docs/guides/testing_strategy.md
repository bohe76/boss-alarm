# 테스트 전략 가이드

> 기준: 132 tests / 13 files / vitest + jsdom (2026-04-19 기준)

---

## 1. 현재 테스트 기반(Baseline)

| 항목 | 현황 |
|------|------|
| 테스트 프레임워크 | [Vitest](https://vitest.dev/) v4.x |
| 실행 환경 | jsdom (브라우저 DOM 에뮬레이션) |
| 설정 파일 | `vitest.config.js` |
| 전역 셋업 | `test/setup.js` (Web Worker Mock) |
| 총 테스트 수 | **132 tests** |
| 테스트 파일 수 | **13 files** |
| 실행 명령 | `npm test` (`vitest run`) |

---

## 2. 테스트 레벨 분류

### 2.1 단위 테스트 (Unit)

비즈니스 로직, 유틸리티, 데이터 계층을 독립적으로 검증한다. 외부 의존성은 `vi.mock()`으로 격리한다.

| 테스트 파일 | 대상 모듈 | 주요 검증 항목 |
|---|---|---|
| `test/db.test.js` | `src/db.js` | CRUD, FK 무결성, QuotaExceeded, subscribe/unsubscribe |
| `test/data-managers.test.js` | `src/data-managers.js` | commitDraft, 48h 확장, GC, Future Anchor Keeper, checkAndUpdateSchedule |
| `test/share-encoder.test.js` | `src/share-encoder.js` | v3data 인코딩/디코딩 라운드트립, Date 정규화 |
| `test/calculator.test.js` | `src/calculator.js` | 보스 출현 시각 계산, HH:MM:SS 파싱 |
| `test/crazy-calculator.test.js` | `src/crazy-calculator.js` | 광 계산기 로직 |
| `test/utils.test.js` | `src/utils.js` | padNumber, formatTime, validateBossSchedulerInput, calculateNextOccurrence 등 |
| `test/custom-list-manager.test.js` | `src/custom-list-manager.js` | 커스텀 목록 CRUD |
| `test/boss-sorting-logic.test.js` | (정렬 로직) | 보스 정렬 순서 |

### 2.2 통합 테스트 (Integration)

여러 모듈이 함께 동작하는 흐름을 검증한다. 실제 DB(`src/db.js`)를 사용하고, 외부 렌더러는 모킹한다.

| 테스트 파일 | 검증 흐름 |
|---|---|
| `test/integration-v3.test.js` | 게임 → 보스 → 스케줄 전체 생명주기, FK cascade 삭제, DB.importAll FK 검증 |
| `test/boss-scheduler.init.test.js` | 스케줄러 화면 초기화, EventBus 구독, 게임 선택 상태 복원 |
| `test/boss-scheduler.apply.test.js` | 보스 시각 입력 → Draft 저장 → commitDraft 적용 흐름 |
| `test/timetable.test.js` | 시간표 화면 init/상태 전환 |

### 2.3 UI 테스트 (jsdom 기반)

jsdom 환경에서 DOM 상태와 렌더러 호출을 검증한다. 실제 브라우저 렌더링은 검증하지 않는다.

| 테스트 파일 | 검증 항목 |
|---|---|
| `test/boss-scheduler.ui.test.js` | 보스 입력 폼 렌더링, 잔여 시간 표시, 탭 전환 시 상태 보존 |

### 2.4 E2E 테스트 (End-to-End)

**현재 미도입.** 향후 Playwright 도입 권장 (아래 §5 참조).

---

## 3. 무엇을 어떤 레벨로 테스트할지

| 대상 | 권장 레벨 | 이유 |
|---|---|---|
| DB CRUD, 계산 로직, 인코딩/디코딩 | 단위 | 순수 함수·계층 — 빠르고 격리 용이 |
| 보스 주기 계산, 시간 유틸리티 | 단위 | 엣지 케이스(48h 보스, 자정 경계) 집중 검증 필요 |
| 화면 init/상태 — 스케줄러·시간표 | UI (jsdom) | DOM 이벤트·렌더러 호출 패턴 검증 |
| DB ↔ 스케줄러 ↔ 화면 흐름 | 통합 | 여러 모듈 연동 확인, FK 무결성 |
| 공유 URL 생성 → 수신 → 화면 반영 | 통합 또는 E2E | 엔드-투-엔드 시나리오 — E2E 미도입 시 통합으로 대체 |
| 사용자 전체 플로우(게임 선택 → 알람 → PiP) | E2E (미도입) | Playwright 도입 후 자동화 대상 |

---

## 4. 신규 기능 시 테스트 작성 의무

### 4.1 필수 범위

- **비즈니스 로직 변경** (DB, data-managers, calculator 등): 단위 테스트 필수
- **새 화면/컴포넌트 추가**: UI 테스트 (jsdom) 최소 1건 필수
- **복수 모듈 연동 변경**: 통합 테스트 추가 또는 기존 통합 테스트 갱신
- **공유 URL 포맷 변경** (`share-encoder.js`): 라운드트립 단위 테스트 필수

### 4.2 면제 가능 범위

- 순수 CSS/스타일 변경 (로직 없음)
- 문서·JSON 데이터 파일 수정 (단, 스키마 변경 시 단위 테스트 추가)
- 단순 텍스트·문자열 수정

### 4.3 PR 체크리스트

- [ ] `npm test` 132+ 테스트 전체 통과
- [ ] `npm run lint` 0 errors
- [ ] 새 기능에 대한 테스트 파일 또는 케이스 추가

---

## 5. 커버리지 목표

| 구분 | 목표 |
|---|---|
| 라인 커버리지 | 60% 이상 권장 (TBD — 현재 측정 설정 없음) |
| 비즈니스 로직 핵심 경로 | 100% 목표 (GC, Future Anchor Keeper, 인코딩) |

> 커버리지 측정 활성화 방법: `vitest.config.js`에 `coverage: { reporter: ['lcov', 'text'] }` 추가 후 `npx vitest run --coverage` 실행.

---

## 6. 테스트 명명 및 구조 규칙

### 6.1 파일 명명

```
test/<대상모듈>.<관점>.test.js
```

예시:
- `boss-scheduler.init.test.js` — 초기화 관점
- `boss-scheduler.apply.test.js` — 적용(apply) 관점
- `boss-scheduler.ui.test.js` — UI 렌더링 관점
- `integration-v3.test.js` — v3 통합 시나리오

### 6.2 describe / it 구조

```js
describe('<모듈 또는 함수명>', () => {
    describe('<시나리오 그룹>', () => {
        it('should <기대 동작> when <조건>', () => {
            // Arrange → Act → Assert
        });
    });
});
```

### 6.3 Mock 사용 원칙

- `vi.mock()`은 파일 최상단(import 전) 호이스팅 필수
- 외부 I/O(localStorage는 jsdom 내장 사용, fetch는 mock), 렌더러(`ui-renderer.js`), logger는 mock
- 실제 DB(`src/db.js`)는 통합 테스트에서 직접 사용, `beforeEach`에서 `localStorage.clear()` 필수

### 6.4 시간 관련 테스트

- `vi.useFakeTimers()` + `vi.setSystemTime()`으로 고정 시각 사용
- `process.env.TZ = 'Asia/Seoul'` 설정 필수 (보스 주기 계산이 KST 기준)
- `afterEach(() => vi.useRealTimers())` 복원 필수

---

## 7. E2E 도입 로드맵 (TBD)

| 단계 | 내용 |
|---|---|
| 도구 | Playwright (권장) |
| 우선 시나리오 | 게임 선택 → 보스 입력 → 알람 활성화 → PiP 실행 |
| 공유 URL 시나리오 | `#d=` fragment(v4) 또는 `?v3data=` 파라미터(v3 호환) URL 접속 → 보스 목록 자동 로드 확인 |
| 실행 환경 | GitHub Actions (CI) + headless Chromium |
| 트리거 | main 브랜치 PR 시 실행 |
| 현재 상태 | **미도입** — 기여자가 먼저 착수 시 이 섹션을 갱신할 것 |
