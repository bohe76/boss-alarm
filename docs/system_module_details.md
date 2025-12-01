# 모듈별 상세 설명 (v2.0 - 리팩토링 후)

이 문서는 '보스 알리미' 애플리케이션을 구성하는 각 JavaScript 모듈의 역할, `export`되는 모든 API의 상세 명세, 핵심 내부 로직, 그리고 다른 모듈과의 상호작용 방식을 코드 수준에서 상세히 기술합니다.

---

## 1. `src/app.js` (애플리케이션 최상위 오케스트레이터 및 라우터)

### 역할
애플리케이션의 메인 진입점(entry point)이자 최상위 컨트롤 타워입니다. 핵심 서비스 초기화, 라우터 설정, 초기 데이터 로딩, 전역 이벤트 리스너 등록, 화면 전환 관리, 그리고 대시보드와 같은 동적 콘텐츠의 주기적/반응적 갱신을 담당합니다.

### 주요 `export` 함수
`app.js`는 `initApp()` 함수를 `export`하며, `index.html`에서 호출됩니다.

#### `initApp()` (async)
- **설명:** 애플리케이션의 전체 초기화 및 실행 흐름을 관리합니다.
- **인자:** 없음
- **반환값:** `Promise<void>`
- **핵심 내부 로직:**
    1.  `initDomElements()`를 호출하여 모든 DOM 요소 참조를 `DOM` 객체에 수집합니다.
    2.  `initializeCoreServices(DOM)`를 `await`하여 로거, 데이터 관리자(LocalStorageManager, CustomListManager), 보스 데이터 로딩을 초기화합니다.
    3.  `registerAllRoutes()`를 호출하여 모든 화면 모듈을 `src/router.js`에 등록합니다.
    4.  `loadInitialData(DOM)`를 호출하여 URL 파라미터 또는 기본값으로부터 초기 보스 목록 및 고정 알림 데이터를 로드합니다.
    5.  `BossDataManager.subscribe(() => renderDashboard(DOM))`를 등록하여 보스 데이터 변경 시 대시보드를 반응적으로 갱신합니다.
    6.  `initEventHandlers(DOM, globalTooltip)`를 호출하여 전역 UI 이벤트 핸들러 및 화면별 이벤트 핸들러를 등록합니다.
    7.  `renderFixedAlarms(DOM)`, `renderAlarmStatusSummary(DOM)`를 호출하여 초기 UI 상태를 설정합니다.
    8.  `showScreen(DOM, 'dashboard-screen')`을 호출하여 대시보드 화면을 초기 화면으로 설정하고 즉시 렌더링합니다.
    10. `EventBus.on('navigate', (screenId) => showScreen(DOM, screenId))` 리스너를 등록하여, 다른 모듈에서 화면 전환을 요청할 수 있도록 합니다.
    11. `ResizeObserver`를 사용하여 뷰포트 크기 변화에 따른 반응형 동작(모바일 뷰 클래스 토글)을 처리합니다.

#### `showScreen(DOM, screenId)`
- **설명:** `screenId`에 해당하는 화면만 표시하고, 다른 모든 화면은 숨깁니다. `src/router.js`를 활용하여 화면별 초기화/전환 로직을 호출하고, 대시보드의 주기적인 갱신 (`setInterval`)을 관리합니다.
- **인자:**
    - `DOM` (`Object`): `initDomElements`에서 반환된 DOM 요소 참조 객체.
    - `screenId` (`string`): 표시할 화면의 ID (예: 'dashboard-screen').
- **핵심 내부 로직:**
    1.  모든 화면 요소의 `active` 클래스를 제거하고, `screenId`에 해당하는 화면에만 `active` 클래스를 추가합니다.
    2.  `boss-management-screen`에서 화면을 이동할 경우, `window.isBossListDirty` 플래그를 확인하여 저장되지 않은 변경 사항이 있으면 사용자에게 확인 메시지를 표시하고, 이동을 강행할 경우 `updateBossListTextarea(DOM)`를 호출하여 UI를 저장된 데이터로 되돌립니다.
    3.  내비게이션 링크의 `active` 상태를 동기화합니다.
    3.  `getRoute(screenId)`를 통해 화면 모듈을 가져와 `screen.init(DOM)` (최초 방문 시) 또는 `screen.onTransition(DOM)` (화면 전환 시)을 호출합니다.
    4.  대시보드 (`dashboard-screen`)로 전환될 경우, `renderDashboard(DOM)`를 즉시 호출하여 화면을 렌더링한 후, `setInterval(renderDashboard, 1000)`를 설정하여 1초마다 대시보드 UI를 갱신합니다. 다른 화면으로 전환 시에는 해당 `setInterval`을 해제합니다.

