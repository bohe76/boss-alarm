---
id: issue-032
title: "프리셋 → DB 동기화 미호출로 v3 핵심 기능 전면 무력화"
status: "진행 중"
priority: "Critical"
assignee: "Claude"
labels:
  - bug
  - blocker
  - v3.0
  - architecture
created_date: "2026-04-19"
resolved_date: ""
---

# Issue-032: 프리셋 → DB 동기화 미호출로 v3 핵심 기능 전면 무력화

## 1. 개요 (Overview)

v3.0 데이터 아키텍처의 관문인 `preset-loader.js::loadPresets`(보스 프리셋을 DB `games`/`bosses` 테이블에 sync)가 **어디서도 호출되지 않는 상태**로 릴리즈 전 브랜치에 반영되어 있음. 결과적으로 앱 기동 직후 `v3_games`/`v3_bosses` localStorage가 비어 있고, 48h 자동 확장·프리셋 인터벌 강제 적용 등 v3 데이터 엔진 전체가 동작하지 않는다.

## 2. 문제점 (Problem)

* **현상 (스모크 테스트 재현):**
  1. `localStorage.clear()` 후 앱 로드 → `localStorage`에 `v3_games` 키 자체 없음, `v3_bosses` 길이 0
  2. 보스 스케줄러에서 파르바("110" = 1시간 10분) 입력 후 "보스 시간 업데이트" 클릭
  3. `v3_bosses` 에 파르바 1개가 `interval: 0`으로 생성됨 (프리셋 원본: 720분)
  4. `v3_schedules` 에 단 1건만 저장 (720분 간격 48h 확장 대상이면 4건 이상이어야 함)

* **루트 원인:**
  * `src/services.js:20` 에서 `loadBossSchedulerData(boss-scheduler-data.js)` 만 호출 — 이 함수는 JSON을 **메모리에 로드**만 하고 DB sync를 수행하지 않음
  * `src/preset-loader.js::loadPresets` 는 `syncPresetsToDb`를 수행하지만, **호출처가 존재하지 않음** (코드 전역 grep 결과 참조 없음)
  * `src/data-managers.js:281` `BossDataManager.initPresets` 는 `// initPresets is now a no-op (handled by preset-loader.js)` 주석과 함께 **빈 함수**. 그러나 preset-loader는 실제로는 호출되지 않음

* **파급 영향:**
  * CLAUDE.md "Key Domain Rules → 프리셋 인터벌 우선" 규칙 사실상 미적용
  * 48h 윈도우 자동 재구축 불가 (interval=0은 반복 계산 불가)
  * 공유 URL(v3data) 및 타임테이블 렌더링 비정상 가능성
  * 공식 프리셋 보스를 사용자가 입력할 때마다 interval 누락된 채 DB에 신규 생성 → 데이터 무결성 손상

## 3. 제안된 해결 방안 (Proposed Solution)

**Option A — 최소 침습 (권장):**
* `src/services.js` 에서 `loadBossSchedulerData` 대신 `loadPresets`를 호출
* `loadPresets` 는 `fetch → parse → syncPresetsToDb` 를 모두 수행하므로 단일 호출로 완전한 초기화 보장
* `boss-scheduler-data.js::loadBossSchedulerData` 는 사용처 점검 후 deprecate 또는 내부에서 `loadPresets` 위임

**Option B — boss-scheduler-data.js 에 sync 이식:**
* `loadBossSchedulerData` 내부에 `syncPresetsToDb` 호출 추가
* 두 로더가 중복되는 문제 지속 → 장기적으로 유지보수 부담

## 4. 검증 절차 (Verification)

1. `localStorage.clear()` 후 앱 로드 → `v3_games` / `v3_bosses` 키 존재, 프리셋 전체 보스가 올바른 `interval` 값과 함께 저장되었는지 확인
2. 파르바 1회 입력 후 `v3_schedules` 길이 ≥ 4 (48h ÷ 720분 × 2게임 커버) 인지 확인
3. 다음 48시간 내 예측 스케줄이 모든 파르바 인스턴스를 포함하는지 타임테이블 화면에서 육안 확인
4. Vitest `test/preset-loader` 테스트 신규 작성 권장

## 5. 관련 파일

* `src/services.js`
* `src/preset-loader.js`
* `src/boss-scheduler-data.js`
* `src/data-managers.js` (initPresets no-op)
* `CLAUDE.md` (데이터 흐름 문서)
