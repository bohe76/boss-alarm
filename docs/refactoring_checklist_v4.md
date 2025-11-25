### **리팩토링 명세서: 보스 알리미 v4.0 (사전 분석 기반 실행 계획)**

#### **1.0 개요 및 최종 전략**

이 문서는 '보스 알리미' 애플리케이션의 아키텍처 리팩토링을 위한 **V4 최종 실행 계획**을 정의하며, 이전 버전의 모든 계획(V2, V3)을 대체합니다.

*   **배경:** 초기 리팩토링 계획(V2)은 목표를 제시했고, V3는 이를 체크리스트 형식으로 발전시켰습니다. 하지만 두 계획 모두 정적 분석에 기반하여, 실제 작업 시 발생할 수 있는 예기치 않은 오류에 대한 대응이 부족했습니다.
*   **V4의 핵심 - '사전 분석' 도입:** V4 계획의 가장 중요한 개선점은, 체크리스트의 각 단계를 **실행하기 직전에 대상 코드를 다시 심층 분석**하는 '사전 분석' 단계를 도입한 것입니다. 이는 정적 계획의 한계를 극복하고, 런타임 오류나 숨겨진 의존성으로 인한 부작용을 원천적으로 차단하기 위함입니다。
*   **목표:** 이 문서는 단순한 체크리스트를 넘어, '분석 → 계획 → 실행 → 검증'을 각 단계마다 반복하는 **동적이고 안전한 리팩토링 워크플로우**를 제공하는 것을 목표로 합니다.

**핵심 원칙:**
1.  **사전 심층 분석:** 체크리스트의 각 항목을 실행하기 직전, 해당 작업만을 대상으로 영향 범위를 재확인하고 잠재적 오류를 예측하여 작업 계획을 최종 확정합니다.
2.  **원자적 단계:** 각 단계는 '하나의 함수 이전'과 같이 최소 단위의 작업으로 구성되며, 즉시 검증됩니다.
3.  **점진적 전환:** 대규모 아키텍처 변경을 한 번에 적용하지 않고, 점진적으로 안정적인 상태를 유지하며 전환합니다。
4.  **완료 표기 시점:** 커밋 메시지 제안 및 승인 후 해당 체크리스트 항목을 완료(`[x]`)로 표시한다.

---

### **0단계: 기반 다지기 - 순수 유틸리티 통합 (`utils.js`)**

**목표:** 코드베이스 전반에 흩어져 있거나 중복된 순수 헬퍼 함수들을 의존성이 없는 중앙 라이브러리(`utils.js`)로 통합합니다.

<details>
<summary><strong>0.1. `src/utils.js` 파일 생성</strong></summary>

- [x] **사전 분석:** 없음 (새 파일 생성).
- [x] **실행 계획:** `src/utils.js` 경로에 비어 있는 새 파일을 생성합니다.
- [x] **검증:** 없음.
- [x] **커밋:** `git commit -m "chore(utils): 유틸리티 모듈 파일 생성"`
</details>

<details>
<summary><strong>0.2. `padNumber` 함수 생성</strong></summary>

- [x] **사전 분석:** `ui-renderer.js`의 `formatTimeDifference` 함수 내 `pad` 로직이 다른 외부 변수에 의존하지 않는 순수 로직인지 최종 확인합니다.
- [x] **실행 계획:** `src/utils.js`에 `padNumber` 함수를 생성하고 `export` 합니다.
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
- [x] **검증:** 없음 (새로운 함수 추가).
- [x] **커밋:** `git commit -m "feat(utils): 숫자 패딩을 위한 padNumber 유틸리티 함수 추가"`
</details>

<details>
<summary><strong>0.3. `formatMonthDay` 함수 이전 및 리팩토링</strong></summary>

- [x] **사전 분석:** `app.js`(`event-handlers.js`)의 `initApp` 함수 내에서 `formatMonthDay`가 사용하는 `date` 객체 외에 다른 지역 변수에 의존하지 않는지 최종 검증합니다。 `utils.js`에 `padNumber`가 먼저 추가되었는지 확인합니다.
- [x] **실행 계획 1 (이전/리팩토링):** `app.js`의 `initApp` 내 `formatMonthDay` 로직을 `src/utils.js`로 옮기고, `padNumber`를 사용하도록 수정합니다.
- [x] **실행 계획 2 (가져오기):** `src/app.js` 파일 상단에 `import { formatMonthDay } from './utils.js';`를 추가합니다.
- [x] **실행 계획 3 (삭제):** `src/app.js`의 `initApp` 내에서 기존 `const formatMonthDay = ...` 라인을 삭제합니다.
- [x] **검증:** 브라우저 로컬 스토리지를 비우고 앱을 새로고침했을 때, 보스 목록 텍스트 영역에 오늘과 내일 날짜(`MM.DD`)가 정상적으로 추가되는지 확인합니다.
- [x] **커밋:** `git commit -m "refactor(utils): formatMonthDay를 utils.js로 이동 및 리팩토링"`
</details>

