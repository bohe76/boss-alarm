---
id: issue-012
title: "코드 중복 및 모듈성 리팩토링 제안"
status: "해결됨"
priority: "Medium"
assignee: "Gemini"
labels:
  - refactoring
  - core
created_date: ""
resolved_date: "2025-12-02"
---

# Issue-012: 코드 중복 및 모듈성 리팩토링 제안

## 1. `src/global-event-listeners.js` 모듈 관련 개요

`src/global-event-listeners.js` 모듈은 전역 `EventBus` 리스너를 중앙 집중화하기 위해 존재하나, 현재 `app.js`에서 호출되지 않고 있으며, 그 내부에 정의된 리스너들은 `app.js`와 `src/screens/alarm-log.js`에서 개별적으로 등록되어 사용되고 있습니다. 이로 인해 `src/global-event-listeners.js`는 현재 중복된 코드를 포함하거나 활용되지 않는 상태입니다.

## 1.1. 문제점

*   **코드 중복 및 비효율성**: `app.js`와 `src/screens/alarm-log.js`에서 `global-event-listeners.js`가 의도했던 리스너들을 개별적으로 등록하고 있어, 모듈의 목적이 퇴색됩니다.
*   **문서와의 불일치**: `docs/system_module_details.md`에는 `initGlobalEventListeners`가 `app.js`에 의해 호출된다고 설명되어 있었으나, 실제 코드에서는 호출되지 않고 있었습니다 (현재 문서 수정 완료).
*   **유지보수성 저하**: 전역 이벤트 리스너 관리가 분산되어 있어, 향후 리스너 추가/수정 시 여러 파일을 확인해야 하는 번거로움이 있습니다.

## 1.2. 제안된 해결 방안 (리팩토링)

`app.js`에서 `initGlobalEventListeners(DOM)`를 명시적으로 호출하고, `src/global-event-listeners.js` 내부에 모든 전역 `EventBus` 리스너를 중앙 집중화하는 것입니다.

*   **`src/app.js` 변경**: `initApp()` 함수 내에서 `initGlobalEventListeners(DOM)`를 호출.
*   **`src/screens/alarm-log.js` 변경**: `initAlarmLogScreen`에서 `EventBus.on('log-updated', ...)` 리스너 등록 코드 제거.
*   **`src/global-event-listeners.js`**: `BossDataManager.subscribe` 및 `EventBus.on('log-updated')` 리스너를 포함하여 모든 전역 리스너를 관리.

## 4. 해결 과정 및 최종 결과

### 4.1. 최종 상태
**해결됨 (Resolved)**

### 4.2. 해결 과정 요약
본 이슈에서 제안된 리팩토링은 `refactor/issue-012-modularity` 브랜치에서 아래와 같은 단계로 진행되었으며, `main` 브랜치에 병합되었습니다.

1.  **리팩토링 계획 수립:** `docs/refactoring_checklist_issue_012.md` 문서를 작성하여, '사전 분석 -> 실행 -> 검증' 원칙에 따른 체계적인 리팩토링 계획을 수립했습니다.

2.  **전역 이벤트 리스너 중앙화:**
    *   `app.js`가 `initGlobalEventListeners`를 호출하도록 수정하고, 기존에 `app.js`에 있던 `BossDataManager` 구독 로직을 `global-event-listeners.js`로 이전하여 활성화했습니다.
    *   이를 통해 `BossDataManager` 데이터 변경 및 로그 업데이트에 대한 반응형 로직이 중앙에서 관리되도록 구조를 개선했습니다.

3.  **모듈별 코드 개선:**
    *   `src/screens/alarm-log.js`: 화면 전환 시마다 중복 실행되던 토글 버튼 상태 적용 로직을 수정하여 효율화했습니다.
    *   `src/event-handlers.js`: `app.js`의 코드와 완전히 중복되고 실제로는 사용되지 않는 '죽은 코드'임을 최종 확인하고, 혼란을 방지하기 위해 파일을 완전히 삭제했습니다.

4.  **검증 및 문서 업데이트:**
    *   각 코드 변경 단계마다 `lint` 및 `test`를 실행하여 코드 품질과 안정성을 검증했습니다.
    *   리팩토링 결과를 5개의 핵심 시스템 문서 (`system_module_details.md` 등)에 모두 반영하여 코드와 문서의 정합성을 확보했습니다.

### 4.3. 결론
이번 리팩토링을 통해 코드 중복이 제거되고 각 모듈의 책임이 명확해졌으며, 애플리케이션의 전반적인 유지보수성과 확장성이 향상되었습니다.