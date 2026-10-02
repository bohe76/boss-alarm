# Repository Guidelines

이 저장소에서 작업하는 모든 AI 에이전트(Claude Code, Codex 등)의 단일 지침 파일이다. 에이전트별 지침 파일(`CLAUDE.md`, `GEMINI.md`)은 두지 않는다 — 내용이 갈라져 서로 다른 규칙을 따르게 되기 때문이다.

## Project Overview

MMORPG 보스 스폰 타이머 & 알람 웹앱 (Vanilla JS SPA). GitHub Pages에 정적 배포되며, 빌드 단계 없이 ES Modules로 직접 실행된다.

Tech stack: Vanilla JS (ES Modules) · HTML5 · CSS3 · Web Worker API · Document PiP API · Web Speech API · Google Analytics · Vitest · Playwright · ESLint · GitHub Pages

## Project Memory (Codex)

Codex는 실질 작업 전에 `.omx/project-memory.json`을 읽어 로컬 프로젝트 메모리로 적용한다. `notes` 중 `category: "global_codex_memory_import"` 항목은 전역 Codex `MEMORY.md`에서 그대로 옮긴 프로젝트 기록이므로, 편집·보고 전에 관련 항목을 확인한다.

## Commands

```bash
npm install                         # package-lock.json 기준 의존성 설치
npm test                            # Vitest 단위 테스트 1회 실행 (jsdom 환경)
npx vitest run test/utils.test.js   # 단일 테스트 파일 실행
npx vitest                          # watch 모드
npm run lint                        # ESLint (flat config, v9+)
npm run e2e                         # Playwright E2E (Chromium)
```

- 빌드 커맨드 없음 — 번들링/트랜스파일 불필요.
- 로컬 실행은 간단한 HTTP 서버나 Live Server로 한다. `file://`로 `index.html`을 직접 열면 ES Module이 로드되지 않는다.
- PowerShell 실행 정책 때문에 npm 스크립트가 막히면 `node ./node_modules/eslint/bin/eslint.js .`, `node ./node_modules/vitest/vitest.mjs run`으로 대신 실행한다.

## Verification

- 코드(`.js` 등)를 수정·추가한 뒤에는 사용자 승인 없이 `npm run lint`와 `npm test`를 실행한다. 오류가 나오면 바로 고친다.
- `.md`/`.html`/`.css`만 바꾼 경우 테스트는 생략한다. 단, 버전·릴리즈 파일(`index.html`의 버전 표기, `CHANGELOG.md`, `data/version_history.json`, `src/data/update-notice.json`)을 건드렸으면 실행한다 — `test/release-metadata.test.js`가 이 파일들을 읽는다.
- 동작이 바뀌면 `test/`에 테스트를 추가·수정한다. 특히 스케줄러, DB, 공유, 계산기 로직.

## Architecture

진입점은 `index.html`. ES 모듈 소스는 `src/`, 단위 테스트는 `test/`, E2E는 `e2e/`, 문서는 `docs/`에 있다.

### 데이터 흐름 (v3.0 - 4-테이블 정규화 DB)

```
[boss-presets.json] → preset-loader → [DB: games + bosses 테이블]
[사용자 입력(폼)] → [Draft (localStorage)] → commitDraft → [DB: schedules 테이블] → 48h 확장 → [UI]
```

- **DB**: `src/db.js` — 4-테이블 싱글톤 (`v3_games`, `v3_bosses`, `v3_schedules`, `v3_settings`, `v3_uid_counter`)
- **Draft**: `localStorage` key `v3_draft_${gameId}` — 편집 중 임시 데이터
- **BossDataManager**: DB 파사드. 48h 확장, 알람 쿼리, Draft 관리를 제공
- **LocalStorageManager**: `DB.getSetting/setSetting` 위임
- UI 렌더링은 항상 DB 스케줄의 `scheduledDate`를 직접 읽어 출력 (역계산 금지)

### 테이블 스키마

