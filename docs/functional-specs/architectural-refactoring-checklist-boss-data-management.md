---
id: architectural-refactoring-checklist-boss-data-management
title: "아키텍처 리팩토링 체크리스트: 보스 데이터 관리 기능 재편성 (v1.0)"
status: "해결됨" # 미해결 | 진행 중 | 해결됨
priority: "High"
assignee: "Gemini"
labels:
  - refactoring
  - checklist
  - ux
  - feature
created_date: "2025-12-18"
resolved_date: "2025-12-28"
---

# 리팩토링 명세서: 보스 데이터 관리 기능 재편성 (단계별 실행 계획)

## 1.0 개요 및 최종 전략

이 문서는 `docs/functional-specs/boss-data-management-reorganization.md`에 기술된 보스 데이터 관리 기능 재편성 및 UI/UX 개선 제안을 실행하기 위한 구체적인 단계별 체크리스트를 정의합니다. 목표는 사용자 경험 개선, 메뉴 명확성 증대, 그리고 코드의 유지보수성 및 확장성 확보입니다.

**핵심 원칙:**
1.  **점진적 변경:** 메뉴명 변경, UI 재배치, 로직 통합 등은 사용자에게 미치는 영향을 최소화하며 단계적으로 적용합니다.
2.  **데이터 무결성:** `BossDataManager`를 통한 SSOT 원칙을 엄수하며, 모드 전환 및 저장 시 데이터 일관성을 최우선으로 고려합니다.
3.  **철저한 검증:** 각 단계 후에는 단위 테스트 및 기능 테스트를 통해 변경 사항의 유효성을 확인합니다. **모든 검증 완료 후 `npm run lint` 및 `npm test`를 실행하여 코드 품질 및 기존 테스트 통과 여부를 확인합니다.**
4.  **UX 일관성:** '보스 설정'의 '뷰/편집' 토글과 같은 기존 UX 패턴을 적극 활용하여 학습 곡선을 최소화합니다.
5.  **심층 사전 분석:** 각 단계 시작 전, 변경으로 인한 모든 직접/간접적 코드 의존성 및 잠재적 사이드 이펙트를 철저히 분석하여 실행 계획을 확정합니다.
6.  **순차적 커밋:** 각 `<details>` 블록은 하나의 독립적인 커밋 단위입니다. 다음 단계로 넘어가기 전에 반드시 현재 단계를 커밋하고, `npm test`가 모든 테스트를 통과하는지 확인합니다. 검증 실패 시, 해당 단계의 커밋을 `git revert`하거나 `git reset --hard HEAD~1`로 이전 상태를 복구합니다.

> [!CAUTION]
> 이 체크리스트가 완료될 때까지, 보스 설정/시간표 및 보스 스케줄러 관련 기능에는 **새로운 기능 추가 또는 기존 로직 변경을 금지**합니다. (Feature Freeze) 버그 수정은 예외로 하되, 버그 수정 커밋은 본 체크리스트 작업과 별도 브랜치에서 수행합니다.

---

### **1단계: 기존 '보스 설정' 메뉴 -> '보스 시간표'로 변경 및 조회 전용화**

**목표:** `boss-management-screen`의 역할을 조회 전용으로 변경하고 메뉴명을 직관적으로 재정의합니다. `boss-management.js` 모듈을 `timetable.js`로 전환하며, 기존 편집 기능 및 관련 UI/로직을 제거합니다.

<details>
<summary><strong>1.1. `index.html` 메뉴명 변경 및 [시간표 수정하기] 버튼 추가</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `index.html` (메뉴 텍스트, 화면 제목, 버튼 추가), `src/dom-elements.js` (DOM 참조), `src/app.js` (라우팅/이벤트 핸들러).
    *   **의존성:**
        *   **메뉴 텍스트:** `<span class="menu-text">` 요소의 `textContent`와 `ariaLabel` 속성은 `src/app.js`의 `initEventHandlers`에서 내비게이션 링크 생성 및 추적에 사용됩니다.
        *   **화면 제목:** `h2` 태그의 `textContent`는 `app.js`의 `showScreen`에서 `screenNames` 맵에 따라 추적될 수 있습니다. (현재는 직접 사용되지는 않음).
        *   **`editTimetableButton`:** 새로 추가되는 버튼으로, `src/app.js`의 `initEventHandlers`에서 클릭 이벤트를 받아 `EventBus.emit('navigate', 'boss-scheduler-screen')`을 호출해야 합니다.
        *   **제거되는 버튼(`viewEditModeToggleButton`, `nextBossToggleButton`):** 이 버튼들은 `src/screens/boss-management.js` (향후 `timetable.js`)에서 이벤트 리스너를 등록하고 `LocalStorageManager` 상태를 변경하는 데 사용됩니다. HTML에서 제거하면 해당 JavaScript 로직도 제거되어야 합니다.
    *   **잠재적 사이드 이펙트:** 메뉴 텍스트 변경으로 인한 `app.js` 내 문자열 매칭 오류, 제거된 버튼에 대한 JavaScript 참조 오류.
- [ ] **실행 계획:**
    1.  `index.html`에서 `navBossManagement` (`id="navBossManagement"`) 내 `<span class="menu-text">보스 관리</span>`를 `<span class="menu-text">보스 시간표</span>`로 변경하고, `bottomNavBossManagement` (`id="bottomNavBossManagement"`)의 `ariaLabel`을 "보스 관리"에서 "보스 시간표"로 변경합니다.
    2.  `boss-management-screen` (`id="boss-management-screen"`) 내부의 `<h2>보스 설정</h2>` 제목을 `<h2>보스 시간표</h2>`로 변경합니다.
    3.  `boss-management-screen` 내 `boss-management-controls` (`class="boss-management-controls"`) 영역에 다음 HTML 코드를 추가하여 **`id="editTimetableButton"`**을 가진 Primary 색상의 "시간표 수정하기" 버튼을 삽입합니다.
        ```html
        <button id="editTimetableButton" class="button">시간표 수정하기</button>
        ```
    4.  기존 `viewEditModeToggleButton` (`id="viewEditModeToggleButton"`) 및 `nextBossToggleButton` (`id="nextBossToggleButton"`) 관련 HTML 요소를 제거합니다.
