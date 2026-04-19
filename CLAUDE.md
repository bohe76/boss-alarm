# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MMORPG 보스 스폰 타이머 & 알람 웹앱 (Vanilla JS SPA). GitHub Pages에 정적 배포되며, 빌드 단계 없이 ES Modules로 직접 실행된다.

## Commands

```bash
npm run test          # Vitest 단위 테스트 실행 (jsdom 환경)
npm run lint          # ESLint 실행 (flat config, v9+)
npx vitest run test/utils.test.js   # 단일 테스트 파일 실행
```

빌드 커맨드 없음 — Vanilla JS이므로 번들링/트랜스파일 불필요.

## Architecture

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
| `src/db.js` | CRUD 메서드, subscriber 패턴, nextId() 전체 |
| `src/data-managers.js` | `BossDataManager` (48h 확장, commitDraft, getAllUpcomingBosses), `LocalStorageManager` 전체 |
| `src/app.js` | `loadInitialData` |
| `src/screens/boss-scheduler.js` | `syncInputToDraft`, `handleApplyBossSettings` |
| `src/ui-renderer.js` | `renderBossInputs`, `renderTimetableList` |

수정 전 반드시: 변경 의도 설명 → 영향 범위 분석 → 사용자 승인 후 진행.

## Key Domain Rules

- **48시간 윈도우**: 자정에 "오늘+내일" 데이터를 자동 재구축
- **프리셋 인터벌 우선**: 공식 프리셋 보스는 DB bosses 테이블의 젠 주기를 강제 적용
- **Auto-increment PK**: 모든 bosses/schedules ID는 정수 PK (`v3_uid_counter`)
- **v2 호환 불필요**: 마이그레이션 없음. v3 전용 localStorage 키 사용
- **입력 방식**: 폼 기반 입력만 사용 (텍스트 모드 제거됨)
- **APP_VERSION**: 숫자로만 관리 (예: `"3.0.0"`), 'v' 접두사는 UI에서만 처리

## Release Notes Workflow

작업 완료 시 → `docs/unreleased_changes.md`에 내역 추가.
정식 릴리즈 시 → `data/version_history.json` 업데이트 후 unreleased 초기화.

## Tech Stack

Vanilla JS (ES Modules) · HTML5 · CSS3 · Web Worker API · Document PiP API · Web Speech API · Google Analytics · Vitest · ESLint · GitHub Pages
