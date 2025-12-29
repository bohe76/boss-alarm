# 모듈별 상세 설명 (v2.0 - 리팩토링 후)

이 문서는 '보스 알리미' 애플리케이션을 구성하는 각 JavaScript 모듈의 역할, `export`되는 모든 API의 상세 명세, 핵심 내부 로직, 그리고 다른 모듈과의 상호작용 방식을 코드 수준에서 상세히 기술합니다.

---

## 0. `index.html` (클라이언트 측 환경 처리)

### 역할
애플리케이션의 최상위 진입점인 `index.html` 파일 `<head>` 섹션에 직접 삽입된 스크립트입니다. 웹 애플리케이션이 카카오톡 인앱 브라우저와 같이 특정 제한적인 환경에서 실행될 경우를 감지하고, 사용자 경험 저하를 방지하기 위한 환경 처리 로직을 담당합니다.

### 주요 기능
*   **카카오톡 인앱 브라우저 감지:** `navigator.userAgent`를 분석하여 현재 브라우저 환경이 카카오톡 인앱 브라우저인지 확인합니다.
*   **안드로이드 자동 리디렉션:** 안드로이드 기기에서 카카오톡 인앱 브라우저가 감지되면, `intent://` URL 스킴을 사용하여 자동으로 사용자의 기본 외부 브라우저(예: Chrome, 삼성 인터넷)로 페이지를 리디렉션합니다.
*   **iOS 사용자 안내:** iOS 기기에서는 애플의 보안 정책으로 인해 자동 리디렉션이 불가능합니다. 대신, 전체 화면 오버레이를 표시하여 사용자에게 수동으로 Safari와 같은 외부 브라우저로 페이지를 열도록 명확한 시각적 지침을 제공합니다. 이 오버레이는 인라인 스타일 및 SVG를 사용하여 자체 포함되어 있으며, 외부 리소스에 의존하지 않습니다.

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
    2.  Document PiP API 지원 여부를 확인하고, 지원하는 경우에만 PiP 토글 버튼을 표시합니다.
    3.  `initializeCoreServices(DOM)`를 `await`하여 로거, 데이터 관리자(LocalStorageManager, CustomListManager), 보스 데이터 로딩을 초기화합니다.
    4.  `registerAllRoutes()`를 호출하여 모든 화면 모듈을 `src/router.js`에 등록합니다.
    5.  `loadInitialData(DOM)`를 호출하여 URL 파라미터 또는 기본값으로부터 초기 보스 목록 및 고정 알림 데이터를 로드합니다.
    6.  **'설정' 화면의 고정 알림 목록을 초기 렌더링합니다 (`renderFixedAlarms(DOM)`).**
    7.  `initGlobalEventListeners(DOM)`를 호출하여, `BossDataManager` 데이터 변경 감지, 로그 업데이트 등 애플리케이션 전반의 핵심 이벤트 리스너를 중앙에서 등록하고 활성화합니다.
    8.  `initEventHandlers(DOM, globalTooltip)`를 호출하여 알람 토글, 사이드바, 내비게이션 링크, **PiP 토글 버튼** 등 주요 UI 요소의 이벤트 핸들러를 등록합니다.
    9.  `renderAlarmStatusSummary(DOM)`를 호출하여 초기 UI 상태를 설정합니다.
    10. `showScreen(DOM, 'dashboard-screen')`을 호출하여 대시보드 화면을 초기 화면으로 설정하고 즉시 렌더링합니다.
    11. `EventBus.on('navigate', (screenId) => showScreen(DOM, screenId))` 리스너를 등록하여, 다른 모듈에서 화면 전환을 요청할 수 있도록 합니다.
    12. `ResizeObserver`를 사용하여 뷰포트 크기 변화에 따른 반응형 동작(모바일 뷰 클래스 토글)을 처리합니다.

#### `showScreen(DOM, screenId)`
- **설명:** `screenId`에 해당하는 화면만 표시하고, 다른 모든 화면은 숨깁니다. `src/router.js`를 활용하여 화면별 초기화/전환 로직을 호출하고, 대시보드의 주기적인 갱신 (`setInterval`)을 관리합니다.
- **인자:**
    - `DOM` (`Object`): `initDomElements`에서 반환된 DOM 요소 참조 객체.
    - `screenId` (`string`): 표시할 화면의 ID (예: 'dashboard-screen').
- **핵심 내부 로직:**
    1.  모든 화면 요소의 `active` 클래스를 제거하고, `screenId`에 해당하는 화면에만 `active` 클래스를 추가합니다.
    2.  `timetable-screen`에서 화면을 이동할 경우, `window.isBossListDirty` 플래그를 확인하여 저장되지 않은 변경 사항이 있으면 사용자에게 확인 메시지를 표시하고, 이동을 강행할 경우 `updateBossListTextarea(DOM)`를 호출하여 UI를 저장된 데이터로 되돌립니다.
    3.  내비게이션 링크의 `active` 상태를 동기화합니다.
    3.  `getRoute(screenId)`를 통해 화면 모듈을 가져와 `screen.init(DOM)` (최초 방문 시) 또는 `screen.onTransition(DOM)` (화면 전환 시)을 호출합니다.
    4.  대시보드 (`dashboard-screen`)로 전환될 경우, `renderDashboard(DOM)`를 즉시 호출하여 화면을 렌더링한 후, `setInterval(renderDashboard, 1000)`를 설정하여 1초마다 대시보드 UI를 갱신합니다. 다른 화면으로 전환 시에는 해당 `setInterval`을 해제합니다.

