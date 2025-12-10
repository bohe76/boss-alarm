---
id: issue-013
title: "광 계산기 화면 전환 시 초기화 문제 및 1시간 경고 기능 추가"
status: "미해결"
priority: "Medium"
assignee: "Gemini"
labels:
  - bug
  - feature
  - calculator
created_date: ""
resolved_date: ""
---

# Issue-013: 광 계산기 화면 전환 시 초기화 문제 및 1시간 경고 기능 추가

## 1. 문제점

현재 '광 계산기'는 애플리케이션 내 다른 화면으로 전환될 경우 진행 중이던 계산 상태가 초기화되는 문제가 있습니다. 이는 다음과 같은 원인으로 발생합니다.

*   **메모리 기반 상태 관리:** `crazy-calculator.js` 모듈 내의 모든 계산 상태 변수(스톱워치 시간, 광 시간 등)가 전역 메모리에만 저장됩니다.
*   **화면 전환 시 모듈 초기화:** `src/screens/calculator.js`의 `handleCalculatorScreenTransition()` 함수는 계산기 화면으로 이동할 때`CrazyCalculator.resetCalculator()` 무조건 호출하여 모든 계산 상태를 초기화합니다.
*   **UI 상태 비동기화:** `handleCalculatorScreenTransition()`은 또한 광 계산기 UI 요소들을 초기 상태로 강제로 되돌려, 저장된 상태가 있더라도 이를 반영하지 못합니다.

이러한 문제점으로 인해 사용자는 광 계산기를 사용하면서 다른 화면을 잠시 확인해야 할 경우, 진행 중이던 계산을 잃게 되어 사용성이 크게 저하됩니다.

## 2. 목표

광 계산기의 사용성을 개선하기 위해 다음 두 가지 기능을 추가합니다.

1.  **상태 지속성 확보:** '광 계산기'가 시작된 후 다른 화면으로 전환되더라도 진행 중인 계산 상태가 유지되도록 합니다.
2.  **1시간 경고 및 초기화 기능:** 광 계산기가 시작 또는 광 버튼이 눌린 시점부터 1시간이 경과하면 사용자에게 경고 메시지를 표시하고, 초기화 여부를 선택할 수 있도록 합니다.

## 3. 제안하는 변경 사항

### 3.1. 상태 지속성 확보 (CrazyCalculator state persistence)

*   **`src/data-managers.js` 수정:**
    *   `LocalStorageManager`에 `crazyCalculatorActiveState`를 저장하고 로드하는 새로운 메소드(`saveCrazyCalculatorActiveState`, `loadCrazyCalculatorActiveState`, `getCrazyCalculatorActiveState`, `setCrazyCalculatorActiveState`)를 추가합니다. 이 상태 객체는 `CrazyCalculator`의 `stopwatchStartTime`, `gwangTime`, `currentStopwatchTime`, `isRunning`, `isGwangTriggered`, `oneHourWarningShown` 등을 포함합니다.
*   **`src/crazy-calculator.js` 수정:**
    *   `LocalStorageManager`를 통해 `CrazyCalculator`의 상태를 로드/저장하도록 수정합니다. `CrazyCalculator` 초기화 시 저장된 상태를 불러와 계산기를 복원하고, 상태가 변경될 때마다 `LocalStorageManager`에 저장합니다.
    *   `stopwatchInterval`과 `countdownInterval`의 관리 로직을 개선하여 화면 전환과 무관하게 백그라운드에서 지속적으로 시간을 업데이트할 수 있도록 합니다. UI 업데이트는 `EventBus` 이벤트를 통해 처리합니다.
*   **`src/screens/calculator.js` 수정:**
    *   `handleCalculatorScreenTransition()`에서 `CrazyCalculator.resetCalculator()` 호출을 제거합니다.
    *   `CrazyCalculator`에서 로드된 상태를 기반으로 UI 버튼의 활성화/비활성화 상태 및 스톱워치/예상 시간 디스플레이를 정확히 반영하도록 수정합니다.
    *   `CrazyCalculator`가 실행 중인 상태로 복원될 경우, `CrazyCalculator`의 `updateDisplayCallback` 및 `updateExpectedTimeCallback`을 다시 등록합니다.

### 3.2. 1시간 경고 및 초기화 기능 (1-hour warning and reset)

*   **`src/crazy-calculator.js` 수정:**
    *   `startPressTime` 변수를 추가하여 '시작' 또는 '광' 버튼이 처음 눌린 시점을 기록합니다.
    *   `stopwatchInterval` 내부에서 `startPressTime`과 현재 시간 차이를 주기적으로 확인하여 1시간(3,600,000ms)이 경과했는지 감지합니다.
    *   1시간이 경과하고 경고가 아직 표시되지 않았다면, `EventBus.emit('crazy-calculator-one-hour-warning')`와 같은 커스텀 이벤트를 발생시킵니다.
    *   `oneHourWarningShown` 플래그를 `crazyCalculatorActiveState`에 포함시켜 경고가 한 번만 표시되도록 합니다.
*   **`src/screens/calculator.js` 수정:**
    *   `initCalculatorScreen(DOM)` 내부에 `EventBus.on('crazy-calculator-one-hour-warning', ...)` 리스너를 추가합니다.
    *   리스너 함수는 사용자에게 `confirm` 대화상자("광 계산기가 1시간 이상 실행 중입니다. 기록을 초기화하고 재시작하시겠습니까?")를 표시합니다.
    *   사용자가 '확인'을 선택하면:
        *   `CrazyCalculator.resetCalculator()`를 호출하여 계산기를 초기화합니다.
        *   `EventBus.emit('navigate', 'calculator-screen')`을 발행하여 계산기 화면으로 이동합니다. (이미 계산기 화면에 있다면 UI만 초기화됩니다.)
        *   `ui-renderer.js`를 통해 UI를 초기 상태로 재설정합니다.
    *   사용자가 '취소'를 선택하면: 아무런 동작 없이 광 계산기는 계속 실행됩니다.

## 4. 예상되는 영향

*   **사용자 경험 개선:** 화면 전환으로 인한 광 계산기 초기화 문제가 해결되어 사용자가 더욱 편리하게 앱을 사용할 수 있습니다.
*   **편의성 증대:** 1시간 경고 기능으로 사용자가 장시간 계산기 작동을 잊는 것을 방지하고, 필요한 경우 쉽게 초기화할 수 있습니다.
*   **코드 복잡도 증가:** `CrazyCalculator`의 상태 관리 및 `EventBus`를 통한 모듈 간 통신 로직이 추가되어 코드의 복잡도가 소폭 증가할 수 있습니다.

## 5. 작업 브랜치 제안

`feature/crazy-calculator-persistence` 브랜치에서 해당 기능을 구현할 것을 제안합니다.