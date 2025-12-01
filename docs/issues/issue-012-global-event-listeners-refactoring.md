# Issue-012: `global-event-listeners.js` 모듈 리팩토링 제안

## 1. 개요

`src/global-event-listeners.js` 모듈은 전역 `EventBus` 리스너를 중앙 집중화하기 위해 존재하나, 현재 `app.js`에서 호출되지 않고 있으며, 그 내부에 정의된 리스너들은 `app.js`와 `src/screens/alarm-log.js`에서 개별적으로 등록되어 사용되고 있습니다. 이로 인해 `src/global-event-listeners.js`는 현재 중복된 코드를 포함하거나 활용되지 않는 상태입니다.

## 2. 문제점

*   **코드 중복 및 비효율성**: `app.js`와 `src/screens/alarm-log.js`에서 `global-event-listeners.js`가 의도했던 리스너들을 개별적으로 등록하고 있어, 모듈의 목적이 퇴색됩니다.
*   **문서와의 불일치**: `docs/system_module_details.md`에는 `initGlobalEventListeners`가 `app.js`에 의해 호출된다고 설명되어 있었으나, 실제 코드에서는 호출되지 않고 있었습니다 (현재 문서 수정 완료).
*   **유지보수성 저하**: 전역 이벤트 리스너 관리가 분산되어 있어, 향후 리스너 추가/수정 시 여러 파일을 확인해야 하는 번거로움이 있습니다.

## 3. 제안된 해결 방안 (리팩토링)

`app.js`에서 `initGlobalEventListeners(DOM)`를 명시적으로 호출하고, `src/global-event-listeners.js` 내부에 모든 전역 `EventBus` 리스너를 중앙 집중화하는 것입니다.

*   **`src/app.js` 변경**: `initApp()` 함수 내에서 `initGlobalEventListeners(DOM)`를 호출.
*   **`src/screens/alarm-log.js` 변경**: `initAlarmLogScreen`에서 `EventBus.on('log-updated', ...)` 리스너 등록 코드 제거.
*   **`src/global-event-listeners.js`**: `BossDataManager.subscribe` 및 `EventBus.on('log-updated')` 리스너를 포함하여 모든 전역 리스너를 관리.

## 4. 현재 상태 및 결정

이 리팩토링은 코드의 일관성과 유지보수성을 높이는 장점이 있지만, 현재 애플리케이션에 기능적인 오류가 없는 상태에서 코드 변경은 현재 작업 범주에 포함되지 않는다는 사용자 지시에 따라 보류되었습니다.

향후 리팩토링 작업 시 고려될 수 있도록 이슈로 기록합니다.