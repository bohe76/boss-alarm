id: issue-025
title: "지능형 SSOT 자동 업데이트 엔진 구현"
status: "해결됨"
priority: "High"
assignee: "Antigravity"
labels:
  - feat
  - core
  - stability
created_date: "2025-12-30"
resolved_date: "2025-12-30"
---

# Issue-025: 지능형 SSOT 자동 업데이트 엔진 구현

## 1. 개요 (Overview)
보스 스케줄의 48시간(오늘+내일) 윈도우를 항상 최신으로 유지하기 위해 정해진 시간(00:00 자정)에 SSOT를 자동으로 업데이트하는 메커니즘을 구현합니다.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
*   사용자가 앱을 켜두었을 때 자정(00:00)이 지나도 내일 일정이 자동으로 로드되지 않는 문제.
*   자동 업데이트 시 사용자가 스케줄러에서 편집 중인 내용(Draft)을 덮어씌울 위험성.
*   앱 재시작 시 누락된 시간대의 업데이트 보정 필요.

## 4. 해결 과정 및 최종 결과 (Implementation Details & Results)

### 구현 단계
1.  **데이터 무결성 강화**: `BossDataManager`에 `isDraftDirty()`, `syncDraftWithMain()`, `checkAndUpdateSchedule()` 메서드 추가.
2.  **트리거 시스템 구축**:
    *   `app.js` (initApp): 앱 시작 시 업데이트 상태 체크 및 누락분 즉시 소급.
    *   `alarm-scheduler.js` (updateAppState): 타이머 워커의 1초 주기 TICK 마다 00시 자정 기준점 통과 감시.
3.  **지능형 충돌 관리**: 팝업 시 `formatMonthDay` 유틸을 사용하여 `오늘(MM.DD)과 내일(MM.DD)` 형식을 동적으로 계산하여 안내.
4.  **UI 동기화**: `global-event-listeners.js`에서 `BossDataManager` 구독을 통해 대시보드와 시간표 UI 자동 갱신.

### 최종 결과
- ✅ 자정(00:00)이 되면 별도의 조작 없이도 내일 일정이 포함된 48시간 데이터로 자동 확장됩니다.
- ✅ 사용자가 편집 중일 경우에만 선택을 묻고, 취소하더라도 시스템 내부(알람)는 최신 상태를 유지하게 되어 안정성이 극대화되었습니다.
- ✅ 모든 핵심 문서(`architecture`, `module_details`, `data_flow` 등)에 해당 엔진의 사양이 공식 반영되었습니다.