#### `loadInitialData(DOM)` (내부 함수)
- **설명:** 애플리케이션 시작 시 URL 쿼리 파라미터(`data`) 또는 초기화 과정에서 로드된 `initial-default.json` 데이터로부터 초기 보스 목록을 설정합니다.
- **인자:** `DOM` (`Object`)
- **핵심 내부 로직:** URL `data` 파라미터가 있으면 `parseBossList`를 통해 파싱하고, 없으면 `getInitialDefaultData()`로 가져온 구조화된 데이터를 `processBossItems()`로 처리하여 `BossDataManager.setBossSchedule()`으로 저장합니다. `setBossSchedule()`호출 시 Draft와 localStorage도 즉시 동기화됩니다.

#### `processBossItems(items)` (내부 함수)
- **설명:** `initial-default.json`에서 로드한 보스 아이템 배열을 SSOT 형식의 스케줄 배열로 변환합니다.
- **인자:** `items` (`Array`) - `{ name, time, memo? }` 형태의 보스 아이템 배열
- **반환값:** `Array` - `{ id, name, time, memo, type, scheduledDate }` 형태의 SSOT 배열
- **핵심 로직:**
    *   현재 날짜를 기준으로 각 보스의 `scheduledDate`를 생성합니다.
    *   **표준 UID 생성**: `boss-[이름]-[타임스탬프]` 형식의 유일 ID를 모든 인스턴스에 부여합니다.
    *   **시간 역전 감지:** 이전 보스보다 시간이 이르면 날짜를 다음 날로 자동 증가시킵니다. (예: 23:29 → 03:50은 다음 날)

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
다양한 화면 및 컴포언트별 렌더링/업데이트 함수들을 `export`합니다. 모든 함수는 `DOM` 객체를 인자로 받아 해당 객체 내의 요소들을 조작합니다.

*   `showToast(DOM, message)`: 사용자에게 피드백을 제공하는 토스트 메시지를 표시합니다.
*   `populateBossSelectionDropdown(DOM)`: '젠 계산기'의 보스 선택 드롭다운 메뉴를 동적으로 생성합니다.
*   `updateSoundControls(DOM)`: 음소거 버튼 아이콘 및 볼륨 슬라이더의 시각적 상태를 업데이트합니다. `LocalStorageManager`의 `muteState` 및 `volume` 값을 기반으로 음소거 버튼의 아이콘(음소거/음소거 해제)과 클래스, 볼륨 슬라이더의 값 및 트랙 색상(CSS 변수 `--volume-progress` 활용)을 동기화합니다.
*   `updateNextBossDisplay(DOM)`: 대시보드의 '다음 보스' 정보를 갱신합니다. 남은 시간에 따라 시간 표시의 색상을 동적으로 변경(5분 미만: 빨강, 10분 미만: 주황, 1시간 미만: 검정, 1시간 이상: 회색)하여 직관성을 높입니다. PiP 창이 열려 있는 경우 `pip-manager.js`의 `updatePipContent()`를 호출하여 PiP 창의 내용을 동기화합니다.
*   `renderUpcomingBossList(DOM)`: 대시보드의 '다가오는 보스 목록'을 렌더링합니다. 각 보스의 남은 시간에 따라 목록의 색상을 동적으로 변경하여(5분, 10분, 1시간 기준) 가독성을 높입니다.
*   `renderAlarmStatusSummary(DOM)`: 대시보드의 '알림 실행 상태' 텍스트를 갱신합니다.
*   `renderRecentAlarmLog(DOM)`: 대시보드의 '최근 알림 로그'를 렌더링합니다. (이벤트 기반 갱신)
*   `renderDashboard(DOM)`: '다음 보스', '다가오는 보스', '알림 실행 상태', '음소거 버튼' 등 대시보드 전체 UI를 업데이트하는 오케스트레이터 함수입니다.
*   `renderHelpScreen(DOM, helpData)`: '도움말' 탭의 콘텐츠(`feature_guide.json` 기반)를 아코디언 형태로 렌더링합니다.
*   `renderFaqScreen(DOM, faqData)`: 'FAQ' 탭의 콘텐츠(`faq_guide.json` 기반)를 아코디언 형태로 렌더링합니다.
*   `renderVersionInfo(DOM, versionData)`: '릴리즈 노트' 화면의 버전 기록을 렌더링합니다.
*   `updateTimetableUI(DOM, mode)`: 보스 시간표 화면의 UI를 '뷰 모드' 또는 '편집 모드'에 맞게 업데이트합니다. 모드에 따라 텍스트 영역, 저장 버튼, 보기 모드 선택 버튼, 테이블 뷰 등을 표시하거나 숨깁니다.
*   `renderBossListTableView(DOM, filterNextBoss)`: 뷰 모드에서 보스 목록을 **날짜별 카드 리스트** 또는 **테이블(표)** 형태로 렌더링합니다. '다음 보스' 필터가 활성화된 경우 현재 시간 이후의 보스만 표시하며, `boss` 객체의 `timeFormat` 속성을 기반으로 시간 표시 형식을 동적으로 결정합니다.
*   `updateBossListTextarea(DOM)`: `BossDataManager`의 데이터를 기반으로 보스 목록 텍스트 영역을 업데이트합니다. `bossSchedule` 배열을 순회하며 날짜 마커를 출력하고, 각 `boss` 객체에 저장된 `timeFormat` 속성('hm' 또는 'hms')에 따라 시간 형식을 동적으로 포맷팅하여 출력합니다.
*   `renderFixedAlarms(DOM)`: 고정 알림 목록을 렌더링하고 이벤트 리스너를 등록합니다.
*   `updateFixedAlarmVisuals(DOM)`: 고정 알림의 활성화/비활성화 상태에 따라 시각적 효과를 업데이트합니다.
*   `renderCalculatorScreen(DOM)`: 계산기 화면(젠 계산기 및 광 계산기)의 초기 상태를 렌더링합니다.
*   `renderBossSchedulerScreen(DOM, remainingTimes)`: 보스 스케줄러 화면을 초기화하고 게임 선택 드롭다운 및 보스 입력 필드를 렌더링합니다.
*   `renderBossInputs(DOM, gameName, remainingTimes)`: 선택된 게임에 따라 보스 입력 필드를 동적으로 렌더링합니다. **지능형 UI 동기화** 기술을 적용하여, 현재 시각 기준 가장 가까운 미래의 보스 인스턴스 정보를 실시간으로 매핑하여 표시합니다.
*   `renderCustomListManagementModalContent(DOM)`: 커스텀 보스 관리 모달의 내용을 렌더링합니다.
*   `showCustomListTab(DOM, tabId)`: 커스텀 보스 관리 모달 내에서 탭을 전환합니다.
*   `updateCrazyStopwatchDisplay(DOM, time)`: 광 계산기 스톱워치 디스플레이를 업데이트합니다.
*   `updateCrazyExpectedTimeDisplay(DOM, time, isOverTime)`: 광 계산기 예상 시간 디스플레이를 업데이트하고 초과 시간을 시각적으로 표시합니다.
*   `renderCrazyTempResults(DOM, gwangTime, afterGwangTime, totalTime)`: 광 계산기의 최근 계산 결과를 임시로 렌더링합니다.
*   `renderCrazySavedList(DOM, records)`: 광 계산기의 저장된 기록 목록을 렌더링합니다.
*   그 외 상세 렌더링 함수들.