- [ ] **검증:**
    *   앱 실행 후 사이드바 및 하단 탭 메뉴에서 "보스 시간표"로 변경되었는지 시각적으로 확인합니다.
    *   "보스 시간표" 화면으로 이동 시, 제목이 "보스 시간표"로 표시되고 [시간표 수정하기] 버튼이 보이며, 기존 '뷰/편집' 토글 및 '다음 보스' 필터 토글 버튼들이 보이지 않는지 시각적으로 확인합니다.
    *   [시간표 수정하기] 버튼 클릭 시 콘솔에 `EventBus.emit('navigate', 'boss-scheduler-screen')`가 발생했음을 추적합니다. (개발자 도구의 Event Listener 탭 또는 EventBus Mocking 활용)
- [ ] **커밋 제안:** `feat(ui): '보스 설정' 메뉴명을 '보스 시간표'로 변경 및 수정 버튼 추가`
</details>

<details>
<summary><strong>1.2. `src/dom-elements.js`에 새로운 DOM 요소 참조 추가 및 기존 참조 변경/제거</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `src/dom-elements.js`, `src/app.js` (DOM 참조를 사용하는 모든 곳), `src/screens/boss-management.js` (향후 `timetable.js`).
    *   **의존성:** `initDomElements()`에서 반환하는 `DOM` 객체는 애플리케이션 전반에서 UI 요소에 접근하는 표준 방식입니다. 따라서 이름 변경 또는 제거 시 해당 참조를 사용하는 모든 곳을 찾아 업데이트해야 합니다.
    *   `DOM.viewEditModeToggleButton`, `DOM.nextBossToggleButton` 제거 시 `src/screens/boss-management.js`에서 이를 참조하는 로직이 오류를 발생시킬 수 있습니다.
- [ ] **실행 계획:** `initDomElements()` 함수 내에 다음 DOM 요소에 대한 참조를 추가/변경/제거합니다.
    *   **변경:** `navBossManagement`의 `id`를 `navTimetable`로 변경하고 `DOM.navTimetable`로 참조합니다.
    *   **변경:** `bottomNavBossManagement`의 `id`를 `bottomNavTimetable`로 변경하고 `DOM.bottomNavTimetable`로 참조합니다.
    *   **추가:** `editTimetableButton` (`id="editTimetableButton"`)에 대한 `DOM.editTimetableButton` 참조를 추가합니다.
    *   **제거:** `viewEditModeToggleButton` (`id="viewEditModeToggleButton"`) 및 `nextBossToggleButton` (`id="nextBossToggleButton"`)에 대한 참조를 제거합니다.
- [ ] **검증:** `initApp()` 호출 후 `console.log(DOM.navTimetable, DOM.editTimetableButton)` 등으로 새로운 참조가 유효한지 확인하고, 제거된 요소들이 `undefined`로 올바르게 처리되는지 확인합니다.
- [ ] **커밋 제안:** `chore(dom): '보스 시간표' 관련 DOM 요소 참조 업데이트`
</details>

<details>
<summary><strong>1.3. `src/app.js` 라우팅 및 이벤트 핸들러 업데이트</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `src/app.js` (import, `registerAllRoutes`, `showScreen`, `initEventHandlers`, `screenNames` 맵), `src/router.js`.
    *   **의존성:**
        *   `getBossManagementScreen` import 경로는 `src/screens/boss-management.js` (향후 `timetable.js`)와 연결됩니다.
        *   `registerRoute` 호출은 `router.js`의 라우팅 테이블을 업데이트합니다.
        *   `showScreen`의 내부 로직은 `screenId`에 따라 조건부 동작(예: `window.isBossListDirty` 체크)을 하므로, `screenId` 변경 시 해당 조건문도 업데이트해야 합니다.
        *   `initEventHandlers`는 모든 내비게이션 링크에 이벤트 리스너를 등록합니다. DOM 참조 이름 변경 시 이곳도 업데이트되어야 합니다.
        *   `screenNames` 맵은 Google Analytics 추적에 사용되므로, 변경된 `screenId`에 맞춰 업데이트해야 합니다.
- [ ] **실행 계획:**
    1.  `app.js` 상단에서 `import { getScreen as getBossManagementScreen } from './screens/boss-management.js';`를 `import { getScreen as getTimetableScreen } from './screens/timetable.js';`로 변경합니다. (별칭 및 파일명 변경 반영)
    2.  `registerAllRoutes()` 함수 내에서 `registerRoute('boss-management-screen', getBossManagementScreen());`를 `registerRoute('timetable-screen', getTimetableScreen());`로 변경합니다.
    3.  `showScreen` 함수 내에서 `boss-management-screen` ID를 사용하는 **모든 4곳**(Line 82, 98, 118 등)을 `timetable-screen`으로 변경합니다.
        *   `activeScreen.id === 'boss-management-screen'` (저장 안함 경고 조건): 이 조건 및 `window.isBossListDirty` 관련 로직은 '보스 시간표'가 조회 전용이 되므로 **제거**합니다.
        *   `screens` 배열 내 `DOM.bossManagementScreen` 참조를 `DOM.timetableScreen`으로 변경합니다.
        *   `screenNames` 객체 내 `'boss-management-screen'` 키를 `'timetable-screen': '보스 시간표'`로 변경합니다.
    4.  `initEventHandlers` 함수 내 `navLinks` (Line 273-275) 및 `bottomNavLinks` (Line 304-306) 배열 **모두에서** `DOM.navBossManagement`, `DOM.bottomNavBossManagement`를 `DOM.navTimetable`, `DOM.bottomNavTimetable`로 변경합니다.
    5.  `showScreen` 함수 내 `allNavLinks` 배열 (Line 137-140)에서 `DOM.navBossManagement`, `DOM.bottomNavBossManagement`를 `DOM.navTimetable`, `DOM.bottomNavTimetable`로 변경합니다.
    6.  `DOM.editTimetableButton`이 존재할 경우에만 클릭 이벤트 리스너를 추가하여 `EventBus.emit('navigate', 'boss-scheduler-screen')`을 발생시키도록 `initEventHandlers`를 수정합니다.
- [ ] **검증:**
    *   모든 내비게이션 링크(사이드바, 하단 탭, [시간표 수정하기] 버튼)를 통해 '보스 시간표' 화면으로 정상 이동하는지 확인합니다.
    *   '보스 시간표' 화면 진입 시 `app.js` 콘솔 로그에 오류가 없는지 확인합니다.
    *   Google Analytics 추적 이벤트가 변경된 `screenId`와 `screenName`으로 정확하게 발생하는지 확인합니다.
- [ ] **커밋 제안:** `refactor(routing): '보스 시간표' 라우팅 및 이벤트 핸들러 업데이트`
</details>