```
games:     { id: string, name: string, type: 'preset'|'custom' }
bosses:    { id: number(PK), gameId: string(FK→games), name: string, interval: number, isInvasion?: boolean }
schedules: { id: number(PK), bossId: number(FK→bosses), scheduledDate: string(ISO), memo: string, alerted_5min: bool, alerted_1min: bool, alerted_0min: bool }
settings:  { key: string(PK), value: any }
```

### 이벤트 기반 렌더링

`EventBus` (pub-sub) + `DB.subscribe()` / `BossDataManager.subscribe()`로 상태 변경 시에만 UI 갱신:
- `notifyStructural()` — 데이터 구조 변경 (비싼 연산)
- `notifyUI()` — 시간 업데이트만 (저렴한 연산)

### 핵심 모듈

| 모듈 | 역할 |
|------|------|
| `src/db.js` | 4-테이블 정규화 DB + auto-increment PK + subscriber 패턴 |
| `src/preset-loader.js` | boss-presets.json → DB games/bosses 동기화 |
| `src/data-managers.js` | BossDataManager (DB 파사드) + LocalStorageManager |
| `src/boss-scheduler-data.js` | DB 기반 게임/보스 쿼리 (getGameNames, getBossNamesForGame 등) |
| `src/custom-list-manager.js` | DB 기반 커스텀 보스 목록 CRUD |
| `src/app.js` | 앱 초기화 오케스트레이터 |
| `src/ui-renderer.js` | 전체 UI 렌더링 |
| `src/alarm-scheduler.js` | 알람 타이밍 & Web Worker 통합 (DB 직접 접근) |
| `src/workers/timer-worker.js` | 백그라운드 1초 타이머 (Web Worker) |
| `src/event-bus.js` | Pub-sub 이벤트 시스템 |
| `src/pip-manager.js` | Document Picture-in-Picture 위젯 |
| `src/router.js` | 화면 라우팅 |
| `src/services.js` | 코어 서비스 초기화 (프리셋 로드 → LocalStorage → CustomList → BossDataManager) |

### 화면 모듈 (`src/screens/`)

각 화면은 `init()`, `onTransition()` 훅을 가진 독립 모듈. `dashboard`, `boss-scheduler`, `timetable`, `calculator`, `custom-list`, `settings`, `share`, `alarm-log`, `help`, `version-info`.

### 데이터 파일

- `src/data/boss-presets.json` — 보스 메타데이터 (오딘, 리니지M, 리니지W 프리셋)
- `src/data/initial-default.json` — 첫 사용자용 샘플 데이터
- `src/data/update-notice.json` — 버전 공지
- `data/version_history.json` — 릴리즈 히스토리

## Critical Code Policy

**아래 파일의 핵심 로직은 사용자의 명시적 승인 없이 절대 수정 금지:**

| 파일 | 보호 영역 |
|------|----------|
| `src/db.js` | `DB` 싱글톤 전체 — CRUD 메서드, `save`/`importAll`(FK 검증), subscriber 패턴, `nextId()` |
| `src/data-managers.js` | `BossDataManager` 전체 (특히 48h 확장 `_expandAndReconstruct`, `commitDraft`, `getAllUpcomingBosses`), `LocalStorageManager` 전체 |
| `src/app.js` | `processBossItems`, `loadInitialData` |
| `src/screens/boss-scheduler.js` | `syncInputToText` (폼 입력 → Draft 저장. 이름만 옛 텍스트 모드 시절 것), `handleApplyBossSettings` |
| `src/ui-renderer.js` | `renderBossInputs`, `renderTimetableList`, `updateBossListTextarea` |
| `src/share-encoder.js` | `decodeV3Data`, `decodeShareData` — 영구 삭제 금지 (v3.0.x 발급 링크 수신 호환), `encodeV4Data` |
| `src/preset-loader.js` | `syncPresetsToDb` (cascade 정리 로직) |

