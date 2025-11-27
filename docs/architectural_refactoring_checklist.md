# 리팩토링 명세서: 보스 알리미 v5.0 (구조 개선 실행 계획)

## 1.0 개요 및 최종 전략

이 문서는 `architectural_refactoring_plan.md`에 기술된 제안들을 실행하기 위한 구체적인 단계별 체크리스트를 정의합니다. 본 계획의 목표는 코드의 확장성, 유지보수성, 안정성을 극대화하는 것입니다.

**핵심 원칙:**
1.  **사전 심층 분석:** 각 단계를 실행하기 직전, 해당 작업의 영향 범위를 다시 확인하고 잠재적 오류를 예측하여 작업 계획을 최종 확정합니다.
2.  **원자적 단계(Atomic Step):** 각 단계는 '하나의 함수 이전'과 같이 최소 단위의 작업으로 구성되며, 실행 후 즉시 검증합니다.
3.  **점진적 전환:** 대규모 변경을 한 번에 적용하지 않고, 점진적으로 안정적인 상태를 유지하며 전환합니다.
4.  **검증:** 코드 수정 후에는 반드시 제안된 검증 계획에 따라 기능이 올바르게 동작하는지 확인합니다.
5.  **사용자 검증 요청:** 각 단계의 코드 수정 후, 사용자에게 검증 계획을 제시하고 명시적인 확인을 요청합니다.

---

### **1단계: 라우터(Router) 도입 및 화면 초기화 매커니즘 개선**

**목표:** `showScreen` 함수의 복잡도를 낮추고, 화면 추가/제거 시 유연성을 확보하며, 일관된 화면 초기화 패턴을 정립합니다.

<details>
<summary><strong>1.1. `src/router.js` 파일 생성 및 기본 구조 작성</strong></summary>

- [ ] **사전 분석:** 없음 (새 파일 생성).
- [ ] **실행 계획:** `src/router.js` 경로에 아래 내용으로 새 파일을 생성합니다.
    ```javascript
    // src/router.js
    const routes = {}; // 화면 정보를 담을 라우팅 테이블
    
    export function getRoute(screenId) {
        return routes[screenId];
    }
    
    export function registerRoute(screenId, screenModule) {
        routes[screenId] = screenModule;
    }
    ```
- [ ] **검증:** 없음.
- [ ] **커밋 제안:** `feat(core): 중앙 화면 관리를 위한 라우터 모듈 생성`
</details>

<details>
<summary><strong>1.2. 화면 모듈에 `getScreen` 함수 추가 및 라우터에 등록</strong></summary>

- [ ] **사전 분석:** `screens` 디렉토리 내의 모든 화면 모듈 파일 목록을 확인합니다. 각 파일은 `init...Screen` 또는 유사한 초기화 함수를 `export` 하고 있습니다.
- [ ] **실행 계획:**
    1.  각 화면 모듈(예: `dashboard.js`, `help.js` 등)에 해당 화면의 정보를 반환하는 `getScreen` 함수를 추가하고 `export` 합니다.
        ```javascript
        // 예시: src/screens/help.js
        // ... 기존 import
        
        export function initHelpScreen(DOM) { /*...*/ }
        
        export function getScreen() {
            return {
                id: 'help-screen',
                init: initHelpScreen
            };
        }
        ```
    2.  `app.js` (또는 리팩토링 후 생성될 `initializer.js` 등)에서 모든 `getScreen` 함수를 `import` 하여 `router.js`의 `registerRoute`를 통해 등록하는 로직을 추가합니다.
- [ ] **검증:** 모든 화면 모듈에 `getScreen` 함수가 추가되고, 라우터에 정상적으로 등록되는지 확인합니다. (기능 변경 없음)
- [ ] **커밋 제안:** `feat(screens): 각 화면 모듈에 메타 정보 반환 함수 추가 및 라우터 등록`
</details>

<details>
<summary><strong>1.3. `event-handlers.js`의 `showScreen` 함수를 라우터 사용하도록 리팩토링</strong></summary>

- [ ] **사전 분석:** `app.js`의 `showScreen` 함수 내부에 있는 긴 `if (screenId === ...)` 분기문을 확인합니다. (참고: `showScreen` 함수는 `app.js`로 이전되었습니다.)
- [ ] **실행 계획:**
    1.  `src/app.js` 상단에 `import { getRoute } from './router.js';`를 추가합니다.
    2.  `showScreen` 함수 내부의 `if` 분기문을 아래와 같이 라우터를 사용하는 코드로 대체합니다.
        ```javascript
        // ... (화면 숨김 및 네비게이션 링크 활성화 로직)
        
        const screen = getRoute(screenId);
        if (screen && screen.init) {
            screen.init(DOM);
        }
        
        // EventBus를 사용하는 모듈은 그대로 유지
        if (screenId === 'dashboard-screen') {
            EventBus.emit('refresh-dashboard', DOM);
        }
        if (screenId === 'boss-scheduler-screen') {
            EventBus.emit('show-boss-scheduler-screen');
        }
        // 대시보드와 같이 동적 콘텐츠가 많은 화면의 경우, 초기 활성화 시 즉시 렌더링 함수를 호출하여 화면 표시 지연을 방지합니다.
        if (screenId === 'dashboard-screen') {
            renderDashboard(DOM); // renderDashboard는 ui-renderer.js에서 import 필요
        }
        ```
    3.  `initEventHandlers` 함수에 있던 화면별 `init...Screen()` 호출들을 제거하고, 라우터가 담당하도록 구조를 단순화합니다.