<details>
<summary><strong>0.4. `isValidTime` 함수 통합 (중복 제거)</strong></summary>

- [x] **사전 분석:** `ui-renderer.js`와 `app.js` 양쪽에 정의된 `isValidTime` 함수의 내용이 100% 동일한지, 미묘한 차이는 없는지 최종 확인합니다。
- [x] **실행 계획 1 (생성):** `src/utils.js`에 `isValidTime` 함수를 추가하고 `export` 합니다.
- [x] **실행 계획 2 (삭제/가져오기):** `src/ui-renderer.js`에서 기존 함수를 삭제하고, `utils.js`에서 `import` 합니다.
- [x] **실행 계획 3 (삭제/가져오기):** `src/app.js`에서 기존 함수를 삭제하고, `utils.js`에서 `import` 합니다。
- [x] **검증:** '알림 설정' 화면에서 '새 고정 알림 추가' 시, 유효하지 않은 시간(예: `99:99`)을 입력하면 오류 메시지가 로그에 정상적으로 출력되는지 확인합니다.
- [x] **커밋:** `git commit -m "refactor(utils): 중복된 isValidTime 함수를 utils.js로 통합"`
</details>

<details>
<summary><strong>0.5. `formatTime` 함수 이전</strong></summary>

- [x] **사전 분석:** `light-calculator.js`에서 `formatTime`이 `export` 되어 `app.js`에서 사용되고 있음을 확인합니다. 이 경로를 `utils.js`로 변경했을 때 다른 영향이 없는지 확인합니다.
- [x] **실행 계획 1 (이전/리팩토링):** `light-calculator.js`에서 함수를 잘라내 `utils.js`에 붙여넣고, `padNumber`를 사용하도록 수정합니다.
- [x] **실행 계획 2 (가져오기):** `light-calculator.js` 상단에 `import { formatTime } from './utils.js';`를 추가합니다.
- [x] **실행 계획 3 (가져오기 수정):** `app.js`의 `import` 문을 `import { LightCalculator } from './light-calculator.js';`와 `import { formatTime } from './utils.js';`로 분리/수정합니다.
- [x] **검증:** '계산기' 화면 > '광 계산기'에서 스톱워치를 시작하고, 시간 표시가 `MM:SS` 형식으로 정상 업데이트되는지 확인합니다.
- [x] **커밋:** `git commit -m "refactor(utils): formatTime을 utils.js로 이동"`
</details>

<details>
<summary><strong>0.6. `formatTimeDifference` 함수 이전</strong></summary>

- [x] **사전 분석:** 이 함수가 `ui-renderer.js` 내부에서만 사용되는 것을 확인합니다. `utils.js`로 옮겨도 호출 구조에 변경이 없음을 확인합니다.
- [x] **실행 계획 1 (이전/리팩토링):** `ui-renderer.js`에서 함수를 잘라내 `utils.js`에 붙여넣고, `padNumber`를 사용하도록 수정합니다.
- [x] **실행 계획 2 (가져오기):** `ui-renderer.js` 상단에 `import { formatTimeDifference } from './utils.js';`를 추가합니다。
- [x] **검증:** '대시보드' 화면에서 '다음 보스'와 '다가오는 보스 목록'의 남은 시간이 `(HH:MM:SS)` 형식으로 정상 표시되는지 확인합니다.
- [x] **커밋:** `git commit -m "refactor(utils): formatTimeDifference를 utils.js로 이동"`
</details>

<details>
<summary><strong>0.7. `formatSpawnTime` 함수 이전</strong></summary>

- [x] **사전 분석:** 이 함수가 `ui-renderer.js` 내부에서만 사용되는 것을 확인합니다.
- [x] **실행 계획 1 (이전):** `ui-renderer.js`에서 함수를 잘라내 `utils.js`에 붙여넣고 `export`합니다.
- [x] **실행 계획 2 (가져오기):** `ui-renderer.js` 상단에 `import { formatSpawnTime } from './utils.js';`를 추가합니다.
- [x] **검증:** '대시보드' 화면에서 '다음 보스'와 '다가오는 보스 목록'의 출현 시간이 `[HH:MM:SS]` 형식으로 정상 표시되는지 확인합니다.
- [x] **커밋:** `git commit -m "refactor(utils): formatSpawnTime을 utils.js로 이동"`
</details>