#### `loadInitialData(DOM)` (내부 함수)
- **설명:** 애플리케이션 시작 시 URL 쿼리 파라미터(`data`) 또는 `default-boss-list.js`에서 초기 동적 보스 목록을 로드합니다.
- **인자:** `DOM` (`Object`)
- **핵심 내부 로직:** URL `data` 파라미터가 있으면 해당 목록을, 없으면 기본 보스 목록을 로드합니다. URL에 `fixedData` 파라미터가 있어도 현재는 처리하지 않습니다.

#### `initEventHandlers(DOM, globalTooltip)` (내부 함수)
- **설명:** 애플리케이션의 모든 주요 UI 요소(알람 토글, 사이드바 토글, 내비게이션 링크, 모바일 "더보기" 메뉴)에 대한 전역 이벤트 리스너를 등록합니다.
- **인자:** `DOM` (`Object`), `globalTooltip` (`HTMLElement`).
- **핵심 내부 로직:** `DOM.alarmToggleButton`, `DOM.sidebarToggle`, `navLinks` (`DOM.navDashboard` 등), `bottomNavLinks` (`DOM.bottomNavDashboard` 등), `DOM.moreMenuButton`, `DOM.moreMenuCloseButton`, `DOM.sidebarBackdrop`에 이벤트 리스너를 등록합니다. 사이드바 메뉴 링크 클릭 시 모바일 "더보기" 메뉴를 닫는 로직도 포함됩니다.

---

## 2. `src/router.js` (중앙 라우팅 시스템)

### 역할
화면 ID를 기반으로 화면 모듈을 등록하고 검색하는 중앙 집중식 라우팅 시스템을 제공합니다. 애플리케이션의 화면 전환 로직을 단순화하고 확장성을 높입니다.

### 주요 `export` 함수

#### `getRoute(screenId)`
- **설명:** 주어진 `screenId`에 해당하는 화면 모듈 정보를 반환합니다.
- **인자:** `screenId` (`string`)
- **반환값:** `Object` (화면 모듈 객체: `{ id: string, init: Function, onTransition?: Function }`)

#### `registerRoute(screenId, screenModule)`
- **설명:** 화면 모듈을 라우팅 테이블에 등록합니다.
- **인자:**
    - `screenId` (`string`)
    - `screenModule` (`Object`)
- **반환값:** `void`

---

## 3. `src/dom-elements.js` (DOM 요소 수집)

### 역할
애플리케이션에서 사용되는 모든 주요 DOM 요소들을 한곳에 모아 참조 객체를 생성합니다. 이는 `document.getElementById()`와 같은 DOM 쿼리 호출을 중앙 집중화하고, 코드 전반의 DOM 접근 일관성을 높입니다.

### 주요 `export` 함수

#### `initDomElements()`
- **설명:** 애플리케이션이 사용하는 모든 HTML 요소들을 ID를 기반으로 찾아 객체 형태로 반환합니다.
- **인자:** 없음
- **반환값:** `Object` (키-값 쌍으로 구성된 DOM 요소 참조 객체)

---

## 4. `src/ui-renderer.js` (UI 렌더링 엔진)

### 역할
모든 화면과 컴포넌트의 UI를 렌더링하고 업데이트하는 로직을 담당하는 중앙 집중식 모듈입니다. DOM 조작 및 HTML 문자열 생성을 캡슐화하여, 다른 모듈들이 UI 표현 방식에 대해 알 필요 없이 데이터를 기반으로 UI를 업데이트할 수 있도록 합니다.

### 주요 `export` 함수 (예시)
다양한 화면 및 컴포넌트별 렌더링/업데이트 함수들을 `export`합니다. 모든 함수는 `DOM` 객체를 인자로 받아 해당 객체 내의 요소들을 조작합니다.