<details>
<summary><strong>1.4. `src/screens/boss-management.js` 파일명 변경 및 기능 조정 (`src/screens/timetable.js`)</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `src/screens/boss-management.js` 파일 자체, 그리고 이 파일을 `import` 하는 모든 모듈 (현재 `src/app.js`).
    *   **의존성:** `boss-management.js`는 `BossDataManager`, `LocalStorageManager`, `log`, `trackEvent`, `updateBossListTextarea`, `updateBossManagementUI`를 사용합니다. 파일명 변경 시 `app.js`에서 `import` 경로도 함께 변경해야 합니다. 모듈 내에서 사용하던 `EDIT_MODE`, `VIEW_MODE`, `DOM.viewEditModeToggleButton`, `DOM.nextBossToggleButton`, `DOM.sortBossListButton`, `DOM.bossListInput`, `window.isBossListDirty` 등은 제거되거나 다른 모듈로 이동해야 합니다. `startAutoRefresh`는 '보스 시간표'에서도 필요합니다.
    *   **유지되는 의존성:** `alarm-scheduler.js`의 `getIsAlarmRunning` import는 `startAutoRefresh`에서 계속 사용되므로 **유지**되어야 합니다.
    *   **기존 테스트 영향:** 이 변경으로 인해 `test/boss-management.test.js`가 영향을 받습니다. 코드 변경 후 바로 `npm test`를 실행하여 실패 케이스를 확인하고, 필요 시 테스트 코드를 먼저 수정합니다 (5단계 참조).
- [ ] **실행 계획:**
    1.  **파일명 변경:** `src/screens/boss-management.js`를 `src/screens/timetable.js`로 변경합니다.
    2.  `src/screens/timetable.js` 파일 내부에서 다음 로직을 제거하거나 변경합니다.
        *   `EDIT_MODE` 상수를 제거하고, `VIEW_MODE` 상수만 (`const VIEW_MODE = 'view';`) 유지합니다. (혹은 제거, 어차피 항상 뷰 모드이므로)
        *   `DOM.viewEditModeToggleButton`, `DOM.nextBossToggleButton` 관련 이벤트 리스너 및 이들을 사용하는 모든 로직을 제거합니다. (1.1에서 HTML 요소가 제거되었으므로)
        *   `DOM.sortBossListButton` (구 "보스 설정 저장" 버튼) 관련 이벤트 리스너 및 `parseBossList`, `BossDataManager.setBossSchedule` 호출 로직을 제거합니다.
        *   `DOM.bossListInput` 관련 `input` 이벤트 리스너 (`window.isBossListDirty` 설정) 및 `window.isBossListDirty` 관련 모든 로직을 제거합니다.
        *   `initBossManagementScreen` 함수명을 `initTimetableScreen`으로 변경합니다.
        *   `initTimetableScreen` 함수 내에서 `LocalStorageManager.get('bossManagementMode')` 관련 로직을 제거하고, `LocalStorageManager.get('bossManagementNextBossFilter')`만 유지합니다. `updateBossManagementUI` 호출 시 `currentMode` 인자를 `VIEW_MODE` 상수로 고정하거나 (혹은 아예 인자 없이) 호출하도록 변경합니다.
        *   `startAutoRefresh` 함수는 계속 유지하되, `currentMode` 확인 로직을 제거하고 `LocalStorageManager.get('bossManagementNextBossFilter')` 및 `getIsAlarmRunning()` 조건만으로 `updateBossManagementUI` (향후 `updateTimetableUI`)를 호출하도록 단순화합니다.
    3.  `getScreen()` 함수에서 반환하는 `id`를 `'timetable-screen'`으로 변경하고, `init` 함수로 `initTimetableScreen`을 반환하도록 합니다.
    4.  **`trackEvent` 라벨 변경:** 파일 내 `trackEvent` 호출 (Line 54, 69 등)의 라벨에서 `'보스 설정'`을 **`'보스 시간표'`**로 변경합니다. (GA 분석 데이터 일관성)
    5.  **LocalStorage 마이그레이션:** `initTimetableScreen` 함수 시작 부분에 `localStorage.removeItem('bossManagementMode');`를 호출하여 기존 사용자의 더 이상 사용되지 않는 데이터를 자동으로 정리합니다.
- [ ] **검증:**
    *   '보스 시간표' 화면으로 이동 시 JavaScript 콘솔에 오류가 없는지 확인합니다.
    *   화면에서 편집 관련 UI(텍스트 영역, 저장 버튼 등)가 보이지 않고, '다음 보스' 필터(UI 요소는 제거되었으나 로직은 남아있어야 함)와 카드 리스트 뷰가 작동하는지 확인합니다.
    *   `startAutoRefresh`가 알람 ON/OFF 및 필터 상태에 따라 정상적으로 뷰를 갱신하는지 확인합니다.
    *   `localStorage`에 `bossManagementMode` 키가 더 이상 존재하지 않는지 확인합니다.
- [ ] **커밋 제안:** `refactor(screens): 'boss-management.js'를 'timetable.js'로 전환 및 조회 전용화`
</details>

<details>
<summary><strong>1.5. `src/ui-renderer.js`의 `updateBossManagementUI` 및 `renderBossListTableView` 조정</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `src/ui-renderer.js` (함수명 변경, 로직 단순화), 이 함수들을 `import`하고 호출하는 모든 모듈 (현재 `src/app.js`, `src/screens/boss-management.js` (향후 `timetable.js`)).
    *   **의존성:** `updateBossManagementUI`는 `LocalStorageManager`, `renderBossListTableView`를 사용합니다. `renderBossListTableView`는 `BossDataManager`, `formatTimeDifference`, `formatSpawnTime`, `getKoreanDayOfWeek`를 사용합니다. 함수명 변경 시 이 함수들을 호출하는 모든 곳의 `import` 및 함수 호출도 업데이트해야 합니다.
    *   **잠재적 사이드 이펙트:** 함수명 변경으로 인한 호출자 오류, UI 렌더링 로직 변경으로 인한 화면 표시 오류.
- [ ] **실행 계획:**
    1.  `updateBossManagementUI` 함수를 `updateTimetableUI(DOM)`으로 이름을 변경하고, `mode` 인자를 제거합니다. 함수 내부 로직을 이제 항상 뷰 모드만 처리하도록 (`renderTimetableList` 호출만 남도록) 단순화합니다.
    2.  `renderBossListTableView` 함수를 `renderTimetableList(DOM, filterNextBoss)`로 이름을 변경합니다.
    3.  `updateTimetableUI` 함수 내에서 `renderTimetableList`를 호출하도록 수정합니다. (`filterNextBoss`는 `updateTimetableUI` 내부에서 `LocalStorageManager`로부터 가져옵니다.)
    4.  `src/app.js` 및 `src/screens/timetable.js`에서 이 함수들을 호출하는 모든 곳에서도 함수명 변경을 반영하고, 필요한 경우 `import` 문을 업데이트합니다.