- [ ] **검증:** 애플리케이션의 모든 메뉴(사이드바, 하단 탭)를 클릭하여 모든 화면이 이전과 같이 정상적으로 표시되고 기능하는지 전체 회귀 테스트를 수행합니다.
- [ ] **커밋 제안:** `refactor(core): showScreen이 중앙 라우터를 사용하도록 변경`
</details>

---

### **2단계: `event-handlers.js` 역할 축소 및 `initApp` 함수 분해**

**목표:** 거대 함수인 `initApp`을 책임별로 분리하여 가독성과 유지보수성을 높입니다.

<details>
<summary><strong>2.1. `src/services.js` 생성 및 핵심 서비스 초기화 로직 이전</strong></summary>

- [ ] **사전 분석:** `initApp` 함수에서 `initLogger`, `loadBossLists`, `LocalStorageManager.init`, `CustomListManager.init` 등 서비스 초기화와 관련된 코드를 식별합니다.
- [ ] **실행 계획:**
    1.  `src/services.js` 파일을 새로 생성합니다.
    2.  `initializeCoreServices(DOM)` 라는 `async` 함수를 만들어 해당 로직을 옮기고 `export` 합니다.
    3.  `app.js`의 `initApp`에서 `initializeCoreServices`를 `import` 하여 호출합니다.
- [ ] **주의사항:** `initializeCoreServices` 내에서 초기화되는 `LocalStorageManager`, `CustomListManager` 등 데이터 관리자들은 `initApp`에서 `BossDataManager.subscribe` 전에 완전히 초기화되어야 합니다.
- [ ] **검증:** 앱을 새로고침했을 때, 로그, 보스 목록, 로컬 스토리지 데이터가 모두 정상적으로 로드되는지 확인합니다.
- [ ] **커밋 제안:** `refactor(core): 핵심 서비스 초기화 로직을 services.js로 분리`
</details>

<details>
<summary><strong>2.2. 초기 데이터 로딩 및 파싱 로직 분리</strong></summary>

- [ ] **사전 분석:** `app.js`의 `initApp` 함수에서 URL 파라미터를 파싱하고, 기본 보스 목록을 설정하며, `parseBossList`를 호출하는 부분을 식별합니다.
- [ ] **실행 계획:**
    1.  `app.js` 내에 `loadInitialData(DOM)`와 같은 `async` 함수를 새로 만듭니다.
    2.  해당 로직을 `loadInitialData` 함수로 옮깁니다.
    3.  `app.js`의 `initApp`에서 `loadInitialData(DOM)`를 호출하도록 변경합니다.
- [ ] **검증:**
    1.  `?data=` 파라미터가 있는 URL로 접속 시, 공유된 목록이 정상적으로 로드되는지 확인합니다.
    2.  파라미터 없이 접속 시, 기본 보스 목록이 날짜와 함께 정상적으로 표시되는지 확인합니다.
- [ ] **커밋 제안:** `refactor(core): 초기 데이터 로딩 및 파싱 로직 함수로 분리`
</details>

---

### **3단계: 반응형 상태 관리(Reactive State Management) 패턴 도입**

**목표:** 상태 변경 시 UI가 자동으로 업데이트되도록 만들어, 수동 업데이트 호출 누락으로 인한 버그를 원천적으로 방지합니다.

<details>
<summary><strong>3.1. `data-managers.js`에 구독(subscribe) 기능 추가</strong></summary>

- [ ] **사전 분석:** `BossDataManager` 객체의 구조를 확인합니다.
- [ ] **실행 계획:**
    1.  `BossDataManager` 객체 내에 `subscribers` 배열을 추가합니다. (`let subscribers = [];`)
    2.  `subscribe(callback)` 메소드를 추가하여 `subscribers` 배열에 콜백 함수를 추가하는 로직을 작성합니다.
    3.  상태를 변경하는 함수(예: `setBossSchedule`, `setNextBossInfo`) 내부 마지막에, `subscribers` 배열을 순회하며 모든 콜백 함수를 실행하는 `notify()` 로직을 추가합니다.