*   `showToast(DOM, message)`: 사용자에게 피드백을 제공하는 토스트 메시지를 표시합니다.
*   `populateBossSelectionDropdown(DOM)`: '젠 계산기'의 보스 선택 드롭다운 메뉴를 동적으로 생성합니다.
*   `updateMuteButtonVisuals(DOM)`: 음소거 상태에 따라 음소거 버튼의 시각적 상태(아이콘)를 업데이트합니다.
*   `updateNextBossDisplay(DOM)`: 대시보드의 '다음 보스' 정보를 갱신합니다.
*   `renderUpcomingBossList(DOM)`: 대시보드의 '다가오는 보스 목록'을 렌더링합니다.
*   `renderAlarmStatusSummary(DOM)`: 대시보드의 '알림 실행 상태' 텍스트를 갱신합니다.
*   `renderRecentAlarmLog(DOM)`: 대시보드의 '최근 알림 로그'를 렌더링합니다. (이벤트 기반 갱신)
*   `renderDashboard(DOM)`: '다음 보스', '다가오는 보스', '알림 실행 상태', '음소거 버튼' 등 대시보드 전체 UI를 업데이트하는 오케스트레이터 함수입니다.
*   `renderHelpScreen(DOM, helpData)`: '도움말' 탭의 콘텐츠(`feature_guide.json` 기반)를 아코디언 형태로 렌더링합니다.
*   `renderFaqScreen(DOM, faqData)`: 'FAQ' 탭의 콘텐츠(`faq_guide.json` 기반)를 아코디언 형태로 렌더링합니다.
*   `renderVersionInfo(DOM, versionData)`: '릴리즈 노트' 화면의 버전 기록을 렌더링합니다.
*   `updateBossListTextarea(DOM)`: `BossDataManager`의 데이터를 기반으로 보스 목록 텍스트 영역을 업데이트합니다. `bossSchedule` 배열을 순회하며 날짜 마커를 출력하고, 보스 시간은 `formatBossListTime`을 통해 포맷팅(초가 00이면 생략)하여 출력합니다.
*   `renderFixedAlarms(DOM)`: 고정 알림 목록을 렌더링하고 이벤트 리스너를 등록합니다.
*   `updateFixedAlarmVisuals(DOM)`: 고정 알림의 활성화/비활성화 상태에 따라 시각적 효과를 업데이트합니다.
*   `renderCalculatorScreen(DOM)`: 계산기 화면(젠 계산기 및 광 계산기)의 초기 상태를 렌더링합니다.
*   `renderBossSchedulerScreen(DOM, remainingTimes)`: 보스 스케줄러 화면을 초기화하고 게임 선택 드롭다운 및 보스 입력 필드를 렌더링합니다.
*   `renderBossInputs(DOM, gameName, remainingTimes)`: 선택된 게임에 따라 보스 입력 필드를 동적으로 렌더링합니다.
*   `renderCustomListManagementModalContent(DOM)`: 커스텀 보스 관리 모달의 내용을 렌더링합니다.
*   `showCustomListTab(DOM, tabId)`: 커스텀 보스 관리 모달 내에서 탭을 전환합니다.
*   `updateLightStopwatchDisplay(DOM, time)`: 광 계산기 스톱워치 디스플레이를 업데이트합니다.
*   `updateLightExpectedTimeDisplay(DOM, time, isOverTime)`: 광 계산기 예상 시간 디스플레이를 업데이트하고 초과 시간을 시각적으로 표시합니다.
*   `renderLightTempResults(DOM, gwangTime, afterGwangTime, totalTime)`: 광 계산기의 최근 계산 결과를 임시로 렌더링합니다.
*   `renderLightSavedList(DOM, records)`: 광 계산기의 저장된 기록 목록을 렌더링합니다.
*   그 외 상세 렌더링 함수들.

---

## 5. `src/data-managers.js` (데이터 관리 및 상태 관리)

### 역할
애플리케이션의 핵심 데이터(보스 스케줄) 및 영구 저장소(localStorage)에 저장되는 다양한 설정 및 데이터를 관리하는 싱글톤 모듈입니다. `BossDataManager`는 데이터 변경 시 구독자에게 알리는 반응형 패턴을 구현합니다.

