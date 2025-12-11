---
id: issue-016
title: "보스 관리 화면 카드 UI 변경 후 TypeError 발생"
status: "해결됨"
priority: "High"
assignee: ""
labels:
  - "bug"
  - "ui"
  - "boss-management"
created_date: "2025-12-11"
resolved_date: "2025-12-11"
---

# Issue-016: 보스 관리 화면 카드 UI 변경 후 TypeError 발생

## 1. 개요 (Overview)
보스 관리 화면의 뷰 모드를 테이블 UI에서 카드 UI로 변경하는 과정에서 `TypeError: Cannot read properties of undefined (reading 'style')` 오류가 발생하고 있습니다.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
*   **오류 내용:** `ui-renderer.js`의 `updateBossManagementUI` 함수 내에서 `DOM.bossManagementInstruction.style.display` 속성에 접근할 때 `DOM.bossManagementInstruction`이 `undefined`입니다.
*   **스택 트레이스:**
    ```
    ui-renderer.js:641 Uncaught TypeError: Cannot read properties of undefined (reading 'style')
        at updateBossManagementUI (ui-renderer.js:641:32)
        at Object.initBossManagementScreen [as init] (boss-management.js:21:5)
        at showScreen (app.js:155:20)
        at HTMLAnchorElement.<anonymous> (app.js:315:17)
    ```
*   **근본 원인 추정:** `initDomElements()` 함수 (`src/dom-elements.js`에 정의됨)가 호출될 때 `id="boss-management-instruction"` 요소를 찾지 못하는 것으로 보입니다.

## 3. 제안된 해결 방안 (Proposed Solution)
`initDomElements()`가 실행되는 시점에 `boss-management-screen` 섹션 자체가 아직 DOM에 완전히 로드되지 않았거나, `document.getElementById('boss-management-instruction')` 호출 시점에 특정 요소가 참조되지 않는 문제를 해결해야 합니다.

*   `src/dom-elements.js`에서 `bossManagementInstruction` 요소가 올바르게 로드되는지 확인하는 디버그 로그를 추가하여, `initDomElements()` 실행 시점의 DOM 상태를 명확히 파악해야 합니다. (현재 추가되어 있음)
*   `boss-management-screen`이 활성화될 때 `updateBossManagementUI`를 호출하기 전에, 필요한 DOM 요소들이 유효한지 다시 한번 확인하는 로직을 추가하거나, `initDomElements()`가 모든 화면의 요소를 참조할 수 있도록 보장하는 방안을 고려해야 합니다.

## 4. 해결 과정 및 최종 결과 (Resolution Process & Final Outcome)

### 4.1. 원인 분석
*   `src/dom-elements.js`에서 정의된 키 이름(`bossListCardsContainer`)과 `src/ui-renderer.js`에서 사용하는 키 이름(`bossListTableContainer`)이 일치하지 않아 `undefined`가 발생했습니다.
*   또한, DOM 요소가 로드되기 전이나 특정 상황에서 `updateBossManagementUI`가 호출될 때 DOM 참조가 유효하지 않아 스타일 접근 시 오류가 발생했습니다.

### 4.2. 해결 내용
*   **키 이름 일치화:** `src/dom-elements.js`의 키 이름을 `bossListCardsContainer`에서 `bossListTableContainer`로 수정하여 의존성을 맞췄습니다.
*   **방어적 코드 추가:** `src/ui-renderer.js`의 `updateBossManagementUI` 함수 내에서 `DOM.bossManagementInstruction`, `DOM.bossListInput` 등의 요소에 접근하기 전에 해당 요소가 존재하는지 확인하는 `if` 문(Null Check)을 추가했습니다.

### 4.3. 결과
*   보스 관리 화면 진입 시 발생하던 `TypeError`가 더 이상 발생하지 않으며, UI가 정상적으로 렌더링됩니다.
