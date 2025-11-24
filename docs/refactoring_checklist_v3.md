### **리팩토링 명세서: 보스 알리미 v3.0 (안전 실행 계획)**

#### **1.0 개요 및 새로운 전략**

이 문서는 보스 알리미 v2.0 아키텍처 리팩토링을 위한 구체적이고, 안전하며, 검증 가능한 실행 계획을 정의합니다. 기존 계획(v2)이 '무엇을'에 집중했다면, v3는 **'어떤 순서로, 어떤 의존성을 고려하여'** 작업을 수행해야 하는지에 집중하여, 리팩토링 과정에서 발생할 수 있는 콘솔 오류 및 사이드 이펙트를 원천적으로 차단하는 것을 목표로 합니다.

**핵심 원칙:**
1.  **의존성 우선 분석:** 모든 코드 변경은 해당 코드가 의존하는 다른 모듈 및 함수를 명확히 식별한 후 진행합니다.
2.  **원자적 단계:** 각 단계는 '하나의 함수 이전', '하나의 파일 이름 변경' 등과 같이 최소 단위의 작업으로 구성되며, 즉시 검증 및 커밋됩니다.
3.  **점진적 전환:** 대규모 아키텍처 변경을 한 번에 적용하지 않고, 점진적으로 안정적인 상태를 유지하며 전환합니다.

---

### **0단계: 기반 다지기 - 순수 유틸리티 통합 (`utils.js`)**

**목표:** 코드베이스 전반에 흩어져 있거나 중복된 순수 헬퍼 함수들을 의존성이 없는 중앙 라이브러리(`utils.js`)로 통합합니다. 이 단계는 모든 후속 작업을 위한 견고하고 예측 가능한 기반을 제공합니다.

**명세:** 각 단계는 명시된 순서대로 정확하게 수행되어야 합니다.

<details>
<summary><strong>0.1. `src/utils.js` 파일 생성</strong></summary>

- [ ] **작업:** `src/utils.js` 경로에 비어 있는 새 파일을 생성합니다.
- [ ] **커밋:** `git commit -m "chore(utils): 유틸리티 모듈 파일 생성"`
</details>

<details>
<summary><strong>0.2. `padNumber` 함수 생성 및 이전</strong></summary>

- [ ] **작업:** `src/ui-renderer.js`의 `formatTimeDifference` 함수 내의 `pad` 함수 로직을 기반으로, `src/utils.js`에 `padNumber` 함수를 생성하고 `export` 합니다.
    ```javascript
    // src/utils.js
    /**
     * 숫자를 받아 2자리 문자열로 변환합니다. (예: 7 -> "07")
     * @param {number} number
     * @returns {string}
     */
    export function padNumber(number) {
        return String(number).padStart(2, '0');
    }
    ```
- [ ] **커밋:** `git commit -m "feat(utils): 숫자 패딩을 위한 padNumber 유틸리티 함수 추가"`
</details>

<details>
<summary><strong>0.3. `formatMonthDay` 함수 이전 및 리팩토링</strong></summary>

- [ ] **작업 1 (이전 및 리팩토링):** `src/event-handlers.js`의 `initApp` 함수 내 `formatMonthDay` 로직을 `src/utils.js`로 옮기고, `padNumber`를 사용하도록 수정합니다.
    ```javascript
    // src/utils.js 파일 상단에 추가
    import { padNumber } from './utils.js'; 
    
    // 이전에 추가한 padNumber 함수 아래에 추가
    export function formatMonthDay(date) {
        const month = padNumber(date.getMonth() + 1);
        const day = padNumber(date.getDate());
        return `${month}.${day}`;
    }
    ```
- [ ] **작업 2 (가져오기):** `src/event-handlers.js` 파일 상단에 `import { formatMonthDay } from './utils.js';`를 추가합니다.
- [ ] **작업 3 (삭제):** `src/event-handlers.js`의 `initApp` 함수 내에서 기존 `const formatMonthDay = ...` 라인을 삭제합니다.
- [ ] **검증:** 브라우저 로컬 스토리지를 비우고 앱을 새로고침했을 때, 보스 목록 텍스트 영역에 오늘과 내일 날짜(`MM.DD`)가 정상적으로 추가되는지 확인합니다.
- [ ] **커밋:** `git commit -m "refactor(utils): formatMonthDay를 utils.js로 이동 및 리팩토링"`
</details>

<details>
<summary><strong>0.4. `isValidTime` 함수 통합 (중복 제거)</strong></summary>

- [ ] **작업 1 (생성):** `src/utils.js`에 `isValidTime` 함수를 추가하고 `export` 합니다.
    ```javascript
    // src/utils.js
    export function isValidTime(time) {
        return /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/.test(time);
    }
    ```