---

## 5. `src/data-managers.js` (데이터 관리 및 상태 관리)

### 역할
애플리케이션의 핵심 데이터(보스 스케줄) 및 영구 저장소(localStorage)에 저장되는 다양한 설정 및 데이터를 관리하는 싱글톤 모듈입니다.
*   보스 메타데이터(젠 주기 등)는 `boss-presets.json`에서 비동기로 로드하며, `BossDataManager`에 주입하여 효율적인 실시간 조회를 지원합니다.
*   **데이터 세탁기(Sanitization) 안전망**: 로컬 스토리지 로드 시 필수 필드 누락이나 날짜 값이 손상된 데이터(Invalid Date)를 자동으로 탐지하고 정제하여 시스템의 런타임 에러를 방지합니다.
*   **48시간 자동 확장 엔진 (UID 기반)**: 모든 데이터 변경 및 초기화 시, 주입된 보스 아이템들을 바탕으로 48시간 일정을 자동 생성합니다. 
    *   **사용자 의도 보존 (User Intent Preservation)**: 사용자가 텍스트 모드 등에서 직접 수정한 인스턴스(ID 일치)는 '잠금' 상태로 간주하여 자동 생성 로직에 의해 덮어씌워지지 않고 메모 등의 필드가 철저히 보전됩니다. 
    *   **순수 UID 생성**: 주기가 돌아와 새롭게 생성되는 인스턴스는 기존 ID를 복제하지 않고, 해당 시점의 타임스탬프를 기반으로 새로운 유일 ID를 부여받습니다.
*   **비즈니스 로직 기반 필터링 (Invasion filtering)**:
    *   `_expandAndReconstruct` 함수는 프리셋의 `isInvasion` 플래그를 체크하여, 침공 보스로 분류된 항목은 현재 시각(`now`)과 동일한 날짜인 경우에만 스케줄에 포함시키고 이외의 날짜는 자동으로 필터링합니다.
*   보스 객체는 고유 ID(`boss-이름-타임스탬프`)를 통해 식별됩니다.

### 주요 `export` 상수

