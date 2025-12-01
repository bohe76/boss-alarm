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

## 1.3. 현재 상태 및 결정

이 리팩토링은 코드의 일관성과 유지보수성을 높이는 장점이 있지만, 현재 애플리케이션에 기능적인 오류가 없는 상태에서 코드 변경은 현재 작업 범주에 포함되지 않는다는 사용자 지시에 따라 보류되었습니다.

향후 리팩토링 작업 시 `src/global-event-listeners.js` 모듈 리팩토링과 함께 고려될 수 있도록 이슈로 기록합니다.

---

## 3. `src/screens/alarm-log.js` 모듈 관련 문제점 및 제안

### 3.1. 개요

`src/screens/alarm-log.js` 모듈의 `initAlarmLogScreen` 함수는 "15개 보기" 토글 버튼의 초기 상태 로딩 로직을 두 번 호출하고 있으며, `EventBus.on('log-updated', ...)` 리스너를 `initAlarmLogScreen` 내부에 직접 등록하고 있습니다. 이 리스너는 `src/global-event-listeners.js`에서 중앙 집중화될 것으로 주석에 명시되어 있으나, 실제로는 그렇지 않습니다.

### 3.2. 문제점

*   **중복 코드**: `initAlarmLogScreen` 함수 내에서 `DOM.viewMoreLogsButton.classList.toggle('active', isToggleActive);`와 같은 토글 버튼 초기 상태 적용 로직이 두 번 호출됩니다.
*   **불일치하는 주석**: `src/screens/alarm-log.js` 코드 내부에 `// The EventBus.on('log-updated', ...) listener is now handled centrally in initGlobalEventListeners.` 주석이 있지만, 실제로는 `EventBus.on('log-updated', ...)` 리스너가 `initAlarmLogScreen` 내에서 직접 등록됩니다. 이는 코드와 주석 간의 불일치이며, 개발자에게 혼란을 줄 수 있습니다.
*   **중앙 집중화 부족**: `EventBus` 리스너의 중앙 집중화라는 `global-event-listeners.js`의 목적이 달성되지 않고, `alarm-log.js`가 자체적으로 리스너를 등록하고 있습니다. 이는 `Issue-012`의 `src/global-event-listeners.js` 관련 문제점과 직접적으로 연결됩니다.

### 3.3. 제안된 해결 방안 (리팩토링)

`src/global-event-listeners.js`가 `app.js`에서 호출되는 방향으로 리팩토링된다면, `src/screens/alarm-log.js` 내의 `EventBus.on('log-updated', ...)` 리스너 등록 코드를 제거하고, `global-event-listeners.js`에서 해당 리스너를 중앙 집중식으로 관리해야 합니다. 또한 `initAlarmLogScreen` 내부의 토글 버튼 초기 상태 적용 로직 중 중복되는 부분을 제거해야 합니다.

### 3.4. 현재 상태 및 결정

이 리팩토링은 코드의 명확성과 유지보수성을 향상시키지만, 현재 애플리케이션에 기능적인 오류가 없는 상태에서 코드 변경은 현재 작업 범주에 포함되지 않는다는 사용자 지시에 따라 보류되었습니다.

향후 리팩토링 작업 시 `src/global-event-listeners.js` 및 `src/event-handlers.js` 모듈 리팩토링과 함께 고려될 수 있도록 이슈로 기록합니다.

---

## 4. `src/styles/style.css` 테두리 반경 불일치 문제점 및 제안

### 4.1. 개요

`docs/design_system_guide.md`에 정의된 테두리 반경 시스템은 `4px`, `8px`, `12px`, `50%`로 구성되어 있습니다. 그러나 `src/styles/style.css`의 `.toggle-button`에는 `48px`의 `border-radius`가 사용되고 있습니다.

### 4.2. 문제점

*   **디자인 시스템과의 불일치**: `48px`라는 값이 정의된 테두리 반경 시스템에 속하지 않아 디자인 일관성을 해칠 수 있습니다.
*   **가이드라인 미준수**: 정의된 시스템을 따르지 않는 임의의 값이 사용될 경우, 향후 UI 요소의 통일성을 유지하기 어렵습니다.

### 4.3. 제안된 해결 방안 (리팩토링)

