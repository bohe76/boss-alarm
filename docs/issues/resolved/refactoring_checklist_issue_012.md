### **리팩토링 명세서: Issue-012 (코드 중복 및 모듈성 개선)**

#### **1.0 개요 및 최종 전략**

이 문서는 '보스 알리미' 애플리케이션의 코드 중복 및 모듈성 문제를 해결하기 위한 **`issue-012` 관련 리팩토링 실행 계획**을 정의합니다.

*   **배경:** `issue-012` 분석을 통해 `global-event-listeners.js`의 비활성화, `alarm-log.js`의 내부 로직 중복, `event-handlers.js`의 책임 원칙 위배 등 여러 유지보수 저해 요소가 식별되었습니다.
*   **V-issue-012의 핵심 - '사전 분석' 도입:** 이 계획은 각 단계를 실행하기 직전에 대상 코드를 다시 심층 분석하는 '사전 분석' 단계를 도입하여, 정적 계획의 한계를 극복하고 런타임 오류나 숨겨진 의존성으로 인한 부작용을 원천적으로 차단합니다.
*   **목표:** 이 문서는 단순한 체크리스트를 넘어, '분석 → 계획 → 실행 → 검증'을 각 단계마다 반복하는 **동적이고 안전한 리팩토링 워크플로우**를 제공하는 것을 목표로 합니다.

**핵심 원칙:**
1.  **사전 심층 분석:** 체크리스트의 각 항목을 실행하기 직전, 해당 작업만을 대상으로 영향 범위를 재확인하고 잠재적 오류를 예측하여 작업 계획을 최종 확정합니다.
2.  **원자적 단계:** 각 단계는 '하나의 함수 이전'과 같이 최소 단위의 작업으로 구성되며, 즉시 검증됩니다.
3.  **점진적 전환:** 대규모 아키텍처 변경을 한 번에 적용하지 않고, 점진적으로 안정적인 상태를 유지하며 전환합니다.
4.  **자동화 검증 우선:** 코드 수정 후에는 반드시 `npm run lint` 및 `npm test`를 실행하여 1차 검증을 수행합니다.
5.  **완료 표기 시점:** 모든 검증이 완료되고 커밋이 성공적으로 이루어지면 해당 체크리스트 항목을 완료(`[x]`)로 표시합니다.

---

### **1단계: 전역 이벤트 리스너 중앙화 (`global-event-listeners.js`)**

**목표:** `src/global-event-listeners.js`를 전역 `EventBus` 리스너의 단일 진실 공급원(Single Source of Truth)으로 활성화하여, 분산된 리스너들을 중앙에서 관리합니다.

<details>
<summary><strong>✅ 1.1. `app.js`에서 `initGlobalEventListeners` 호출 준비</strong></summary>

- [x] **사전 분석:** `app.js`의 `initApp` 함수 내에 `BossDataManager.subscribe(...)` 라인이 실제로 존재하는지, 그리고 `global-event-listeners.js` 파일이 `import` 가능한 상태인지 확인합니다.
- [x] **실행 계획 1 (Import):** `app.js` 파일 상단에 `import { initGlobalEventListeners } from './global-event-listeners.js';` 코드를 추가합니다.
- [x] **실행 계획 2 (리스너 코드 제거):** `app.js`의 `initApp` 함수 내에 있는 `BossDataManager.subscribe(() => renderDashboard(DOM));` 라인과 관련 주석을 삭제합니다.
- [x] **검증:** 앱을 실행하고 보스 목록을 수정했을 때, 대시보드의 '다음 보스' 정보가 **더 이상 자동으로 갱신되지 않아야 합니다.** (이는 중앙화된 리스너가 아직 활성화되지 않았기 때문에 발생하는 의도된 중간 단계의 '실패' 상태입니다.)
- [x] **커밋:** `git commit -m "refactor(app): 전역 리스너 중앙화를 위해 기존 구독 로직 제거"`
</details>

<details>
<summary><strong>✅ 1.2. `app.js`에서 `initGlobalEventListeners` 최종 활성화</strong></summary>

- [x] **사전 분석:** `app.js`의 `initApp` 함수 내에서, 다른 이벤트 핸들러 등록 직전(`initEventHandlers` 호출 전)이 `initGlobalEventListeners`를 호출하기에 가장 적절한 위치인지 최종 검토합니다.
- [x] **실행 계획:** `initApp` 함수 내 `initEventHandlers(DOM, globalTooltip);` 라인 바로 앞에 `initGlobalEventListeners(DOM);` 코드를 추가합니다.
- [x] **검증:**
    1.  알람을 시작하고 보스 목록을 수정/저장했을 때, 대시보드가 즉시 반응하여 '다음 보스' 정보를 갱신하는지 확인 (`BossDataManager.subscribe` 기능 검증).
    2.  '알림 로그' 화면으로 이동한 상태에서, 보스 알람이 울렸을 때(또는 다른 로그가 발생했을 때) 로그 목록이 실시간으로 갱신되는지 확인 (`EventBus.on('log-updated')` 기능 검증).
- [x] **커밋:** `git commit -m "feat(core): 전역 이벤트 리스너 중앙 집중화 및 활성화"`
</details>