#### `BossDataManager` (싱글톤 객체)
- **설명:** 보스 스케줄(SSOT) 및 Draft(임시 스케줄)를 관리합니다. SSOT 변경 시 Draft와 localStorage가 즉시 동기화됩니다.
- **주요 메소드:**
    *   `initPresets(presets)`: `void`. 보스 프리셋 메타데이터(`boss-presets.json`)를 주입합니다. **주입 즉시 기존 스케줄을 48시간 분량으로 자동 확장합니다.**
    *   `getBossInterval(bossName, contextId)`: `number`. 특정 보스의 리젠 주기(분)를 프리셋에서 찾아 반환합니다. 보스 이름과 게임 컨텍스트를 기반으로 검색합니다.
    *   `getBossSchedule()`: `Array`. 현재 파싱 및 확장된 보스 일정 배열(Main SSOT)을 반환합니다.
    *   `setBossSchedule(newSchedule)`: `void`. 새로운 보스 일정 배열을 받고, **48시간 확장 엔진을 돌려 정규화한 뒤** Main SSOT에 저장하며, Draft를 동기화하고 구독자에게 알립니다.
    *   `getDraftSchedule()`: `Array`. 현재 편집 중인 Draft 스케줄을 반환합니다.
    *   `setDraftSchedule(newDraft)`: `void`. Draft 스케줄을 설정하고 localStorage에 저장합니다.
    *   `commitDraft()`: `void`. Draft 데이터를 **48시간 분량으로 자동 확장 및 정규화하여** Main SSOT에 적용(Commit)합니다.
    *   `clearDraft()`: `void`. Draft 스케줄을 초기화합니다.
    *   `getNextBossInfo()`: `{ nextBoss, minTimeDiff }`. 현재 가장 가까운 다음 보스 정보와 남은 시간을 반환합니다.
    *   `setNextBossInfo(nextBoss, minTimeDiff)`: `void`. 다음 보스 정보를 설정하고, 모든 구독자에게 데이터 변경을 알립니다.
    *   `getAllUpcomingBosses(nowTime)`: `Array`. 동적 보스와 고정 알림을 통합하여 시간순으로 정렬된 모든 예정된 보스 목록을 반환합니다.
    *   `getBossStatusSummary(nowTime)`: `Object`. 다음 보스, 남은 시간, 임박한 보스 목록 등 현재 상태 요약을 반환합니다.
    *   `getUpcomingBosses(count)`: `Array`. 현재 시간 이후 예정된 보스 목록을 `count`만큼 정확히 반환합니다.
    *   `subscribe(callback)`: `void`. `BossDataManager`의 데이터 변경을 감지할 콜백 함수를 등록합니다. **반응형 상태 관리 패턴(Observer Pattern)**을 구현합니다.

#### `LocalStorageManager` (싱글톤 객체)
- **설명:** 웹 브라우저의 `localStorage`를 통해 다양한 애플리케이션 설정(예: 음소거 상태, 알람 실행 상태, 사이드바 확장 상태) 및 사용자 데이터(고정 알림, 광 계산기 기록 등)를 영구적으로 저장하고 로드합니다. 특히 고정 알림 데이터는 `days` 속성(요일 정보)을 포함하도록 확장되었으며, 기존 데이터 로드 시 마이그레이션 로직이 자동 적용됩니다.
- **주요 메소드:**
    *   `init()`: `void`. 애플리케이션 시작 시 `localStorage`의 모든 관리 데이터를 로드합니다.
    *   `get(key)` / `set(key, value)`: `any` / `void`. 임의의 키-값 쌍을 `localStorage`에 저장하고 로드하는 일반적인 인터페이스입니다.
    *   `getFixedAlarms()` / `getFixedAlarmById(id)` / `addFixedAlarm()` / `updateFixedAlarm()` / `deleteFixedAlarm()`: 고정 알림 데이터에 대한 CRUD(생성, 읽기, 업데이트, 삭제) 작업을 제공합니다.
    *   `exportFixedAlarms()` / `importFixedAlarms(encodedData)`: 고정 알림 데이터를 인코딩/디코딩하여 공유 가능하게 합니다.
    *   `getMuteState()` / `setMuteState(state)`: `boolean` / `void`. 음소거 상태를 관리합니다.
    *   `getVolume()` / `setVolume(newVolume)`: `number` / `void`. 음성 알림 볼륨 레벨(0.0 ~ 1.0)을 관리하며, 기본값은 1입니다.
    *   `getPreMuteVolume()` / `setPreMuteVolume(newPreMuteVolume)`: `number` / `void`. 음소거 직전의 볼륨 레벨을 저장하고 복원하는 데 사용됩니다.
    *   그 외 `logVisibilityState`, `alarmRunningState`, `sidebarExpandedState`, `crazyCalculatorRecords` 등에 대한 `get/set` 함수를 제공합니다.
    *   `getLogVisibilityState()` / `setLogVisibilityState(state)`: `boolean` / `void`. 로그 화면의 "15개 보기" 토글 상태를 관리합니다.

---

## 6. `src/alarm-scheduler.js` (알람 시스템 관리 - Main Thread)

### 역할
보스 알림 시스템의 메인 스레드 관리자입니다. **Web Worker (`src/workers/timer-worker.js`)**를 생성하고 통신하며, 워커로부터 알림 신호(`ALARM`)를 받으면 실제 사용자에게 소리(`speak`)와 시스템 알림(`Notification`)을 제공합니다. 또한 `BossDataManager`의 변경 사항을 워커에 동기화합니다.

### 주요 `export` 함수