- [ ] **검증:** 없음 (내부 구조 변경).
- [ ] **주의사항:** `BossDataManager`의 `subscribe` 메소드를 사용하는 모듈(예: `app.js`)에서는 `import { BossDataManager } from './data-managers.js';`와 같이 명시적으로 임포트해야 합니다.
- [ ] **커밋 제안:** `feat(state): 데이터 변경 감지를 위한 구독/알림 패턴 추가`
</details>

<details>
<summary><strong>3.2. 대시보드 자동 갱신 리팩토링</strong></summary>

- [ ] **사전 분석:** `EventBus.on('refresh-dashboard', ...)` 리스너와, 이 이벤트를 발생시키는 모든 `EventBus.emit('refresh-dashboard')` 호출 코드를 식별합니다. (`alarm-scheduler.js`, `app.js` 등)
- [ ] **실행 계획:**
    1.  `EventBus.on('refresh-dashboard', ...)` 리스너를 제거합니다. (이 리스너는 `app.js`나 다른 모듈에 존재할 수 있습니다.)
    2.  `app.js`의 `initApp` 함수 내부에 `BossDataManager.subscribe(() => renderDashboard(DOM));` 코드를 추가하여 데이터 변경 시 대시보드가 렌더링되도록 '구독'합니다.
    3.  프로젝트 전체에서 `EventBus.emit('refresh-dashboard')`를 호출하는 모든 코드를 찾아 제거합니다.
- [ ] **검증:**
    1.  알람을 켠 상태에서 1초마다 '다음 보스' 남은 시간이 자동으로 갱신되는지 확인합니다. (이것은 `app.js`의 `showScreen`에서 `setInterval`로 처리됩니다.)
    2.  '보스 관리' 화면에서 목록을 수정하거나 '시간순 정렬'을 눌렀을 때, 대시보드의 '다가오는 보스 목록'이 즉시 변경되는지 확인합니다.
- [ ] **커밋 제안:** `refactor(state): EventBus 기반의 수동 갱신을 구독 패턴으로 변경`
</details>

---

### **4단계: 렌더링 로직의 완전한 분리**

**목표:** 모든 HTML 생성 로직을 `ui-renderer.js`로 이전하여, 각 모듈의 책임을 명확히 합니다.

<details>
<summary><strong>4.1. `help.js`의 렌더링 로직을 `ui-renderer.js`로 이전</strong></summary>

- [ ] **사전 분석:** `screens/help.js`의 `initHelpScreen` 함수 내에서 `helpData`를 받아 HTML 문자열을 동적으로 생성하는 부분을 식별합니다.
- [ ] **실행 계획:**
    1.  `ui-renderer.js`에 `renderHelpScreen(DOM, helpData)` 함수를 새로 만들고, `help.js`의 HTML 생성 로직을 그대로 옮겨 `export` 합니다.
    2.  `screens/help.js`의 `initHelpScreen` 함수는 `loadJsonContent`로 데이터를 가져온 후, `renderHelpScreen(DOM, helpData)`를 호출하는 한 줄의 코드로 단순화합니다.
    3.  `ui-renderer.js`를 `import` 하도록 수정합니다.
- [ ] **검증:** '도움말' 화면으로 이동했을 때, 이전과 동일하게 아코디언 메뉴가 정상적으로 표시되고 작동하는지 확인합니다.
- [ ] **커밋 제안:** `refactor(ui): 도움말 화면 렌더링 로직을 ui-renderer로 이전`
</details>

<details>
<summary><strong>4.2. `version-info.js`의 렌더링 로직을 `ui-renderer.js`로 이전</strong></summary>

- [ ] **사전 분석:** `screens/version-info.js`의 `initVersionInfoScreen` 함수가 `renderVersionInfo`를 호출하고, 이 `renderVersionInfo`가 `ui-renderer.js`에 이미 존재하며 HTML 생성 로직을 포함하고 있음을 확인합니다. (이 구조는 이미 잘 분리되어 있으나, 일관성을 위해 호출 흐름을 명확히 합니다.)
- [ ] **실행 계획:** (`version-info.js`는 이미 `ui-renderer.js`의 함수를 호출하는 좋은 구조를 가지고 있으므로, 만약 자체 렌더링 로직이 있다면 이전합니다. 현재 구조에서는 코드 변경이 거의 필요 없을 수 있습니다. 재확인 후 필요 시 아래 계획 실행)
    1.  만약 `version-info.js` 내에 HTML 생성 로직이 있다면, `ui-renderer.js`의 `renderVersionInfo` 함수로 이전합니다.
    2.  `screens/version-info.js`는 `ui-renderer.js`의 `renderVersionInfo`를 호출하는 역할만 남깁니다.
- [ ] **검증:** '릴리즈 노트' 화면으로 이동했을 때, 버전 정보가 이전과 동일하게 표시되는지 확인합니다.
- [ ] **커밋 제안:** `refactor(ui): 릴리즈 노트 렌더링 책임 ui-renderer로 완전 위임`
</details>