- [ ] **검증:** '보스 시간표' 화면이 변경 전의 뷰 모드와 동일하게 작동하는지 확인합니다. 특히 '다음 보스' 필터 토글 시 갱신되는지 확인합니다.
- [ ] **커밋 제안:** `refactor(ui): '보스 시간표' UI 렌더링 함수 단순화`
</details>

---

### **2단계: '보스 스케줄러' -> 통합 입력 센터로 확장**

**목표:** '보스 스케줄러' 화면에 '스마트 입력'과 '텍스트 모드' 토글을 구현하고, 두 모드 간의 데이터 동기화를 처리합니다.

<details>
<summary><strong>2.1. `index.html`에 '보스 스케줄러' 화면을 위한 UI 요소 추가</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `index.html` (새로운 컨테이너, 버튼, 텍스트 영역 추가), `src/dom-elements.js` (DOM 참조), `src/screens/boss-scheduler.js` (이벤트 핸들러, UI 업데이트).
    *   **의존성:** 새로 추가되는 DOM 요소들(컨테이너, 토글 버튼, 텍스트 영역)은 `src/screens/boss-scheduler.js`에서 이벤트 리스너를 등록하고 상태에 따라 `display` 속성을 변경하는 데 사용됩니다. 특히 `.boss-input-header`가 `boss-list-display-container` 내부에 있으므로, `smartInputModeContainer`에 이를 포함해야 합니다.
    *   **스타일링:** 새로운 요소들에 대한 스타일은 `src/styles/screens.css`에 추가되어야 합니다.
    *   **잠재적 사이드 이펙트:** 기존 `boss-scheduler-screen`의 HTML 구조 변경으로 인한 기존 기능 오작동.
- [ ] **실행 계획:**
    1.  `boss-scheduler-screen` (`id="boss-scheduler-screen"`) 내부의 `<h2>보스 스케줄러</h2>` 제목 아래에 `id="schedulerInputModeToggle"`을 가진 컨테이너를 추가합니다. 이 컨테이너는 우측 정렬된 **`id="smartInputModeButton"`**과 **`id="textModeButton"`** 두 개의 버튼으로 구성됩니다. (`viewEditModeToggleButton`의 디자인을 재활용하여 CSS 적용)
        ```html
        <div id="schedulerInputModeToggle" class="boss-management-controls"> <!-- 기존 boss-management-controls 클래스 재활용 -->
            <button id="smartInputModeButton" class="button active">
                <!-- Smart Input 아이콘 --> 스마트 입력
            </button>
            <button id="textModeButton" class="button">
                <!-- Text Mode 아이콘 --> 텍스트 모드
            </button>
        </div>
        ```
    2.  기존 `boss-scheduler-screen`의 `div` 중에서 `class="boss-list-display-container card-standard card-size-list"`로 시작하는 부분을 찾습니다. 이 부분을 `<div id="smartInputModeContainer">` 태그로 감싸고, `schedulerInputModeToggle` 아래에 위치시킵니다.
    3.  `smartInputModeContainer` 아래에 `id="textModeContainer"`를 추가하고, 이 컨테이너 내부에 `id="textModeInput"` (textarea)과 '입력 형식 안내' 문구를 포함합니다. `textModeContainer`는 초기에 `style="display: none;"`으로 숨깁니다.
    4.  **`clearAllRemainingTimesButton` (`id="clearAllRemainingTimesButton"`)과 `moveToBossSettingsButton` (`id="moveToBossSettingsButton"`)**은 두 모드 모두에서 작동해야 하므로, `<div id="boss-scheduler-screen">`의 직계 자식으로 옮기거나, 두 컨테이너 (`smartInputModeContainer`, `textModeContainer`) 외부에 별도의 액션 버튼 컨테이너를 만들어 배치합니다. 여기서는 `boss-scheduler-screen`의 직계 자식으로 옮기는 것을 구조적으로 명확합니다.
- [ ] **검증:**
    *   '보스 스케줄러' 화면으로 이동 시, 제목 아래에 모드 토글 스위치가 우측 정렬되어 보이고, 기본적으로 스마트 입력 모드 UI (`smartInputModeContainer` 내용)가 나타나는지 확인합니다.
    *   토글 스위치를 눌렀을 때 (`smartInputModeButton` / `textModeButton` 클릭 시), 해당 모드의 컨테이너가 표시되고 다른 컨테이너는 숨겨지는지 확인합니다.
    *   `textModeContainer` 내부에 텍스트 영역과 안내 문구가 올바르게 표시되는지 확인합니다.
    *   `clearAllRemainingTimesButton`과 `moveToBossSettingsButton`이 모든 모드에서 올바르게 표시되고 작동하는지 확인합니다.
- [ ] **커밋 제안:** `feat(ui): '보스 스케줄러' 입력 모드 토글 및 텍스트 모드 UI 추가`
</details>

<details>
<summary><strong>2.2. `src/dom-elements.js`에 새로운 DOM 요소 참조 추가</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `src/dom-elements.js`, `src/screens/boss-scheduler.js`.
    *   **의존성:** `initDomElements()`에서 반환하는 `DOM` 객체를 통해 `boss-scheduler.js`에서 새로 추가된 UI 요소들에 접근하게 됩니다. 정확한 ID 매칭이 필수입니다.
- [ ] **실행 계획:** `initDomElements()` 함수 내에 다음 DOM 요소에 대한 참조를 추가합니다.
    *   `DOM.schedulerInputModeToggle` (`id="schedulerInputModeToggle"`)
    *   `DOM.smartInputModeButton` (`id="smartInputModeButton"`)
    *   `DOM.textModeButton` (`id="textModeButton"`)
    *   `DOM.smartInputModeContainer` (`id="smartInputModeContainer"`)
    *   `DOM.textModeContainer` (`id="textModeContainer"`)
    *   `DOM.textModeInput` (`id="textModeInput"`)
- [ ] **검증:** `initApp()` 호출 후 `console.log` 등으로 새로운 DOM 참조가 유효한지 확인합니다. `DOM.smartInputModeContainer`와 기존 `DOM.bossInputsContainer`가 올바르게 참조되는지 교차 확인합니다.
- [ ] **커밋 제안:** `chore(dom): '보스 스케줄러' 새로운 DOM 요소 참조 추가`
</details>