#### `startAlarm(DOM)`
- **설명:** 알림 시스템을 시작합니다. 워커에 `START` 메시지를 보내고, 최신 스케줄 데이터를 동기화합니다. 시스템 배너 알림 권한을 요청합니다.
- **인자:** `DOM` (`Object`)
- **반환값:** `void`

#### `stopAlarm(DOM)`
- **설명:** 알림 시스템을 중지합니다. 워커에 `STOP` 메시지를 보냅니다.
- **인자:** `DOM` (`Object`)
- **반환값:** `void`

#### `syncScheduleToWorker()`
- **설명:** `BossDataManager`와 `LocalStorageManager`의 데이터를 기반으로 알림 예정 시간을 미리 계산하여 단순화된 목록(`flatSchedule`)을 워커로 전송합니다. 고정 알림의 경우 `src/utils.js`의 `calculateNextOccurrence` 함수를 사용하여 요일별 다음 발생 시간을 계산합니다. **Smart Main, Dumb Worker** 패턴을 따릅니다.

#### `calculateNextBoss(now)`
- **설명:** 현재 시간을 기준으로 대시보드에 표시할 '다음 보스' 정보를 계산합니다. 고정 알림의 경우 `calculateNextOccurrence` 함수를 사용하여 요일을 고려한 다음 발생 시간을 결정합니다.
- **인자:** `now` (`Date`): 현재 시간 `Date` 객체.
- **반환값:** `{ nextBoss, minTimeDiff }`. 현재 가장 가까운 다음 보스 정보와 남은 시간을 반환합니다.

---

## 6-1. `src/workers/timer-worker.js` (백그라운드 타이머 워커 - Worker Thread)

### 역할
메인 스레드의 간섭 없이 백그라운드에서 안정적으로 시간을 체크하는 Web Worker입니다. 메인 스레드로부터 수신한 알림 예정 시간(`flatSchedule`)과 현재 시간을 1초마다 비교하여, 알림 시점이 되면 메인 스레드로 `ALARM` 메시지를 보냅니다.

### 주요 메시지 처리
- **수신 (`onmessage`):**
    - `START`: 타이머(`setInterval`) 시작.
    - `STOP`: 타이머 정지.
    - `UPDATE_SCHEDULE`: 알림 예정 목록 갱신.
- **발신 (`postMessage`):**
    - `TICK`: 매초 발생. 메인 스레드의 UI 갱신용.
    - `ALARM`: 알림 조건 충족 시 발생. 메인 스레드의 알림 실행 트리거.

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
    4.  `await loadBossSchedulerData()` 호출 (프리셋 및 초기 데이터 로드).

---

## 8. `src/global-event-listeners.js` (전역 EventBus 리스너 관리)

### 역할
애플리케이션 생명주기 내내 활성화되어야 하는 핵심적인 전역 `EventBus` 리스너들을 한곳에서 중앙 관리합니다. `app.js`의 `initApp` 함수에 의해 호출되어, `BossDataManager` 데이터 변경 감지, 로그 업데이트와 같은 반응형 로직을 담당합니다.

### 주요 `export` 함수

#### `initGlobalEventListeners(DOM)`
- **설명:** `app.js`에 의해 호출되어, 모든 전역 `EventBus` 리스너를 등록하고 활성화합니다.
- **인자:** `DOM` (`Object`)
- **반환값:** `void`
- **주요 `export` 함수:**
    - `BossDataManager.initPresets(presets)`: 불러온 외부 프리셋 데이터를 매니저에 주입합니다.
    - `BossDataManager.getBossInterval(bossName, contextId)`: 특정 보스의 리젠 주기를 프리셋에서 직접 조회합니다.
    - `BossDataManager.subscribe(callback)`: 데이터 변경 시 실행할 콜백 함수를 등록합니다.
- **핵심 내부 로직:**
    1.  `BossDataManager.subscribe`: 데이터 변경 시 대시보드 UI(`renderDashboard`)를 자동으로 갱신하는 리스너를 등록합니다.
    2.  `EventBus.on('log-updated')`: 새로운 로그가 발생했을 때, 현재 '알림 로그' 화면이 활성화 상태이면 로그 목록(`renderAlarmLog`)을 실시간으로 갱신하는 리스너를 등록합니다.



## 9. `src/logger.js`

- **역할:** 애플리케이션 전반의 메시지 로깅을 담당합니다. 로그를 저장하고, 지정된 DOM 요소에 표시하며, `EventBus`를 통해 로그 업데이트를 알립니다.
- **주요 `export` 함수:**
    - `initLogger(containerElement)`: 로그 메시지가 표시될 DOM 요소를 설정합니다.
    - `log(message, isImportant)`: 메시지를 로깅하고, `logContainer`에 추가하며, `EventBus.emit('log-updated')`를 발생시킵니다.
    - `getLogs()`: 현재까지 저장된 모든 로그 항목을 반환합니다.

## 11. `src/speech.js`

- **역할:** 웹 음성 API (`window.speechSynthesis`)를 활용하여 텍스트를 음성으로 변환하여 출력합니다. 음성 요청 큐를 관리하며 음소거 상태를 고려합니다.
- **주요 `export` 함수:**
    - `speak(text)`: 주어진 텍스트를 음성으로 출력 요청 큐에 추가합니다. `LocalStorageManager`에서 현재 설정된 볼륨을 가져와 음성 출력에 적용하며, 음소거 상태일 경우 음성을 출력하지 않습니다.