<details>
<summary><strong>0.8. `generateUniqueId` 함수 이전</strong></summary>

- [x] **사전 분석:** 이 함수가 `boss-parser.js` 내부에서만 사용되며, 다른 의존성이 없음을 최종 확인합니다.
- [x] **실행 계획 1 (이전):** `boss-parser.js`에서 함수를 잘라내 `utils.js`에 붙여넣고 `export`합니다.
- [x] **실행 계획 2 (가져오기):** `boss-parser.js` 상단에 `import { generateUniqueId } from './utils.js';`를 추가합니다。
- [x] **검증:** 보스 목록을 수정하고 알람을 켰을 때, 수정된 보스 알람이 정상적으로 울리는지 확인합니다.
- [x] **커밋:** `git commit -m "refactor(utils): generateUniqueId를 utils.js로 이동"`
</details>

---

### **1단계: 아키텍처 재정의 - `app.js` 및 `EventBus` 도입**

<details>
<summary><strong>1.1. `EventBus` 생성</strong></summary>

- [x] **사전 분석:** 없음 (새 파일 생성).
- [x] **실행 계획:** `src/event-bus.js`에 명세된 코드로 새 파일을 생성합니다.
- [x] **검증:** 없음.
- [x] **커밋:** `git commit -m "feat(core): pub/sub 아키텍처를 위한 중앙 EventBus 생성"`
</details>

<details>
<summary><strong>1.2. `app.js`로 이름 변경 및 진입점 수정</strong></summary>
- [x] **사전 분석:** `index.html` 파일의 `<script>` 태그가 `src/event-handlers.js`를 가리키고 있음을 확인합니다. 이 경로를 변경하는 것 외에 다른 수정은 필요 없음을 확인합니다.
- [x] **실행 계획 1 (이름 변경):** `src/event-handlers.js` 파일의 이름을 `src/app.js`로 변경합니다.
- [x] **실행 계획 2 (HTML 수정):** `index.html` 파일의 `<script type="module" src="src/event-handlers.js"></script>` 라인을 `<script type="module" src="src/app.js"></script>`로 **수정**합니다.
- [x] **검증:** 앱을 새로고침했을 때, 모든 기능(알람, 화면 전환 등)이 이전과 동일하게 정상 동작하는지 확인합니다。
- [x] **커밋:** `git commit -m "refactor(core): event-handlers.js를 app.js로 이름 변경하고 메인 진입점으로 설정"`
</details>

---

### **2단계: 기능별 모듈 분리**

<details>
<summary><strong>2.1. `boss-management` 모듈 생성 및 로직 이전</strong></summary>

- [x] **사전 분석:** `app.js`에서 옮길 두 개의 이벤트 리스너가 `getSortedBossListText`, `parseBossList`, `log`, `renderDashboard` 함수에 의존함을 확인합니다. 이 `import` 문들이 `boss-management.js`로 올바르게 이동해야 함을 인지합니다. 또한, 이벤트 리스너는 앱 초기화 시 한 번만 등록되면 되므로, `initApp`에서 호출하는 구조가 적절함을 확인합니다。
- [x] **실행 계획 1 (디렉토리/파일 생성):** `src/screens` 디렉토리를 생성하고, 그 안에 `boss-management.js` 파일을 새로 생성합니다.
- [x] **실행 계획 2 (로직 이전):** `src/app.js`의 `initEventHandlers` 함수에서 `DOM.sortBossListButton`과 `DOM.bossListInput` 리스너 로직을 잘라내어, `src/screens/boss-management.js`에 `initBossManagementScreen` 함수로 감싸 `export`합니다.
- [x] **실행 계획 3 (가져오기/호출):** `src/app.js` 상단에 `initBossManagementScreen`를 `import`하고, `initApp` 함수 마지막에 `initBossManagementScreen(DOM);`을 호출합니다.
- [x] **검증:**
    1.  '보스 관리' 화면으로 이동합니다.
    2.  텍스트 영역에 보스 목록을 수정하면 '다음 보스' 정보가 실시간으로 변경되는지 확인합니다.
    3.  '시간순 정렬' 버튼을 클릭하면 목록이 정렬되고, 로그가 남는지 확인합니다.
- [x] **커밋:** `git commit -m "feat(screens): 보스 관리 로직을 boss-management.js 모듈로 분리"`
</details>