<details>
<summary><strong>2.3. `src/boss-parser.js` 비고(`_`) 파싱 로직 추가</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `src/boss-parser.js` (파싱 로직), `BossDataManager` (데이터 스키마), `src/ui-renderer.js` (텍스트 영역 렌더링), `src/screens/boss-scheduler.js` (모드 전환 동기화).
    *   **의존성:** `parseBossList`는 텍스트 입력의 핵심 처리기입니다. 여기서 비고를 올바르게 분리해야 `BossDataManager`에 `memo` 필드가 저장되고, `ui-renderer.js` 및 다른 화면에서 이 `memo` 필드를 활용할 수 있습니다. `Smart Merge` 로직은 기존 보스의 `id`를 보존하므로, `memo` 필드도 안전하게 업데이트될 것입니다.
    *   **잠재적 사이드 이펙트:** 파싱 로직 변경으로 인해 기존 `HH:MM 보스이름` 형식의 보스 이름이 잘못 파싱되거나, 예상치 못한 `#` 문자로 인해 이름이 잘리는 문제 발생 가능성. `#`이 이름에 포함된 경우의 처리 정책 필요 (현재는 `#` 이후는 무조건 비고로 간주).
- [ ] **실행 계획:**
    1.  `parseBossList` 함수 내 `lines.forEach` 루프에서 각 `line`을 파싱할 때 다음 로직을 추가합니다.
        *   `const parts = line.split(' ');`를 통해 시간과 나머지 부분을 분리합니다.
        *   `let remainingText = parts.slice(1).join(' ');` // 시간 문자열 뒤의 모든 내용
        *   `const hashIndex = remainingText.indexOf('#');`를 통해 `#`의 위치를 찾습니다.
        *   `let bossName = remainingText.trim();`
        *   `let memo = '';`
        *   `if (hashIndex !== -1) {`
            *   `bossName = remainingText.substring(0, hashIndex).trim();`
            *   `memo = remainingText.substring(hashIndex + 1).trim();`
        *   `}`
        *   `bossName`이 빈 문자열인 경우, (예: `13:00 #비고`) 유효하지 않은 보스 이름으로 간주하여 `errors.push()` 처리합니다. 이 경우 `success: false`를 반환해야 합니다.
    2.  `parsedBosses.push` 객체에 `memo: memo` 속성을 추가합니다.
    3.  `Smart Merge` 로직에서 `parsed` 보스의 `memo` 필드가 `existing` 보스의 `memo`를 덮어쓰도록 합니다. (현재 `...existing, ...bossData` 형태로 되어있어 자동으로 처리됩니다.)
- [ ] **검증:**
    *   단위 테스트 (신규): `test/boss-parser.test.js`에 다음 테스트 케이스를 추가합니다.
        *   `should correctly parse boss name and memo with '#' delimiter` (`HH:MM BossName #Memo`)
        *   `should parse boss name correctly when no '#' delimiter is present` (`HH:MM BossName`)
        *   `should handle empty memo after '#' delimiter` (`HH:MM BossName #`)
        *   `should add error if boss name is empty before '#' delimiter` (`HH:MM #Memo`)
        *   `should handle multiple '#' inside memo as part of memo` (`HH:MM BossName #Memo #with hash`)
    *   (수동 검증): 텍스트 모드에서 다양한 `#` 구분자 케이스로 입력 후 저장, 그리고 스마트 입력 모드 전환 시 비고가 필드에 올바르게 채워지는지, 오류 메시지가 올바르게 표시되는지 확인합니다.
- [ ] **커밋 제안:** `feat(parser): 보스 목록 파싱 시 '#' 구분자를 이용한 비고(memo) 처리 로직 추가`
</details>

<details>
<summary><strong>2.4. `src/screens/boss-scheduler.js` 로직 확장 (모드 전환, 동기화, 저장)</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `src/screens/boss-scheduler.js` (모듈 레벨 상태, 이벤트 리스너, UI 업데이트 로직, 저장 로직, 초기화 로직), `LocalStorageManager` (모드 상태 유지), `EventBus` (모드 전환 시 이벤트 발생), `BossDataManager` (데이터 저장). `boss-parser.js` (`parseBossList`), `ui-renderer.js` (`renderBossInputs`, `renderBossSchedulerScreen`, `updateBossListTextarea`).
    *   **의존성:** `_remainingTimes`, `_memoInputs` 모듈 변수가 각 모드의 상태를 임시로 저장합니다. `renderBossInputs`, `renderBossSchedulerScreen` (`ui-renderer.js`) 함수는 이 상태를 기반으로 UI를 렌더링합니다. `handleApplyBossSettings`는 `BossDataManager.setBossSchedule`을 호출합니다. `parseBossList` (`boss-parser.js`)를 사용하여 텍스트 모드의 내용을 파싱해야 합니다.
    *   **잠재적 사이드 이펙트:** 모드 전환 시 데이터 동기화 실패, 파싱 오류로 인한 데이터 손실, 불필요한 DOM 업데이트로 인한 성능 저하.