## 12. `src/api-service.js`

- **역할:** TinyURL API를 통한 URL 단축 및 로컬 JSON 파일 로드와 같은 외부 서비스와의 비동기 통신을 처리합니다.
- **주요 `export` 함수:**
    - `getShortUrl(longUrl)`: TinyURL API를 사용하여 긴 URL을 단축합니다.
    - `loadJsonContent(filePath)`: 지정된 경로에서 JSON 파일을 비동기적으로 로드합니다.

## 13. `src/boss-parser.js`

- **역할:** 사용자 입력 텍스트(보스 목록)를 파싱하여 구조화된 데이터로 변환합니다. **시간 역전 감지 로직**을 통해 날짜 롤오버를 자동 처리하며, **엄격한 날짜 헤더 규칙**과 **지능형 이름 추출**을 지원합니다.
- **주요 `export` 함수:**
    - `parseBossList(bossListInput)`:
        *   **엄격한 날짜 헤더**: 첫 번째 줄은 반드시 `MM.DD` 형식의 날짜여야 하며, 이를 기준으로 전체 일정의 시작점을 정의합니다.
        *   **지능형 이름 추출**: 명시적인 비고 구분자(`#`)가 없을 경우 시간 뒤의 텍스트 전체를 이름으로 간주하여 공백 포함 이름을 안전하게 보존합니다.
        *   각 줄을 파싱할 때 보스 이름과 시간을 조합한 **표준 UID**를 생성하여 부여하며, 시간 역전 감지 로직을 통해 날짜 롤오버를 자동 처리합니다.
    - `getSortedBossListText(rawText)`: 원본 텍스트를 그대로 반환합니다 (하위 호환성).

## 14. `src/boss-scheduler-data.js`

- **역할:** 보스 프리셋 메타데이터(`boss-presets.json`) 및 초기 기본 데이터(`initial-default.json`)를 비동기 로드하고 제공합니다. `CustomListManager`와 연동하여 사용자 지정 목록도 통합 관리합니다.
- **주요 `export` 함수:**
    - `loadBossSchedulerData()`: `boss-presets.json`과 `initial-default.json`을 `fetch`로 비동기 로드합니다. 로드 실패 시 사용자에게 알림(`alert`)을 표시하고 빈 데이터로 폴백합니다.
    - `getInitialDefaultData()`: 앱 초기 구동 시 사용할 기본 보스 목록 데이터(`{ items: [...] }`)를 반환합니다.
    - `getBossMetadata()`: 전체 보스 프리셋 메타데이터 객체를 반환합니다.
    - `getGameNames()`: 프리셋 게임 목록과 사용자 커스텀 목록을 통합하여 `{ id, name, isCustom }` 형태의 배열로 반환합니다.
    - `getBossNamesForGame(gameIdOrName)`: 특정 게임/목록의 보스 이름 배열을 반환합니다. 프리셋 ID, 게임 이름, 커스텀 목록 순서로 검색합니다.

## 14.1. `src/services.js`

- **역할:** 애플리케이션의 핵심 서비스들을 초기화하는 진입점을 제공합니다.
- **주요 `export` 함수:**
    - `initializeCoreServices(DOM)`: 로거 초기화, `LocalStorageManager.init()`, `CustomListManager.init()` 호출, 보스 데이터 비동기 로드 후 `BossDataManager.initPresets()` 호출을 순차적으로 수행합니다. `app.js`의 `initApp()`에서 `await`로 호출됩니다.

## 15. `src/custom-list-manager.js`

- **역할:** 사용자 지정 보스 목록(이름, 내용)의 생성, 조회, 수정, 삭제(CRUD) 로직을 관리하고 `LocalStorageManager`를 통해 영구 저장합니다. 강력한 유효성 검사 및 이름 중복 확인 기능을 포함합니다.
- **주요 `export` 객체:**
    - `CustomListManager`: `init()`, `addCustomList()`, `updateCustomList()`, `deleteCustomList()`, `renameCustomList()`, `getBossNamesForCustomList()`, `getCustomListContent()`, `isPredefinedGameName()` 등의 메소드를 제공합니다.

## 16. `src/utils.js`

- **역할:** 숫자 패딩, 날짜 포맷팅, 시간 유효성 검사, 시간 차이 계산, 고유 ID 생성 등 애플리케이션 전반에 걸쳐 사용되는 범용 유틸리티 함수들을 모아놓은 모듈입니다.
- **주요 `export` 함수:** `padNumber()`, `formatMonthDay()`, `validateStandardClockTime()`, `formatTimeDifference()`, `generateUniqueId()`, `normalizeTimeFormat()`, `calculateNextOccurrence()`, `parseTime()` 등. (`calculateNextOccurrence`는 고정 알림의 다음 발생 시간 계산 시 요일을 고려합니다.)

## 17. `src/calculator.js`

- **역할:** 젠 계산기(`Zen Calculator`)의 핵심 로직을 포함하며, 남은 시간을 기반으로 보스 출현 시간을 계산합니다.
- **주요 `export` 함수:**
    *   `calculateBossAppearanceTime(remainingTime)`: 주어진 남은 시간으로부터 보스의 정확한 출현 시간을 계산하여 반환합니다.