### 주요 `export` 상수

#### `BossDataManager` (싱글톤 객체)
- **설명:** 보스 스케줄 및 다음 보스 정보를 관리합니다.
- **주요 메소드:**
    *   `getBossSchedule()`: `Array`. 현재 파싱된 보스 일정 배열을 반환합니다.
    *   `setBossSchedule(newSchedule)`: `void`. 새로운 보스 일정 배열로 교체하고, 모든 구독자에게 데이터 변경을 알립니다.
    *   `getNextBossInfo()`: `{ nextBoss, minTimeDiff }`. 현재 가장 가까운 다음 보스 정보와 남은 시간을 반환합니다.
    *   `setNextBossInfo(nextBoss, minTimeDiff)`: `void`. 다음 보스 정보를 설정하고, 모든 구독자에게 데이터 변경을 알립니다.
    *   `getUpcomingBosses(count)`: `Array`. 현재 시간 이후 예정된 보스 목록을 `count`만큼 정확히 반환합니다. 동적 보스의 `scheduledDate`를 존중하고 고정 알림은 현재 날짜를 기반으로 하여 통합 처리합니다.
    *   `subscribe(callback)`: `void`. `BossDataManager`의 데이터 변경을 감지할 콜백 함수를 등록합니다. **반응형 상태 관리 패턴(Observer Pattern)**을 구현합니다.

#### `LocalStorageManager` (싱글톤 객체)
- **설명:** 웹 브라우저의 `localStorage`를 통해 다양한 애플리케이션 설정(예: 음소거 상태, 알람 실행 상태, 사이드바 확장 상태) 및 사용자 데이터(고정 알림, 광 계산기 기록 등)를 영구적으로 저장하고 로드합니다.
- **주요 메소드:**
    *   `init()`: `void`. 애플리케이션 시작 시 `localStorage`의 모든 관리 데이터를 로드합니다.
    *   `get(key)` / `set(key, value)`: `any` / `void`. 임의의 키-값 쌍을 `localStorage`에 저장하고 로드하는 일반적인 인터페이스입니다.
    *   `getFixedAlarms()` / `addFixedAlarm()` / `updateFixedAlarm()` / `deleteFixedAlarm()`: 고정 알림 데이터에 대한 CRUD(생성, 읽기, 업데이트, 삭제) 작업을 제공합니다.
    *   `exportFixedAlarms()` / `importFixedAlarms(encodedData)`: 고정 알림 데이터를 인코딩/디코딩하여 공유 가능하게 합니다.
    *   `getMuteState()` / `setMuteState(state)`: `boolean` / `void`. 음소거 상태를 관리합니다.
    *   그 외 `logVisibilityState`, `alarmRunningState`, `sidebarExpandedState`, `lightCalculatorRecords` 등에 대한 `get/set` 함수를 제공합니다.
    *   `getLogVisibilityState()` / `setLogVisibilityState(state)`: `boolean` / `void`. 로그 화면의 "15개 보기" 토글 상태를 관리합니다.

---

## 6. `src/alarm-scheduler.js` (알람 시스템 관리)

### 역할
보스 알림 시스템의 핵심 로직을 담당합니다. 보스 출현 시간을 주기적으로 확인하고, 설정된 시간에 맞춰 음성 및 시각적 알림을 트리거하며, 알람 관련 애플리케이션 상태를 관리합니다.

### 주요 `export` 함수

#### `startAlarm(DOM)`
- **설명:** 알림 시스템을 시작합니다. `LocalStorageManager`에 알람 실행 상태를 저장하고, 로그 및 음성 메시지를 출력하며, `checkAlarms()` 함수를 1초마다 주기적으로 실행하는 `setInterval`을 설정합니다.
- **인자:** `DOM` (`Object`)
- **반환값:** `void`

#### `stopAlarm(DOM)`
- **설명:** 알림 시스템을 중지합니다. `LocalStorageManager`에 알람 실행 상태를 저장하고, 실행 중인 `setInterval`을 해제하며, 로그 및 음성 메시지를 출력합니다.
- **인자:** `DOM` (`Object`)
- **반환값:** `void`