- [ ] **실행 계획:**
    1.  모듈 레벨 변수 `currentInputMode`를 추가하고 기본값 `'smart-input'`으로 설정합니다. `LocalStorageManager`에 `schedulerInputMode` 값을 로드하고 저장하는 메소드(`get/setSchedulerInputMode`)를 추가하여 모드 상태가 유지되도록 합니다. (`src/data-managers.js`에 추가)
    2.  `initBossSchedulerScreen` 함수에서 `DOM.smartInputModeButton`과 `DOM.textModeButton`에 `click` 이벤트 리스너를 추가합니다. 클릭 시 `currentInputMode`를 업데이트하고 `updateSchedulerUI(DOM)` 함수를 호출합니다.
    3.  `updateSchedulerUI(DOM)` 함수를 새로 만듭니다.
        *   `currentInputMode`에 따라 `DOM.smartInputModeContainer` 또는 `DOM.textModeContainer`를 `display: block/none`으로 제어합니다.
        *   토글 버튼(`DOM.smartInputModeButton`, `DOM.textModeButton`)의 `active` 클래스를 업데이트합니다.
        *   모드 전환 시 데이터 동기화 로직을 호출합니다.
            *   **스마트 입력 -> 텍스트 모드:** `syncSmartToText(DOM)` 호출.
            *   **텍스트 모드 -> 스마트 입력:** `syncTextToSmart(DOM)` 호출.
    4.  `syncSmartToText(DOM)` 함수 구현: `_remainingTimes`, `_memoInputs` 및 `BossDataManager.getBossSchedule()`의 현재 데이터를 기반으로 텍스트 영역(`DOM.textModeInput`)에 `HH:MM 보스이름 #비고` 형식의 텍스트를 생성하여 채웁니다. 비고가 없는 경우 `#비고` 부분은 생략합니다.
    5.  `syncTextToSmart(DOM)` 함수 구현: `DOM.textModeInput.value`를 `boss-parser.js`의 `parseBossList`로 파싱하여 `_remainingTimes`, `_memoInputs`를 업데이트하고 스마트 입력 필드에 채웁니다.
        *   파싱 오류 발생 시 (`parseBossList`의 `success: false` 반환 시) `alert` 메시지 표시 후 **모드 전환을 취소하고 텍스트 모드를 유지**(즉, `currentInputMode`를 `text-mode`로 되돌리고 `updateSchedulerUI` 다시 호출)합니다.
    6.  `handleApplyBossSettings` 함수 수정:
        *   `currentInputMode`에 따라 다른 데이터 수집 로직을 수행합니다.
        *   텍스트 모드일 경우 `DOM.textModeInput.value`를 `boss-parser.js`로 파싱하여 `BossDataManager`에 저장합니다. (파싱 오류 시 저장 중단 및 `alert`)
    7.  "스케줄러 초기화" 버튼 (`DOM.clearAllRemainingTimesButton`) 클릭 시, `currentInputMode`에 따라 스마트 입력 필드 또는 텍스트 영역을 초기화하도록 로직을 확장합니다. (버튼 라벨을 "스케줄러 초기화"로 변경)
    8.  `handleShowScreen` 함수에서 `updateSchedulerUI(DOM)`를 호출하여 초기 화면 렌더링 시에도 모드 토글 및 데이터가 반영되도록 합니다.
    9.  `_remainingTimes` 및 `_memoInputs` 초기 로드: `BossDataManager.getBossSchedule()`을 기반으로 현재 저장된 보스들의 시간과 메모를 `_remainingTimes`, `_memoInputs`에 초기값으로 채워 넣습니다.
    10. **`EventBus.emit` 호출 수정:** `handleApplyBossSettings` 함수 내 `EventBus.emit('navigate', 'boss-management-screen')` (Line 143)을 `EventBus.emit('navigate', 'timetable-screen')`으로 변경합니다. (보스 설정 적용 후 이동 화면 ID 변경)
- [ ] **검증:**
    *   토글 스위치를 통해 두 모드 간 전환이 정상적으로 되는지 확인합니다.
    *   각 모드에서 데이터를 입력하고 다른 모드로 전환했을 때 데이터가 유지되는지 확인합니다. (파싱 오류 경고 테스트 포함)
    *   각 모드에서 입력 후 [보스 시간표 업데이트] 버튼 클릭 시, '보스 시간표' 화면에 데이터가 올바르게 반영되는지 확인합니다.
    *   [스케줄러 초기화] 버튼이 각 모드에서 올바르게 작동하는지 확인합니다.
    *   (단위 테스트): `test/boss-scheduler.init.test.js` 및 `test/boss-scheduler.apply.test.js`에 모드 전환 및 동기화 관련 테스트 케이스를 추가합니다.
- [ ] **커밋 제안:** `feat(scheduler): '보스 스케줄러' 통합 입력 로직 및 모드 전환 구현`
</details>

<details>
<summary><strong>2.5. `src/ui-renderer.js`의 `updateBossListTextarea` 수정</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `src/ui-renderer.js` (`updateBossListTextarea`), `BossDataManager` (데이터 조회), `src/screens/timetable.js` (구 `boss-management.js`), `src/screens/boss-scheduler.js` (텍스트 모드 렌더링).
    *   **의존성:** `updateBossListTextarea`는 `BossDataManager.getBossSchedule()`을 통해 데이터를 가져와 텍스트를 생성합니다. `memo` 필드 존재 여부에 따라 `#비고내용`을 붙여야 합니다. 이 함수는 '보스 시간표'의 텍스트 영역 (구 '보스 설정' 편집 모드)이나 '보스 스케줄러'의 텍스트 모드에서 사용될 수 있습니다. `boss-parser.js`의 파싱 로직과 역방향으로 동작해야 합니다.
- [ ] **실행 계획:**
    1.  `updateBossListTextarea` 함수 내 `currentItem.type === 'boss'` 조건에서, `boss.memo`가 존재하고 비어있지 않다면 `outputLines.push` 시 `HH:MM 보스이름 #비고내용` 형식으로 텍스트를 생성하도록 수정합니다. (비고가 없을 경우 `#`는 생략)
- [ ] **검증:**
    *   텍스트 모드에서 데이터를 입력 후 스마트 모드로 전환 시, 비고 내용이 올바르게 파싱되어 필드에 채워지는지 확인합니다.
    *   스마트 모드에서 비고 입력 후 텍스트 모드로 전환 시, `#`을 포함한 올바른 텍스트 형식으로 텍스트 영역에 채워지는지 확인합니다.
- [ ] **커밋 제안:** `refactor(ui): 텍스트 영역 렌더링 포맷에 비고(#) 포함`
</details>

---

### **3단계: 스타일링 및 최종 다듬기**

**목표:** 새로운 UI 요소들에 대한 스타일을 적용하고, 전체적인 UX를 다듬습니다.

<details>
<summary><strong>3.1. `src/styles/screens.css`에 새로운 UI 스타일 추가</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `src/styles/screens.css`, `index.html` (클래스/ID), `src/ui-renderer.js` (UI 생성).
    *   **의존성:** 새로 추가되는 `schedulerInputModeToggle`, `smartInputModeButton`, `textModeButton`, `textModeContainer`, `textModeInput` 클래스/ID를 타겟으로 스타일을 정의합니다. 기존 `boss-management-controls` 및 버튼 스타일을 재활용하여 일관된 디자인을 유지해야 합니다.
    *   **잠재적 사이드 이펙트:** 기존 스타일과의 충돌, 반응형 레이아웃 깨짐.
- [ ] **실행 계획:**
    1.  `schedulerInputModeToggle` (컨테이너)에 대한 스타일을 정의합니다. (우측 정렬, 제목과의 간격, `display: flex`, `gap`, `margin-top` 등) 기존 `.boss-management-controls` 클래스를 재활용하고 필요한 오버라이딩을 적용합니다.
    2.  `smartInputModeButton`과 `textModeButton`에 대한 스타일을 정의합니다. (버튼 기본 스타일, `active` 클래스 시 Primary 색상 적용, `focus` 스타일, 아이콘 배치 등) 기존 `.button` 클래스와 조합하여 일관성을 유지합니다.
    3.  `textModeContainer`와 `textModeInput`에 대한 스타일을 정의합니다. (width, height, padding, border 등) `textModeInput`은 `height: 400px` 이상으로 충분한 높이를 가지고, `width: 100%`를 차지하도록 합니다.
    4.  새로운 HTML 구조에 맞게 기존 CSS 셀렉터들을 조정합니다. (예: `boss-scheduler-screen` 하위의 요소들)