#### `calculateAppearanceTimeFromMinutes(remainingTimeString)`
- **설명:** 'MM:SS' 또는 'MMSS' 형식의 남은 시간 문자열로부터 보스 출현 시간을 `Date` 객체로 계산하여 반환합니다.
- **인자:** `remainingTimeString` (`string`): 'MM:SS' 또는 'MMSS' 형식의 남은 시간.
- **반환값:** `Date|null`

## 18. `src/event-bus.js`

- **역할:** 모듈 간의 느슨하게 결합된 통신을 위한 간단한 전역 이벤트 버스를 제공합니다.

- **주요 `export` 객체:**
    - `EventBus`:
        - `on(event, listener)`: 특정 이벤트에 대한 리스너를 등록합니다.
        - `emit(event, data)`: 특정 이벤트를 발생시키고 등록된 모든 리스너에게 데이터를 전달합니다.


## 19. `src/crazy-calculator.js`

- **역할:** 광 계산기(`Crazy Calculator`)의 복잡한 로직과 상태를 관리하는 싱글톤 객체입니다. 스톱워치, 광/잡힘 시간 기록, 예상 시간 계산, 그리고 기록 저장 및 관리를 담당합니다.
    - **주요 `export` 객체:**
        - `CrazyCalculator`: `startStopwatch()`, `stopStopwatch()`, `triggerGwang()`, `saveCrazyCalculation()`, `resetCalculator()`, `getCrazyCalculatorRecords()` 등의 메소드를 제공합니다.

#### `formatTime(seconds)`
- **설명:** 주어진 초(seconds) 값을 'MM:SS' 형식의 문자열로 변환합니다.
- **인자:** `seconds` (`number`): 포맷팅할 시간(초 단위).
- **반환값:** `string`
## 20. `src/pip-manager.js` (Document PiP 위젯 관리)

- **역할:** 최신 브라우저의 Document Picture-in-Picture API를 활용하여 대시보드의 '다음 보스' 정보를 항상 위에 떠 있는 작은 창(PiP 위젯)으로 관리합니다. PiP 창의 열기/닫기, 콘텐츠 업데이트 및 상태 관리 로직을 담당합니다.

- **주요 `export` 함수:**
    - `togglePipWindow()`: PiP 창을 열거나 닫습니다. 호출 시 PiP API 지원 여부를 확인하고, 지원 시 `requestWindow()`를 통해 새 창을 생성합니다. `pip-content.html`의 HTML과 CSS를 로드하여 삽입하며, 사용자가 PiP 창을 닫을 경우 내부 상태를 재설정하기 위한 `pagehide` 이벤트 리스너를 등록합니다. 창의 초기 크기는 너비 240px, 높이 100px로 설정됩니다.
    - `updatePipContent(nextBoss, minTimeDiff)`: 열려 있는 PiP 창의 내용을 '다음 보스' 정보로 업데이트합니다. 남은 시간에 따라 시간 표시의 색상을 동적으로 변경(5분 미만: 빨강, 10분 미만: 주황, 1시간 미만: 검정, 1시간 이상: 회색)합니다.
    - `isPipWindowOpen()`: PiP 창이 현재 열려 있는지 여부를 반환합니다.

---

## 21. 화면 모듈 상세 (`src/screens/*.js`)

각 화면의 초기화 및 전환 시 로직을 담당하며, `src/router.js`에 등록됩니다.