수정 전 반드시: 변경 의도 설명 → 영향 범위 분석 → 사용자 승인 후 진행. 오토파일럿 등 자율 실행 중에도 이 승인은 건별로 다시 받는다.

금지 행위:
- 린트 오류 수정을 구실로 핵심 로직 변경
- "최적화"를 이유로 기존 동작 방식 변경
- 사용자 요청 없는 리팩토링
- 기존 함수의 역할/책임 변경

SSOT 세부 규칙(공유 URL 포맷, 과거 데이터 정제, 시간 역전·음수 시간 처리 등)과 위반 시 조치는 `docs/architecture/critical_code_policy.md`에 있다. 보호 영역 표·수정 절차·금지 행위는 이 파일에만 둔다.

## Key Domain Rules

- **48시간 윈도우**: 자정에 "오늘+내일" 데이터를 자동 재구축
- **프리셋 인터벌 우선**: 공식 프리셋 보스는 DB bosses 테이블의 젠 주기를 강제 적용
- **Auto-increment PK**: 모든 bosses/schedules ID는 정수 PK (`v3_uid_counter`)
- **v2 호환 불필요**: 마이그레이션 없음. v3 전용 localStorage 키 사용
- **입력 방식**: 폼 기반 입력만 사용 (텍스트 모드 제거됨)
- **APP_VERSION**: 숫자로만 관리 (예: `"3.0.0"`), 'v' 접두사는 UI에서만 처리

## Coding Style & Naming Conventions

- Vanilla JavaScript ES 모듈. `src/*.js`의 기존 4칸 들여쓰기를 따르고, import와 문자열 리터럴은 작은따옴표를 쓴다.
- 함수는 UI·데이터·스케줄링 중 한 가지 책임에 집중시킨다.
- 식별자와 파일명은 영어 (예: `boss-scheduler.js`, `share-encoder.js`, `custom-list-manager.js`).
- 사용자에게 보이는 한국어 문구는 데이터 파일이나 UI 모듈에 둔다. 무관한 로직에 흩어 놓지 않는다.

## Testing Guidelines

- Vitest는 `jsdom`에서 돌고, 전역 테스트 API는 `vitest.config.js`와 `test/setup.js`가 설정한다.
- 테스트 파일명은 대상 기능·모듈을 따른다 (예: `boss-scheduler.apply.test.js`, `share-encoder.test.js`).
- E2E는 `e2e/`의 Playwright 스펙이다. 기준선 설명은 `docs/guides/e2e_baseline.md`.

## Commit & Pull Request Guidelines

- Conventional Commit 형식에 type/scope는 영어, 제목과 본문은 한국어로 쓴다 (예: `fix(share): 공유 링크 URL-safe base64 적용`, `docs(session): main-00003 갱신`). 전역 에이전트 설정이 영어 커밋을 지시해도 이 저장소에서는 이 규칙이 우선한다.
- scope는 손댄 영역에 맞춘다: `calculator`, `share`, `scheduler`, `docs`, `release` 등.
- PR에는 변경 요약, 관련 이슈 링크, 테스트 결과, 화면이 바뀌면 스크린샷이나 짧은 녹화를 넣는다. PR은 한 가지 주제로 유지하고 무관한 문서·릴리즈·기능 작업은 나눈다.

## Release