#### `getIsAlarmRunning()`
- **설명:** `LocalStorageManager`로부터 현재 알람 실행 상태를 반환합니다.
- **인자:** 없음
- **반환값:** `boolean`

#### `checkAlarms()`
- **설명:** 매초마다 호출되어 현재 시간과 보스 스케줄을 비교하고, 5분 전, 1분 전, 정각 알림 조건이 충족되면 알림을 트리거합니다. 자정에는 모든 보스의 알림 상태를 초기화합니다. 동적 보스는 `BossDataManager`를 통해, 고정 알림은 `LocalStorageManager`를 통해 관리됩니다.
- **인자:** 없음
- **반환값:** `void`

---

## 7. `src/services.js` (핵심 서비스 초기화)

### 역할
애플리케이션의 핵심 서비스들(로거, 데이터 관리자)을 초기화하고, 외부 리소스(보스 목록 JSON 파일)를 로드하는 로직을 캡슐화합니다. `app.js`의 `initApp` 함수가 호출합니다.

### 주요 `export` 함수

#### `initializeCoreServices(DOM)` (async)
- **설명:** 로거, `LocalStorageManager`, `CustomListManager`를 초기화하고 `data/boss_lists.json` 파일을 로드합니다.
- **인자:** `DOM` (`Object`)
- **반환값:** `Promise<void>`
- **핵심 내부 로직:**
    1.  `initLogger(DOM.logContainer)` 호출.
    2.  `LocalStorageManager.init()` 호출.
    3.  `CustomListManager.init()` 호출.
    4.  `await loadBossLists()` 호출.

---

## 8. `src/global-event-listeners.js` (전역 EventBus 리스너 관리)

### 역할
애플리케이션 생명주기 내내 활성화되어야 하는 핵심적인 전역 `EventBus` 리스너들을 한곳에서 관리합니다. 이는 `EventBus` 리스너 등록의 안정성을 보장하고, 각 모듈의 관심사를 더욱 분리합니다.

### 주요 `export` 함수

#### `initGlobalEventListeners(DOM)`
- **설명:** 애플리케이션 시작 시 `app.js`에 의해 한 번만 호출되어 전역 `EventBus` 리스너들을 등록합니다.
- **인자:** `DOM` (`Object`)
- **반환값:** `void`
- **핵심 내부 로직:**
    1.  `BossDataManager.subscribe(() => renderDashboard(DOM));`를 등록하여 `BossDataManager`의 데이터 변경 시 대시보드를 갱신합니다. (반응형 업데이트)
    2.  `EventBus.on('log-updated', () => { ... });`를 등록하여 `logger.js`에서 로그 발생 시 "알림 로그" 화면이 활성화되어 있다면 해당 화면의 내용을 갱신합니다. (이벤트 기반 업데이트)

---

## 9. 기타 유틸리티 및 도우미 모듈

### `src/event-handlers.js`

- **역할:** 다양한 UI 구성 요소(알람 토글, 사이드바, 내비게이션 링크, 모바일 메뉴 등)에 대한 구체적인 이벤트 리스너들을 등록합니다.
- **주요 `export` 함수:**
    - `initEventHandlers(DOM, globalTooltip)`: `app.js`의 `initApp`에서 호출되어 애플리케이션의 주요 이벤트 핸들러들을 등록합니다.
- **주의사항:** 이 모듈은 이전에 `initApp` 및 `showScreen`과 같은 최상위 오케스트레이션 로직을 포함했으나, 현재는 `app.js`가 해당 역할을 전담합니다. 이 파일 내부에 더 이상 사용되지 않는 `showScreen` 및 `initApp` 함수 정의가 존재하지만, 실제 애플리케이션 로직에서는 `app.js`의 해당 함수들이 사용됩니다.

### `src/logger.js`

- **역할:** 애플리케이션 전반의 메시지 로깅을 담당합니다. 로그를 저장하고, 지정된 DOM 요소에 표시하며, `EventBus`를 통해 로그 업데이트를 알립니다.
- **주요 `export` 함수:**
    - `initLogger(containerElement)`: 로그 메시지가 표시될 DOM 요소를 설정합니다.
    - `log(message, isImportant)`: 메시지를 로깅하고, `logContainer`에 추가하며, `EventBus.emit('log-updated')`를 발생시킵니다.
    - `getLogs()`: 현재까지 저장된 모든 로그 항목을 반환합니다.