- [ ] **검증:**
    *   '보스 스케줄러' 화면으로 이동 시, 토글 스위치가 의도한 디자인으로 표시되는지 시각적으로 확인합니다.
    *   토글 전환 시, 컨테이너들이 올바르게 표시/숨김 되고 전환 효과가 자연스러운지 확인합니다.
    *   모바일/PC 각 환경에서 레이아웃이 깨지지 않고 반응형으로 잘 작동하는지 확인합니다.
- [ ] **커밋 제안:** `style(ui): '보스 스케줄러' 모드 토글 및 텍스트 모드 UI 스타일링`
</details>

---

### **4단계: 문서화 및 정리**

**목표:** 변경된 기능에 대한 모든 문서를 최신 상태로 업데이트하고 불필요한 파일을 정리합니다.

<details>
<summary><strong>4.1. `docs/functional-specs/index.md` 업데이트 및 기존 문서 정리</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `docs/functional-specs/index.md` (링크 업데이트), `docs/functional-specs/boss-management.md`, `docs/functional-specs/boss-scheduler.md` (이동 대상).
    *   **의존성:** `index.md`는 애플리케이션의 모든 기능 명세 문서에 대한 중앙 참조점입니다. 여기에 새로운 문서 링크를 추가하고, 대체되는 문서들의 링크를 제거해야 합니다. 기존 문서들은 아카이빙 폴더로 이동하여 기록을 보존합니다.
- [ ] **실행 계획:**
    1.  `docs/functional-specs/index.md`에서 `boss-management.md`와 `boss-scheduler.md`에 대한 링크 및 설명을 제거합니다.
    2.  새로운 `boss-data-management-reorganization.md`에 대한 링크와 설명을 적절한 위치에 추가합니다.
    3.  **기존 `docs/functional-specs/boss-management.md` 및 `docs/functional-specs/boss-scheduler.md` 파일을 `docs/archive` 폴더로 이동합니다.** (삭제하지 않고 기록 보존)
- [ ] **검증:** `index.md`를 열었을 때, 새 문서로의 링크가 올바른지, 구 문서 링크가 제거되었는지 확인합니다. 아카이빙 폴더에 구 문서들이 존재하는지 확인합니다.
- [ ] **커밋 제안:** `docs(functional-specs): 보스 데이터 관리 기능 재편성 문서 업데이트 및 구 문서 아카이빙`
</details>

<details>
<summary><strong>4.2. `docs/system_architecture.md`, `docs/system_module_details.md`, `docs/system_module_dependencies.md`, `docs/system_data_flow.md` 업데이트</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** 4개의 핵심 시스템 문서 전체.
    *   **의존성:** 이 문서들은 시스템의 고수준 아키텍처, 모듈별 역할, 의존성 관계, 데이터 흐름을 설명합니다. '보스 설정' -> '보스 시간표'로의 변경, '보스 스케줄러'의 기능 확장(통합 입력)은 이 모든 문서에 걸쳐 업데이트되어야 합니다. 파일명 변경(`boss-management.js` -> `timetable.js`)도 반영해야 합니다.
- [ ] **실행 계획:**
    1.  **`docs/system_architecture.md`:** 메뉴 구조 변경 및 통합 입력 센터로서의 '보스 스케줄러' 역할 변경을 반영하여 업데이트합니다.
    2.  **`docs/system_module_details.md`:**
        *   `src/screens/boss-management.js` 항목을 `src/screens/timetable.js`로 변경하고, 조회 전용 모듈로서의 역할과 제거된 기능(편집)을 명시합니다.
        *   `src/screens/boss-scheduler.js` 항목을 업데이트하여 스마트 입력/텍스트 모드 통합 로직, 모드 전환, 동기화 로직을 상세히 기술합니다.
        *   `src/boss-parser.js` 항목에 `#` 구분자 파싱 로직 추가를 반영합니다.
    3.  **`docs/system_module_dependencies.md`:** 모듈 간 의존성 관계 변화 (예: `app.js`가 `timetable.js`를 임포트, `timetable.js`가 `boss-scheduler-screen`으로 내비게이션 이벤트 발생)를 반영합니다.
    4.  **`docs/system_data_flow.md`:** '보스 시간표' 및 '보스 스케줄러'의 새로운 데이터 흐름 (모드 전환 동기화, `#` 파싱, `BossDataManager` 저장 시점 등)을 상세히 설명하는 새로운 섹션을 추가하거나 기존 섹션을 업데이트합니다.
- [ ] **검증:** 각 문서의 내용이 실제 구현 및 새로운 기능 명세와 일치하는지, 그리고 전체 시스템 아키텍처가 일관성을 유지하는지 검토합니다.
- [ ] **커밋 제안:** `docs(system): 시스템 문서에 보스 데이터 관리 기능 재편성 내용 반영`
</details>

---

### **5단계: 테스트 코드 업데이트 및 추가**

**목표:** 변경된 로직 및 새로운 UI 상호작용에 대한 테스트 커버리지를 확보하고, 회귀를 방지합니다.

<details>
<summary><strong>5.1. `test/boss-parser.test.js` 업데이트</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `test/boss-parser.test.js`, `src/boss-parser.js`.
    *   **의존성:** `boss-parser.js`의 `parseBossList` 함수 로직 변경에 따라, 기존 테스트가 `#` 구분자를 만나면 실패할 수 있습니다. 새로운 파싱 로직에 대한 명확한 단위 테스트가 필요합니다.
- [ ] **실행 계획:**
    1.  `test/boss-parser.test.js`에 다음 테스트 케이스를 추가합니다.
        *   `should correctly parse boss name and memo with '#' delimiter` (`HH:MM BossName #Memo`)
        *   `should parse boss name correctly when no '#' delimiter is present` (`HH:MM BossName`)
        *   `should handle empty memo after '#' delimiter` (`HH:MM BossName #`)
        *   `should add error if boss name is empty before '#' delimiter` (`HH:MM #Memo`)
        *   `should handle multiple '#' inside memo as part of memo` (`HH:MM BossName #Memo #with hash`)
    2.  기존 `parseBossList` 관련 테스트가 `#` 구분자 파싱 로직으로 인해 실패할 경우, 해당 테스트 데이터도 `#`이 없는 형태로 명확히 조정해야 합니다.