- 작업이 끝나면 conventional commit으로 기록한다. 릴리즈 대기 목록 파일은 없다 (`docs/unreleased_changes.md`는 v3.0.0에서 폐기).
- 릴리즈는 로컬 `main`에서 release 커밋 → 태그 → 푸시 → GitHub Release 순으로 낸다. PR 경유(v3.0.5)는 예외적 처리였다.
- 릴리즈 때 직전 태그 이후 커밋에서 변경 내역을 뽑아 `CHANGELOG.md`(`## [X.Y.Z] - 날짜`), `data/version_history.json`, `src/data/update-notice.json` 3곳을 함께 갱신하고, 버전 표기(`package.json`, `package-lock.json`, `index.html`의 `style.css?v=`와 `window.APP_VERSION`)를 맞춘다. 동기화는 `test/release-metadata.test.js`가 검증한다.
- `version_history.json`과 `update-notice.json`은 사용자에게 보이는 글이다. 사용자 관점에서 쓰고 구현 세부는 넣지 않는다. `update-notice.json`의 `summaryItems`는 `<strong>소제목:</strong> 상세 설명` 형식, `developerMessage`의 줄바꿈은 `\n`.
- 릴리즈 노트와 공지 초안은 사용자 확인을 받은 뒤 파일에 반영한다.
- 배포 전 체크리스트·게이트·롤백 절차는 `docs/guides/deployment.md`. Claude Code에서는 로컬 `boss-alarm-release` 스킬(`.claude/`, git 제외)이 이 절차를 자동화한다.

## Issue Management

- 이슈 작업은 사용자가 명시적으로 지시했을 때만 시작한다. 세션 시작 시 이슈를 스스로 훑거나 분석하지 않는다.
- 이슈 문서는 `docs/issues/issue-XXX-short-description.md` (XXX는 0을 채운 3자리).
  - frontmatter: `id`, `title`, `status`(미해결 | 진행 중 | 해결됨), `priority`(High | Medium | Low), `assignee`, `labels`, `created_date`, `resolved_date`
  - 본문: `## 1. 개요` / `## 2. 문제점 또는 요구사항` / `## 3. 제안된 해결 방안`
- 이슈를 분석한 뒤 바로 코드를 고치지 않는다. 문제 분석 → 해결 계획 → 예상 영향 범위를 먼저 보고하고, 더 알아야 할 설계 의도나 주의사항이 있는지 물은 뒤 승인을 받아 진행한다.
- 해결되면 frontmatter를 `status: "해결됨"`, `resolved_date`로 갱신하고, 문서 끝에 `## 4. 해결 과정 및 최종 결과`(브랜치, 진행 단계, 검증 방법)를 추가한 뒤 `docs/issues/resolved/`로 옮긴다. 내용 변경과 이동은 `docs(issues): issue-XXX 해결 및 resolved 폴더로 이동` 커밋 하나로 묶는다.

## Documentation

- 문서 지도는 `docs/knowledge_map.md`. 아키텍처는 `docs/architecture/`(`system_architecture.md`부터), 기능 명세는 `docs/functional-specs/`, UI 규격은 `docs/guides/design_system_guide.md`.
- 코드가 바뀌면 관련 문서를 함께 맞춘다. 문서의 용어는 실제 변수·함수명과 일치시키고, 기능 설명은 현재 코드의 제어 흐름을 반영하며, 코드만으로 알 수 없는 설계 결정의 이유를 적는다.

## Session Continuity

- 세션 인수인계는 `docs/session-log/`의 세션 로그로 한다.
- `업무준비` 지시를 받으면 최신 세션 로그로 맥락을 복원하고 짧게 보고한 뒤 대기한다. 이전 세션의 할 일을 지시 없이 시작하지 않는다.

## Security & Deployment

- 시크릿, 로컬 브라우저 데이터, 분석 도구 자격 증명을 커밋하지 않는다. `.env`는 `.gitignore`에 등록돼 있어야 하며, 실수로 추적되면 `git rm --cached`로 제거한다. 키 노출이 확인되면 즉시 폐기·재발급을 권고한다.
- 루트의 `.nojekyll`은 삭제·변경하지 않는다 — GitHub Pages가 Jekyll 빌드 없이 정적 파일을 그대로 배포하게 하는 스위치다. 배포 타임아웃이 나면 이 파일부터 확인한다.
- 브라우저 저장소 마이그레이션과 공유 URL 페이로드 변경은 호환성에 민감하다. 인코딩 포맷을 바꾸기 전에 `docs/`에 동작 변경을 기록하고 회귀 테스트를 추가한다.