<details>
<summary><strong>2.2. `share` 모듈 생성 및 로직 이전</strong></summary>

- [ ] **사전 분석:** `app.js`의 `showScreen` 함수 내 'share-screen' 관련 로직이 `getShortUrl`, `LocalStorageManager.exportFixedAlarms`, `log` 함수에 의존함을 확인합니다. 이 로직은 화면이 표시될 때마다 실행되어야 하므로, 별도의 `init` 함수로 분리하고 `showScreen`에서 호출하는 것이 적절합니다.
- [ ] **실행 계획 1 (디렉토리/파일 생성):** `src/screens/share.js` 파일을 새로 생성합니다.
- [ ] **실행 계획 2 (로직 이전):** `src/app.js`의 `showScreen` 함수에서 'share-screen' 관련 로직을 잘라내어, `src/screens/share.js`에 `initShareScreen` 함수로 감싸 `export`합니다.
- [ ] **실행 계획 3 (가져오기/호출):** `src/app.js` 상단에 `initShareScreen`를 `import`하고, `showScreen` 함수 내 `screenId === 'share-screen'` 블록에서 `initShareScreen(this.DOM);`을 호출하도록 수정합니다.
- [ ] **검증:**
    1.  '공유' 화면으로 이동합니다.
    2.  "단축 URL이 클립보드에 복사되었습니다." 메시지가 정상적으로 표시되는지 확인합니다.
    3.  새 탭에서 붙여넣기(`Ctrl+V`)를 했을 때, 생성된 단축 URL이 올바르게 붙여넣어지는지 확인합니다.
- [ ] **커밋:** `git commit -m "feat(screens): 공유 로직을 share.js 모듈로 분리"`
</details>

<details>
<summary><strong>2.3. `calculator` 모듈 생성 및 로직 이전</strong></summary>

- [ ] **사전 분석:** `app.js`의 `initEventHandlers` 함수에 있는 'Zen Calculator' 및 'Light Calculator' 관련 모든 이벤트 리스너들의 의존성을 확인합니다. (`calculateBossAppearanceTime`, `LightCalculator`, `showToast`, `LocalStorageManager` 등)
- [ ] **실행 계획 1 (디렉토리/파일 생성):** `src/screens/calculator.js` 파일을 새로 생성합니다.
- [ ] **실행 계획 2 (로직 이전):** `src/app.js`의 `initEventHandlers`에서 'Zen Calculator'와 'Light Calculator' 관련 이벤트 리스너 로직을 모두 잘라내어 `src/screens/calculator.js`에 `initCalculatorScreen` 함수로 감싸 `export`합니다.
- [ ] **실행 계획 3 (가져오기/호출):** `src/app.js` 상단에 `initCalculatorScreen`를 `import`하고, `initEventHandlers` 함수에서 잘라낸 위치에 `initCalculatorScreen(DOM);`을 호출합니다.
- [ ] **검증:**
    1.  '계산기' 화면으로 이동합니다.
    2.  '젠 계산기'에 남은 시간을 입력하면 보스 출현 시간이 정상적으로 계산되는지 확인합니다.
    3.  젠 계산기의 '보스 시간 업데이트' 기능이 정상 작동하는지 확인합니다.
    4.  '광 계산기'의 '시작', '광', '잡힘' 버튼이 모두 정상 작동하고, 계산 결과가 목록에 저장되는지 확인합니다.
- [ ] **커밋:** `git commit -m "feat(screens): 계산기 화면 로직을 calculator.js 모듈로 분리"`
</details>

**(이후 다른 모든 기능에 대해 위와 같은 `사전 분석 -> 실행 계획 수립 -> 검증 -> 커밋` 패턴을 반복합니다.)**

---

### **3단계: 최종 정리**

<details>
<summary><strong>3.1. 최종 감사 및 잔여 코드 제거</strong></summary>

- [ ] **사전 분석:** 2단계까지 완료되면 `app.js`에 화면별 로직이 아닌, 전역 이벤트 리스너와 초기화 로직만 남아 있어야 함을 인지합니다.
- [ ] **실행 계획:** `app.js` 파일을 전체적으로 검토하여, 다른 모듈로 이전되어 더 이상 사용되지 않는 `import` 문, 변수, 헬퍼 함수들을 모두 삭제합니다.
- [ ] **검증:** 모든 잔여 코드를 제거한 후에도 애플리케이션의 모든 기능이 정상적으로 동작하는지 최종 확인합니다.
- [ ] **커밋:** `git commit -m "chore: 모듈식 리팩토링 완료 및 잔여 코드 정리"`
</details>