### `src/speech.js`

- **역할:** 웹 음성 API (`window.speechSynthesis`)를 활용하여 텍스트를 음성으로 변환하여 출력합니다. 음성 요청 큐를 관리하며 음소거 상태를 고려합니다.
- **주요 `export` 함수:**
    - `speak(text)`: 주어진 텍스트를 음성으로 출력 요청 큐에 추가합니다.

### `src/api-service.js`

- **역할:** TinyURL API를 통한 URL 단축 및 로컬 JSON 파일 로드와 같은 외부 서비스와의 비동기 통신을 처리합니다.
- **주요 `export` 함수:**
    - `getShortUrl(longUrl)`: TinyURL API를 사용하여 긴 URL을 단축합니다.
    - `loadJsonContent(filePath)`: 지정된 경로에서 JSON 파일을 비동기적으로 로드합니다.

### `src/boss-parser.js`

- **역할:** 사용자 입력 텍스트(보스 목록)를 파싱하여 구조화된 데이터로 변환하고, 기존 데이터와 지능적으로 병합(Smart Merge)합니다.
- **주요 `export` 함수:**
    - `parseBossList(bossListInput)`: 텍스트 영역의 내용을 파싱합니다. 기존 `BossDataManager`의 데이터와 비교하여 ID를 유지하며 병합하고, 날짜 마커를 재구성한 결과 객체(`{ success, mergedSchedule, errors }`)를 반환합니다. 자동 저장을 수행하지 않으므로 호출자가 반환값을 확인 후 저장해야 합니다.

### `src/boss-scheduler-data.js`

- **역할:** 미리 정의된 보스 목록 (`data/boss_lists.json`) 및 `CustomListManager`를 통해 관리되는 사용자 지정 보스 목록 데이터를 로드하고 접근하는 인터페이스를 제공합니다.
- **주요 `export` 함수:**
    - `loadBossLists()`: 보스 목록 JSON 파일을 비동기적으로 로드합니다.
    - `getGameNames()`: 미리 정의된 게임 및 사용자 지정 목록 이름을 반환합니다.
    - `getBossNamesForGame(gameName)`: 특정 게임 또는 목록의 보스 이름들을 반환합니다.

### `src/custom-list-manager.js`

- **역할:** 사용자 지정 보스 목록(이름, 내용)의 생성, 조회, 수정, 삭제(CRUD) 로직을 관리하고 `LocalStorageManager`를 통해 영구 저장합니다. 강력한 유효성 검사 및 이름 중복 확인 기능을 포함합니다.
- **주요 `export` 객체:**
    - `CustomListManager`: `init()`, `addCustomList()`, `updateCustomList()`, `deleteCustomList()`, `renameCustomList()`, `getBossNamesForCustomList()`, `getCustomListContent()`, `isPredefinedGameName()` 등의 메소드를 제공합니다.

### `src/utils.js`

- **역할:** 숫자 패딩, 날짜 포맷팅, 시간 유효성 검사, 시간 차이 계산, 고유 ID 생성 등 애플리케이션 전반에 걸쳐 사용되는 범용 유틸리티 함수들을 모아놓은 모듈입니다.
- **주요 `export` 함수:** `padNumber()`, `formatMonthDay()`, `validateStandardClockTime()`, `formatTimeDifference()`, `generateUniqueId()`, `normalizeTimeFormat()` 등.

### `src/calculator.js`

- **역할:** 젠 계산기(`Zen Calculator`)의 핵심 로직을 포함하며, 남은 시간을 기반으로 보스 출현 시간을 계산합니다.
- **주요 `export` 함수:**
    - `calculateBossAppearanceTime(remainingTime)`: 주어진 남은 시간으로부터 보스의 정확한 출현 시간을 계산하여 반환합니다.

### `src/light-calculator.js`

- **역할:** 광 계산기(`Light Calculator`)의 복잡한 로직과 상태를 관리하는 싱글톤 객체입니다. 스톱워치, 광/잡힘 시간 기록, 예상 시간 계산, 그리고 기록 저장 및 관리를 담당합니다.
- **주요 `export` 객체:**
    - `LightCalculator`: `startStopwatch()`, `stopStopwatch()`, `triggerGwang()`, `saveLightCalculation()`, `resetCalculator()`, `getLightCalculatorRecords()` 등의 메소드를 제공합니다.