- [ ] **작업 2 (삭제 및 가져오기):** `src/ui-renderer.js`에서 기존 `const isValidTime = ...` 라인을 **삭제**하고, 파일 상단에 `import { isValidTime } from './utils.js';`를 추가합니다.
- [ ] **작업 3 (삭제 및 가져오기):** `src/event-handlers.js`에서 기존 `const isValidTime = ...` 라인을 **삭제**하고, 파일 상단에 `import { isValidTime } from './utils.js';`를 추가합니다.
- [ ] **검증:** '알림 설정' 화면에서 '새 고정 알림 추가' 시, 유효하지 않은 시간(예: `99:99`)을 입력하면 오류 메시지가 로그에 정상적으로 출력되는지 확인합니다.
- [ ] **커밋:** `git commit -m "refactor(utils): 중복된 isValidTime 함수를 utils.js로 통합"`
</details>

<details>
<summary><strong>0.5. `formatTime` 함수 이전</strong></summary>

- [ ] **작업 1 (이전 및 리팩토링):** `src/light-calculator.js`에서 `export const formatTime = ...` 함수를 잘라내 `src/utils.js`에 붙여넣고, `padNumber`를 사용하도록 수정합니다.
    ```javascript
    // src/utils.js
    export function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${padNumber(minutes)}:${padNumber(remainingSeconds)}`;
    }
    ```
- [ ] **작업 2 (가져오기):** `src/light-calculator.js` 파일 상단에 `import { formatTime } from './utils.js';`를 추가합니다.
- [ ] **작업 3 (가져오기 수정):** `src/event-handlers.js` 파일 상단의 `import { LightCalculator, formatTime } from './light-calculator.js';`를 `import { LightCalculator } from './light-calculator.js';`와 `import { formatTime } from './utils.js';`로 분리/수정합니다.
- [ ] **검증:** '계산기' 화면 > '광 계산기'에서 스톱워치를 시작하고, 시간 표시가 `MM:SS` 형식으로 정상 업데이트되는지 확인합니다.
- [ ] **커밋:** `git commit -m "refactor(utils): formatTime을 utils.js로 이동"`
</details>

<details>
<summary><strong>0.6. `formatTimeDifference` 함수 이전</strong></summary>

- [ ] **작업 1 (이전 및 리팩토링):** `src/ui-renderer.js`에서 `function formatTimeDifference(...)`를 잘라내 `src/utils.js`에 붙여넣고, `padNumber`를 사용하도록 수정합니다.
    ```javascript
    // src/utils.js
    export function formatTimeDifference(ms, showSeconds = true) {
        if (ms <= 0 || ms === Infinity) return showSeconds ? '(00:00:00)' : '(00:00)';
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (showSeconds) {
            return `(${padNumber(hours)}:${padNumber(minutes)}:${padNumber(seconds)})`;
        } else {
            return `(${padNumber(hours)}:${padNumber(minutes)})`;
        }
    }
    ```
- [ ] **작업 2 (가져오기):** `src/ui-renderer.js` 파일 상단에 `import { formatTimeDifference } from './utils.js';`를 추가합니다.
- [ ] **검증:** '대시보드' 화면에서 '다음 보스'와 '다가오는 보스 목록'의 남은 시간이 `(HH:MM:SS)` 형식으로 정상 표시되는지 확인합니다.
- [ ] **커밋:** `git commit -m "refactor(utils): formatTimeDifference를 utils.js로 이동"`
</details>

<details>
<summary><strong>0.7. `formatSpawnTime` 함수 이전</strong></summary>

- [ ] **작업 1 (이전):** `src/ui-renderer.js`에서 `function formatSpawnTime(...)`을 잘라내 `src/utils.js`에 붙여넣고 `export`합니다.
- [ ] **작업 2 (가져오기):** `src/ui-renderer.js` 파일 상단에 `import { formatSpawnTime } from './utils.js';`를 추가합니다.
- [ ] **검증:** '대시보드' 화면에서 '다음 보스'와 '다가오는 보스 목록'의 출현 시간이 `[HH:MM:SS]` 형식으로 정상 표시되는지 확인합니다.
- [ ] **커밋:** `git commit -m "refactor(utils): formatSpawnTime을 utils.js로 이동"`
</details>

<details>
<summary><strong>0.8. `generateUniqueId` 함수 이전</strong></summary>

- [ ] **작업 1 (이전):** `src/boss-parser.js`에서 `function generateUniqueId() { ... }`를 잘라내 `src/utils.js`에 붙여넣고 `export`합니다.
- [ ] **작업 2 (가져오기):** `src/boss-parser.js` 파일 상단에 `import { generateUniqueId } from './utils.js';`를 추가합니다.
- [ ] **검증:** 보스 목록을 수정하고, 알람을 켠 상태에서 수정된 보스 알람이 정상적으로 울리는지 확인합니다.
- [ ] **커밋:** `git commit -m "refactor(utils): generateUniqueId를 utils.js로 이동"`
</details>

---

### **1단계: 아키텍처 재정의 - `app.js` 및 `EventBus` 도입**

**목표:** `event-handlers.js`의 역할을 명확히 재정의하고, 향후 모듈 간 통신을 위한 기반(`EventBus`)을 마련합니다.

<details>
<summary><strong>1.1. `EventBus` 생성</strong></summary>

- [ ] **작업:** `src/event-bus.js`에 다음 내용으로 새 파일을 생성합니다.
    ```javascript
    // src/event-bus.js
    export const EventBus = {
        events: {},
        on(event, listener) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(listener);
        },
        emit(event, data) {
            if (this.events[event]) {
                this.events[event].forEach(listener => listener(data));
            }
        }
    };
    ```
- [ ] **커밋:** `git commit -m "feat(core): pub/sub 아키텍처를 위한 중앙 EventBus 생성"`
</details>

<details>
<summary><strong>1.2. `app.js`로 이름 변경 및 진입점 수정</strong></summary>

- [ ] **작업 1 (이름 변경):** `src/event-handlers.js` 파일의 이름을 `src/app.js`로 변경합니다.
- [ ] **작업 2 (HTML 수정):** `index.html` 파일을 열어 `<script type="module" src="src/event-handlers.js"></script>` 라인을 찾아 `<script type="module" src="src/app.js"></script>`로 **수정**합니다.
- [ ] **검증:** 애플리케이션을 새로고침했을 때, 모든 기능(알람, 화면 전환, 계산기 등)이 이전과 동일하게 정상적으로 동작하는지 확인합니다.
- [ ] **커밋:** `git commit -m "refactor(core): event-handlers.js를 app.js로 이름 변경하고 메인 진입점으로 설정"`
</details>

---

### **2단계: 기능별 모듈 분리**

**목표:** `app.js`에 혼재된 기능별 로직을 독립적인 `screens` 모듈로 분리하여 단일 책임 원칙을 적용합니다.

<details>
<summary><strong>2.1. `boss-management` 모듈 생성 및 로직 이전</strong></summary>

- [ ] **작업 1 (디렉토리 및 파일 생성):** `src/screens` 디렉토리를 생성하고, 그 안에 `boss-management.js` 파일을 새로 생성합니다.
- [ ] **작업 2 (로직 이전):** `src/app.js`의 `initEventHandlers` 함수에서 `DOM.sortBossListButton`과 `DOM.bossListInput`에 대한 이벤트 리스너 로직 두 개를 잘라내어, `src/screens/boss-management.js`에 붙여넣고 `initBossManagementScreen` 함수로 감싸 `export`합니다.
    ```javascript
    // src/screens/boss-management.js
    import { getSortedBossListText, parseBossList } from '../boss-parser.js';
    import { log } from '../logger.js';
    import { renderDashboard } from '../ui-renderer.js';

    export function initBossManagementScreen(DOM) {
        DOM.sortBossListButton.addEventListener('click', () => {
            const currentText = DOM.bossListInput.value;
            const sortedText = getSortedBossListText(currentText);
            DOM.bossListInput.value = sortedText;
            parseBossList(DOM.bossListInput);
            log("보스 목록을 시간순으로 정렬했습니다.", true);
        });

        DOM.bossListInput.addEventListener('input', () => {
            parseBossList(DOM.bossListInput);
            renderDashboard(DOM); // Re-render dashboard to reflect changes
        });
    }
    ```
- [ ] **작업 3 (가져오기 및 호출):**
    - `src/app.js` 파일 상단에 `import { initBossManagementScreen } from './screens/boss-management.js';`를 추가합니다.
    - `src/app.js`의 `initApp` 함수 마지막 부분에 `initBossManagementScreen(DOM);` 호출을 추가합니다.
- [ ] **검증:**
    1.  '보스 관리' 화면으로 이동합니다.
    2.  텍스트 영역에 보스 목록을 수정하면 '다음 보스' 정보가 실시간으로 변경되는지 확인합니다.
    3.  '시간순 정렬' 버튼을 클릭하면 목록이 정렬되고, 로그가 남는지 확인합니다.
- [ ] **커밋:** `git commit -m "feat(screens): 보스 관리 로직을 boss-management.js 모듈로 분리"`
</details>

**(이후 다른 모든 기능에 대해 위와 같은 `생성 -> 이전 -> 가져오기 -> 호출 -> 검증 -> 커밋` 패턴을 반복합니다.)**

---

### **3단계: 최종 정리**

<details>
<summary><strong>3.1. 최종 감사 및 잔여 코드 제거</strong></summary>

- [ ] **작업:** 2단계가 완료된 후 `app.js` 파일을 전체적으로 검토하여, 다른 모듈로 이전되어 더 이상 사용되지 않는 `import` 문, 변수, 헬퍼 함수들을 모두 삭제합니다.
- [ ] **검증:** 모든 잔여 코드를 제거한 후에도 애플리케이션의 모든 기능이 정상적으로 동작하는지 마지막으로 확인합니다.
- [ ] **커밋:** `git commit -m "chore: 모듈식 리팩토링 완료 및 잔여 코드 정리"`
</details>