`48px`가 특정 UI 요소(예: 캡슐형 버튼)에 필요한 고유한 값이라면, 디자인 시스템 가이드에 새로운 테두리 반경 (`radius-pill` 또는 `radius-round` 등)으로 정의하고 사용법을 명시합니다. 또는, 기존의 `radius-full` (`50%`)을 사용하여 `48px`와 유사한 시각적 효과를 내도록 조정할 수 있는지 검토합니다.

### 4.4. 현재 상태 및 결정

현재 기능적인 문제는 없으나, 디자인 시스템의 일관성을 위해 향후 리팩토링 시 고려되어야 합니다.

---

## 2. `src/event-handlers.js` 모듈 관련 문제점 및 제안

### 2.1. 개요

`src/event-handlers.js` 파일은 모듈의 역할 범위보다 훨씬 많은 책임을 지고 있으며, `src/app.js`에 정의된 핵심 로직 (`showScreen`, `initApp`)의 중복 정의 또는 사용되지 않는 복사본을 포함하고 있습니다. 이는 코드의 모듈성, 응집도, 유지보수성을 저해합니다.

### 2.2. 문제점

*   **코드 중복 및 데드 코드**: `src/app.js`의 `showScreen` 및 `initApp` 함수가 `src/event-handlers.js`에 중복 정의되어 있거나 사용되지 않는 형태로 존재합니다. 이는 불필요한 코드이며 혼란을 야기할 수 있습니다.
*   **단일 책임 원칙 위반**: `event-handlers.js`는 단순히 이벤트를 처리하는 것을 넘어, UI 제어 로직 (`showScreen`의 복사본), 애플리케이션 초기화 로직 (`initApp`의 복사본) 등 다양한 역할을 수행하고 있습니다.
*   **높은 결합도**: 많은 모듈을 import하고 있으며, 이들 중 일부는 `event-handlers.js`의 핵심 책임(이벤트 핸들링)과 직접적인 관련이 없는 것으로 보입니다.
*   **문서와의 불일치**: `docs/system_module_details.md`의 `event-handlers.js` 섹션에서 "이 모듈은 이전에 `initApp` 및 `showScreen`과 같은 최상위 오케스트레이션 로직을 포함했으나, 현재는 `app.js`가 해당 역할을 전담합니다."라고 명시하고 있으나, 실제 코드에서는 여전히 해당 함수들이 존재합니다. (비록 사용되지 않더라도)

### 2.3. 제안된 해결 방안 (리팩토링)

`src/event-handlers.js`의 역할을 순수하게 DOM 이벤트 핸들러 등록 및 관련된 간단한 로직으로 제한합니다.

*   **`src/event-handlers.js` 변경**:
    *   파일 내부에 존재하는 `showScreen` 및 `initApp` 함수와 관련된 모든 코드(함수 정의 및 해당 함수 내에 포함된 로직)를 완전히 제거합니다.
    *   `showTooltip` 및 `hideTooltip` 함수는 필요하다면 `src/utils.js`와 같은 범용 유틸리티 모듈로 이동하거나, `app.js`에서 직접 정의하여 사용하도록 변경합니다. `initEventHandlers` 함수만 남겨두고, 이 함수는 `app.js`에서 호출되어 이벤트 리스너만 등록하도록 합니다.
    *   필요 없는 `import` 문을 정리합니다.
*   **`src/app.js` 변경**:
    *   `initEventHandlers(DOM, globalTooltip)`를 호출하는 `initApp` 함수에서 `globalTooltip` 인자를 직접 전달하도록 합니다.
    *   `showTooltip` 및 `hideTooltip` 함수가 `src/utils.js`로 이동할 경우, `app.js`에서 해당 유틸리티를 `import`하여 사용하도록 변경합니다.

### 2.4. 현재 상태 및 결정

이 리팩토링은 코드의 모듈성, 가독성, 유지보수성을 크게 향상시키지만, 현재 애플리케이션에 기능적인 오류가 없는 상태에서 코드 변경은 현재 작업 범주에 포함되지 않는다는 사용자 지시에 따라 보류되었습니다.

향후 리팩토링 작업 시 `src/global-event-listeners.js` 모듈 리팩토링과 함께 고려될 수 있도록 이슈로 기록합니다.