### `src/default-boss-list.js`

- **역할:** 애플리케이션에 미리 정의된 기본 보스 목록 데이터(`bossPresets`)를 제공합니다.
- **주요 `export` 상수:** `bossPresets`.

---

## 10. 화면 모듈 상세 (`src/screens/*.js`)

각 화면의 초기화 및 전환 시 로직을 담당하며, `src/router.js`에 등록됩니다.

| 모듈 파일 | 주요 `export` 함수 | 상세 역할 및 내부 로직 |
|---|---|---|
| **`alarm-log.js`** | `getScreen()` | `onTransition` 시 `initAlarmLogScreen(DOM)`을 호출하여 로그 화면을 초기화하고, `LocalStorageManager`를 통해 "15개 보기" 토글 버튼의 상태를 로드/저장하며, `renderAlarmLog(DOM)`를 호출하여 로그를 표시합니다. `renderAlarmLog`는 토글 상태에 따라 최근 15개 또는 전체 로그를 렌더링하고, `global-event-listeners.js`에서 `EventBus.on('log-updated', ...)`를 통해 동적으로 갱신됩니다. |
| **`boss-management.js`** | `getScreen()` | `init` 시 "보스 설정 저장" 버튼의 이벤트 리스너를 등록합니다. 버튼 클릭 시 `parseBossList`를 호출하여 유효성을 검사하고, 성공 시에만 `BossDataManager`에 저장합니다. 텍스트 수정 시 `isDirty` 플래그를 관리하여 저장되지 않은 변경 사항을 추적합니다. |
| **`boss-scheduler.js`** | `getScreen()` | `init` 시 게임 선택, 보스 시간 입력(`remaining-time-input`) 등의 이벤트 리스너를 등록합니다. "보스 설정 적용" 버튼 클릭 시 입력된 `data-id`를 기반으로 기존 보스 데이터를 업데이트하고, 전체 리스트를 재구성(Reconstruction)하여 저장합니다. |
| **`calculator.js`** | `getScreen()` | `init` 시 '젠 계산기' 및 '광 계산기'의 모든 이벤트 리스너를 등록합니다. `onTransition` 시 계산기 상태를 초기화하고 `ui-renderer.js`의 함수들을 호출하여 화면을 렌더링합니다. |
| **`custom-list.js`** | `getScreen()` | `init` 시 '커스텀 보스 관리' 모달의 이벤트 리스너(열기, 닫기, 탭 전환, 목록 CRUD)를 등록합니다. 모달은 `boss-scheduler-screen`에서 트리거됩니다. |
| **`dashboard.js`** | `getScreen()` | `init` 시 음소거 토글 버튼의 이벤트 리스너를 등록하고, '최근 알림 로그'를 초기 렌더링한 후 `log-updated` 이벤트에 반응하여 갱신합니다. |
| **`help.js`** | `getScreen()` | `init` 시 '도움말'과 'FAQ' 탭 전환 이벤트 리스너를 등록하고, `onTransition` 시 `data/feature_guide.json`과 `data/faq_guide.json`을 로드하여 `renderHelpScreen()`과 `renderFaqScreen()`으로 각 탭의 콘텐츠를 렌더링합니다. |
| **`notifications.js`** | `getScreen()` | `init` 시 고정 알림 목록의 개별 토글, 편집, 삭제 버튼에 대한 이벤트 리스너를 위임 방식으로 등록합니다. |
| **`share.js`** | `getScreen()` | `onTransition` 시 현재의 동적 보스 목록(`data`)만 인코딩하여 `api-service.js`를 통해 짧은 URL을 생성하고 클립보드에 복사합니다. (고정 알림은 공유되지 않습니다.) |
| **`version-info.js`** | `getScreen()` | `onTransition` 시 `api-service.js`를 통해 `data/version_history.json`을 로드하고 `ui-renderer.js`의 `renderVersionInfo(DOM, versionData)`를 호출하여 릴리즈 노트 콘텐츠를 렌더링합니다. |