| 모듈 파일 | 주요 `export` 함수 | 상세 역할 및 내부 로직 |
|---|---|---|
| **`alarm-log.js`** | `getScreen()` | `onTransition` 시 `initAlarmLogScreen(DOM)`을 호출하여 로그 화면을 초기화합니다. `initAlarmLogScreen`은 `LocalStorageManager`를 통해 "15개 보기" 토글 버튼의 상태를 로드/저장하고 관련 이벤트 리스너를 등록합니다. 로그의 실시간 갱신은 `global-event-listeners.js`에 중앙화된 `log-updated` 이벤트 리스너를 통해 자동으로 처리됩니다. `renderAlarmLog`는 토글 상태에 따라 최근 15개 또는 전체 로그를 렌더링합니다. |
| **`timetable.js`** | `getScreen()` | `init` 시 '뷰/편집' 모드 토글 버튼, '표/카드' 보기 모드 전환 버튼, 그리고 '다음 보스' 필터 토글 버튼의 이벤트 리스너를 등록합니다. `LocalStorageManager`를 통해 마지막으로 사용된 모드와 보기 형식(`timetable-view-mode`)을 로드하고, `updateTimetableUI`를 호출하여 모드에 맞는 UI를 렌더링합니다. `onTransition` 시 `startAutoRefresh` 함수를 통해 1초 간격의 타이머를 시작하여, '뷰 모드'에서 '다음 보스' 필터가 활성화된 경우 목록을 실시간으로 자동 갱신합니다. 화면이 비활성화되면 타이머는 자동으로 중지됩니다. '편집 모드'에서는 기존의 텍스트 영역 기반 보스 목록 편집 및 "보스 시간 업데이트" 기능을 제공하며, '뷰 모드'에서는 보스 목록을 **카드 리스트 또는 테이블 형식**으로 표시하고 '다음 보스' 필터링 기능을 제공합니다. '편집 모드'에서만 "보스 시간 업데이트" 버튼의 클릭 이벤트가 처리됩니다. |
| **`boss-scheduler.js`** | `getScreen()` | `init` 시 `EventBus.on('show-boss-scheduler-screen')` 및 `EventBus.on('rerender-boss-scheduler')` 리스너를 등록하고, UI를 렌더링합니다. `remaining-time-input` 필드의 유효성 검사는 사용자 입력을 방해하지 않도록 **지연 검증(Deferred Validation)** 정책을 적용하여, 최종 "보스 시간 업데이트" 버튼 클릭 시점에 일괄 수행합니다. `handleApplyBossSettings(DOM)` 함수는 입력된 `data-id`와 계산된 시간, 그리고 `dataset.timeFormat`을 기반으로 `boss` 객체를 업데이트하고 리스트를 재구성하여 저장합니다. |
| **`calculator.js`** | `getScreen()` | `init` 시 `initCalculatorScreen(DOM)`이 호출되어 '젠 계산기' 및 '광 계산기'의 모든 이벤트 리스너를 등록합니다. `onTransition` 시 `handleCalculatorScreenTransition(DOM)`이 호출되어 `CrazyCalculator`의 상태를 초기화하고 `ui-renderer.js`의 `renderCalculatorScreen(DOM)`을 호출하여 화면을 렌더링합니다. `checkZenCalculatorUpdateButtonState(DOM)` 헬퍼 함수를 통해 '보스 시간 업데이트' 버튼의 활성화/비활성화 상태를 관리합니다. |
| **`custom-list.js`** | `getScreen()` | `init` 시 `initCustomListScreen(DOM)`이 호출되어 '커스텀 보스 관리' 모달의 이벤트 리스너(열기, 닫기, 탭 전환, 목록 CRUD)를 등록합니다. `DOM.manageCustomListsButton` 클릭 시 모달이 열리며, 목록 변경 시 `EventBus.emit('rerender-boss-scheduler')`를 발행하여 보스 스케줄러의 드롭다운을 업데이트합니다. |
| **`dashboard.js`** | `getScreen()` | `init` 시 `initDashboardScreen(DOM)`이 호출되어 `DOM.muteToggleButton` (음소거 버튼)과 `DOM.volumeSlider` (볼륨 슬라이더)에 대한 이벤트 리스너를 등록하고, '최근 알림 로그'를 초기 렌더링합니다. 음소거 버튼 클릭 시 `LocalStorageManager.setMuteState()`를 호출하여 음소거 상태를 토글하며, 볼륨 슬라이더 조작 시 `LocalStorageManager.setVolume()`을 통해 볼륨 값을 저장합니다. 두 UI 요소 모두 변경 시 `ui-renderer.js`의 `updateSoundControls(DOM)`를 호출하여 시각적 상태를 갱신합니다. `initDashboardScreen`은 `EventBus.on('log-updated', ...)` 리스너를 등록하여 새로운 로그 발생 시 `renderRecentAlarmLog(DOM)`를 호출하여 로그를 갱신합니다. |
| **`help.js`** | `getScreen()` | `init` 시 `handleTabSwitching(DOM)`이 호출되어 '도움말'과 'FAQ' 탭 전환 이벤트 리스너를 등록합니다. `onTransition` 시 `onHelpScreenTransition(DOM)`이 호출되어 `data/feature_guide.json`과 `data/faq_guide.json`을 비동기적으로 로드하고, `ui-renderer.js`의 `renderHelpScreen()`과 `renderFaqScreen()`을 호출하여 각 탭의 콘텐츠를 렌더링합니다. |
| **`settings.js`** | `getScreen()` | `init` 시 `initSettingsScreen(DOM)`이 호출되어 고정 알림 모달의 '추가' 및 목록의 '편집/삭제/토글' 이벤트 리스너를 등록합니다. 모달은 고정 알림의 추가/편집을 담당하며, 요일 선택 기능과 데이터 저장 로직을 포함합니다. (`LocalStorageManager`의 `getFixedAlarmById`를 사용) |
| **`share.js`** | `getScreen()` | `onTransition` 시 `initShareScreen(DOM)`이 호출되어 현재의 동적 보스 목록(`data`)을 인코딩하여 `api-service.js`의 `getShortUrl()`을 통해 짧은 URL을 생성합니다. 생성된 URL은 `navigator.clipboard.writeText()`를 사용하여 클립보드에 복사되며, `DOM.shareMessage`에 결과 메시지를 표시합니다. (고정 알림은 공유되지 않습니다.) |
| **`version-info.js`** | `getScreen()` | `onTransition` 시 `initVersionInfoScreen(DOM)`이 호출되어 `api-service.js`의 `loadJsonContent()`를 통해 `data/version_history.json` 파일을 로드하고, `ui-renderer.js`의 `renderVersionInfo(DOM, versionData)`를 호출하여 릴리즈 노트 콘텐츠를 렌더링합니다. |