---

### **2단계: `alarm-log.js` 내부 구조 개선**

**목표:** `initAlarmLogScreen` 함수의 중복 로직을 제거하고, 코드 구조를 명확하게 개선하여 가독성과 유지보수성을 높입니다.

<details>
<summary><strong>✅ 2.1. `initAlarmLogScreen` 함수 리팩토링</strong></summary>

- [x] **사전 분석:** 현재 `initAlarmLogScreen` 함수 내부에 토글 버튼의 상태를 불러와 적용하는 로직이 두 번 존재하며, 이벤트 리스너 등록 로직과 뒤섞여 있어 비효율적임을 재확인합니다.
- [x] **실행 계획:** `initAlarmLogScreen` 함수 전체를 아래의 개선된 구조의 코드로 교체합니다. 이 구조는 상태 로딩/적용 로직을 항상 실행하도록 보장하고, 이벤트 리스너는 단 한 번만 등록되도록 합니다.
    ```javascript
    export function initAlarmLogScreen(DOM) {
        // Ensure the toggle button state is loaded and applied on every transition
        let isToggleActive = LocalStorageManager.get(ALARM_LOG_TOGGLE_STATE_KEY);
        if (isToggleActive === null) { // If no state is saved, set to default
            isToggleActive = true;
            LocalStorageManager.set(ALARM_LOG_TOGGLE_STATE_KEY, isToggleActive);
        }
        // The "&&" is a safeguard in case the button is not in the DOM
        DOM.viewMoreLogsButton && DOM.viewMoreLogsButton.classList.toggle('active', isToggleActive);

        // Register the event listener only once
        if (DOM.viewMoreLogsButton && !isEventListenerRegistered) {
            isEventListenerRegistered = true; // Set flag to prevent re-registration
            DOM.viewMoreLogsButton.addEventListener('click', () => {
                const newState = DOM.viewMoreLogsButton.classList.toggle('active');
                LocalStorageManager.set(ALARM_LOG_TOGGLE_STATE_KEY, newState); // Save new state
                renderAlarmLog(DOM); // Re-render logs based on new toggle state
            });
        }

        renderAlarmLog(DOM); // Initial render for the screen
    }
    ```
- [x] **검증:**
    1.  '알림 로그' 화면에 처음 진입 시 '15개 보기' 버튼 상태가 올바르게 로드되고 로그가 정상 출력되는지 확인합니다.
    2.  다른 화면으로 이동했다가 다시 '알림 로그' 화면으로 돌아왔을 때도 버튼 상태가 유지되며, 로그가 정상 출력되는지 확인합니다.
    3.  '15개 보기' 버튼을 클릭했을 때 기능이 정상적으로 동작하고 상태가 LocalStorage에 저장되는지 확인합니다.
- [x] **커밋:** `git commit -m "refactor(alarm-log): initAlarmLogScreen 함수의 중복 로직 제거 및 구조 개선"`
</details>

---

### **3단계: `event-handlers.js` 모듈 책임 명확화**

**목표:** `event-handlers.js`에서 역할 범위를 벗어나는 중복되거나 사용되지 않는 코드를 제거하여, 순수한 DOM 이벤트 핸들러 등록 모듈로 만듭니다.

<details>
<summary><strong>✅ 3.1. 중복/데드 코드(`showScreen`, `initApp`) 제거</strong></summary>

- [x] **사전 분석:** `event-handlers.js` 파일 내에 `showScreen`과 `initApp` 함수의 전체 정의가 포함되어 있으며, 이 함수들은 `app.js`의 핵심 로직과 중복되고 현재 호출되지 않는 '죽은 코드(Dead Code)'임을 최종 확인합니다.
- [x] **실행 계획:** `event-handlers.js`에서 `function showScreen(DOM, screenId) { ... }`와 `export async function initApp() { ... }` 함수의 전체 정의를 삭제합니다.
- [x] **검증:** 코드 제거 후, 앱의 모든 화면 전환 기능과 새로고침 시 초기화 과정이 이전과 동일하게 완벽히 정상 동작하는지 확인합니다.
- [x] **커밋:** `git commit -m "refactor(event-handlers): 사용되지 않는 showScreen 및 initApp 중복 함수 제거"`
</details>

<details>
<summary><strong>✅ 3.2. 불필요한 `import` 문 정리</strong></summary>

- [x] **사전 분석:** `showScreen` 및 `initApp` 함수가 제거됨에 따라 더 이상 필요 없어진 `import` 문들이 있는지(예: `parseBossList`, `startAlarm`, `DefaultBossList` 등) 목록을 확인합니다.
- [x] **실행 계획:** `event-handlers.js` 파일 상단에서 더 이상 사용되지 않는 `import` 문을 모두 삭제합니다.
- [x] **검증:**
    1.  `npm run lint` 명령어를 실행하여 "no-unused-vars"와 같은 린트 오류가 없는지 확인합니다.
    2.  애플리케이션의 모든 기능이 정상 동작하는지 최종적으로 확인합니다.
- [x] **커밋:** `git commit -m "chore(event-handlers): 모듈 리팩토링 후 불필요한 import 문 정리"`
</details>