- [ ] **검증:** `npm test`를 실행하여 모든 테스트가 통과하는지 확인합니다.
- [ ] **커밋 제안:** `test(parser): '#' 구분자를 이용한 비고 파싱 테스트 추가`
</details>

<details>
<summary><strong>5.2. `test/boss-scheduler.init.test.js` 및 `test/boss-scheduler.apply.test.js` 업데이트</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `test/boss-scheduler.init.test.js`, `test/boss-scheduler.apply.test.js`, `src/screens/boss-scheduler.js` (UI, 로직), `src/ui-renderer.js` (렌더링), `BossDataManager`.
    *   **의존성:** `initBossSchedulerScreen` 및 `handleApplyBossSettings` 로직 변경에 따라 기존 테스트가 실패할 수 있습니다. 특히 `renderBossInputs`가 호출되는 시점과 인자에 대한 Mocking을 업데이트해야 합니다. `_remainingTimes`, `_memoInputs`, `currentInputMode`와 같은 모듈 레벨 상태 변수들의 동작을 테스트해야 합니다.
    *   **잠재적 사이드 이펙트:** 모듈 레벨 상태 (`_remainingTimes`, `_memoInputs`)가 테스트 간에 오염될 수 있으므로, 각 테스트의 `beforeEach`에서 이 변수들을 명시적으로 초기화하는 Mocking 전략이 필요할 수 있습니다.
- [ ] **실행 계획:**
    1.  `test/boss-scheduler.init.test.js`에 다음 테스트를 추가합니다.
        *   `should initialize UI with default smart input mode`: 초기 UI가 스마트 입력 모드로 올바르게 설정되고, `LocalStorageManager`의 모드 상태가 로드되는지 테스트.
        *   `should switch to text mode on textModeButton click`: 텍스트 모드 버튼 클릭 시 UI가 전환되고 `LocalStorageManager`에 모드 상태가 저장되는지 테스트.
        *   `should sync smart input to text mode on switch`: 스마트 모드에서 텍스트 모드로 전환 시 데이터 동기화 테스트.
        *   `should sync text mode to smart input on switch`: 텍스트 모드에서 스마트 모드로 전환 시 데이터 동기화 테스트 (파싱 오류 케이스 포함).
    2.  `test/boss-scheduler.apply.test.js`에 다음 테스트를 추가합니다.
        *   `should correctly save data from text mode input including memo`: 텍스트 모드에서 입력된 데이터를 `BossDataManager`에 저장하는지 테스트.
        *   `should save memo data correctly from smart input mode`: 스마트 입력 모드에서 비고 데이터가 올바르게 저장되는지 테스트.
        *   `should clear all inputs in current mode on "스케줄러 초기화" click`: "스케줄러 초기화" 버튼이 각 모드에서 올바르게 작동하는지 테스트.
        *   `should handle boss data with memo when updating BossDataManager`: `BossDataManager`가 `memo` 필드를 올바르게 저장하는지 확인하는 테스트.
    3.  기존 테스트 중 `_remainingTimes` 또는 `_memoInputs`와 관련된 Mocking 및 예상 인자 값을 업데이트합니다.
    4.  필요시 `vi.resetModules()` 또는 `beforeEach`에서 `_remainingTimes = {}; _memoInputs = {};`와 같이 모듈 내부 상태를 Mocking 또는 초기화하는 전략을 사용합니다.
- [ ] **검증:** `npm test`를 실행하여 모든 테스트가 통과하는지 확인합니다.
- [ ] **커밋 제안:** `test(scheduler): '보스 스케줄러' 모드 전환 및 동기화 테스트 추가`
</details>

<details>
<summary><strong>5.3. `test/boss-management.test.js` -> `test/timetable.test.js` 파일 변환</strong></summary>

- [ ] **사전 분석 (심층):**
    *   **영향 범위:** `test/boss-management.test.js` (221줄), `src/screens/timetable.js` (구 `boss-management.js`).
    *   **의존성:** 테스트 파일은 `initBossManagementScreen` 함수를 import하고, DOM Mock에서 `boss-management-screen`, `bossManagementMode`, `bossManagementNextBossFilter` 키를 사용합니다. 1.4단계의 코드 변경에 맞춰 업데이트해야 합니다.
- [ ] **실행 계획:**
    1.  **파일명 변경:** `test/boss-management.test.js`를 `test/timetable.test.js`로 변경합니다.
    2.  **import 경로 변경:** Line 2의 `import { initBossManagementScreen } from '../src/screens/boss-management.js';`를 `import { initTimetableScreen } from '../src/screens/timetable.js';`로 변경합니다.
    3.  **describe 블록 이름 변경:** `describe('Boss Management Screen', ...)`를 `describe('Timetable Screen', ...)`로 변경합니다.
    4.  **DOM Mock HTML 내 ID 변경:** `beforeEach` 내 `document.body.innerHTML`에서 `id="boss-management-screen"`을 `id="timetable-screen"`으로 변경합니다.
    5.  **DOM 객체 속성명 변경:** `DOM.bossManagementScreen`을 `DOM.timetableScreen`으로 변경합니다.
    6.  **LocalStorage 키 Mock 변경/제거:**
        *   `LocalStorageManager.get('bossManagementMode')` 관련 Mock 및 Assertion을 **제거**합니다. (조회 전용화에 따라 더 이상 사용되지 않음)
        *   `bossManagementNextBossFilter` 키는 유지하거나 `timetableNextBossFilter`로 변경합니다. (1.4단계의 결정에 따름)
    7.  **편집 모드 관련 테스트 케이스 제거:**
        *   `should toggle between view and edit mode on button click and save to localStorage` 테스트를 **제거**합니다.
        *   `should execute save logic only in edit mode` 테스트를 **제거**합니다.
        *   `should set window.isBossListDirty to true on textarea input` 테스트를 **제거**합니다.
        *   `should reset window.isBossListDirty to false after successful save` 테스트를 **제거**합니다.
    8.  **함수 호출 변경:** 테스트 내에서 `initBossManagementScreen(DOM)`을 `initTimetableScreen(DOM)`으로 변경합니다.
    9.  **trackEvent 라벨 Assertion 업데이트:** `'보스 설정'`을 `'보스 시간표'`로 변경합니다.
- [ ] **검증:** `npm test`를 실행하여 모든 테스트가 통과하는지 확인합니다.
- [ ] **커밋 제안:** `test(screens): 'boss-management.test.js'를 'timetable.test.js'로 전환 및 조회 전용 테스트로 단순화`
</details>

---