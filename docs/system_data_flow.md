# 데이터 흐름 (리팩토링 v4.0)

리팩토링 v4.0 아키텍처의 주요 데이터 흐름은 **중앙 오케스트레이터(`app.js`)**와 **독립적인 화면 모듈(`screens/*.js`)** 간의 상호작용, 그리고 **`EventBus`를 통한 모듈 간 통신**을 중심으로 이루어집니다.

## 1. 초기 로드 및 초기화

1.  **`index.html` 로드:** 브라우저가 `index.html`을 로드하고, `<script type="module" src="src/app.js"></script>`를 통해 `app.js`를 실행합니다.
2.  **`app.js: initApp()` 실행:**
    - `initDomElements()`를 호출하여 모든 DOM 요소 참조(`DOM` 객체)를 가져옵니다.
    - `initLogger(DOM.logContainer)`를 호출하여 로거를 초기화합니다.
    - `LocalStorageManager.init()`, `CustomListManager.init()` 등을 호출하여 `localStorage`에서 영구 데이터를 로드합니다.
    - URL 파라미터 또는 기본 보스 목록을 `bossListInput` 텍스트 영역에 설정합니다.
    - `parseBossList()`를 호출하여 텍스트 영역의 내용을 기반으로 `BossDataManager`에 초기 보스 일정을 설정합니다.
3.  **이벤트 리스너 등록:**
    - `initEventHandlers(DOM)` 함수가 호출됩니다.
    - 이 함수는 **전역 이벤트 리스너**(사이드바 토글, 내비게이션 메뉴 클릭 등)를 등록합니다.
    - 가장 중요한 역할로, **모든 `screens/*.js` 모듈의 `init...Screen()` 함수를 호출**합니다. 각 화면 모듈은 이 시점에 자신의 이벤트 리스너를 DOM에 등록하고, `EventBus`를 구독하기 시작합니다.
    - `EventBus.on('navigate', ...)` 리스너가 등록되어, 어떤 모듈이든 화면 전환을 요청할 수 있게 됩니다.
4.  **초기 화면 표시:**
    - `showScreen(DOM, 'dashboard-screen')`을 호출하여 대시보드 화면을 활성화합니다.
    - `showScreen` 함수는 `EventBus.emit('refresh-dashboard', DOM)`을 발생시킵니다.
    - `dashboard.js` 모듈의 `refresh-dashboard` 이벤트 리스너가 이를 수신하여 `renderDashboard(DOM)`를 호출, 초기 대시보드 UI를 렌더링합니다.

## 2. 화면 전환 흐름

1.  **사용자 입력:** 사용자가 사이드바 또는 하단 탭 바에서 메뉴 항목(예: '보스 스케줄러')을 클릭합니다.
2.  **`app.js` 이벤트 처리:** `app.js`의 `initEventHandlers`에 등록된 내비게이션 클릭 리스너가 실행되고, `showScreen(DOM, 'boss-scheduler-screen')`을 호출합니다.
3.  **`showScreen` 실행:**
    - 모든 화면(`screen` 클래스)을 비활성화하고, 대상 화면(`boss-scheduler-screen`)만 활성화합니다.
    - 내비게이션 메뉴의 `active` 클래스를 동기화합니다.
    - 해당 화면을 위한 이벤트를 `EventBus`로 발행합니다. (예: `EventBus.emit('show-boss-scheduler-screen')`)
4.  **화면 모듈 이벤트 수신:**
    - `src/screens/boss-scheduler.js` 모듈의 `initBossSchedulerScreen` 함수에서 등록한 `show-boss-scheduler-screen` 이벤트 리스너가 실행됩니다.
    - 이 리스너는 `renderBossSchedulerScreen(DOM, _remainingTimes)`를 호출하여 화면의 초기 콘텐츠를 렌더링합니다.

## 3. 주요 기능 데이터 흐름 (예시: 커스텀 목록 추가)

1.  **사용자 입력:** '보스 스케줄러' 화면 > '커스텀 목록 관리' 버튼 클릭.
2.  **모달 열기:** `src/screens/custom-list.js`의 이벤트 핸들러가 모달을 엽니다.
3.  **데이터 입력:** 사용자가 목록 이름과 보스 이름을 입력하고 '저장' 버튼을 클릭합니다.
4.  **`custom-list.js` 처리:**
    - `saveCustomListButton`의 클릭 핸들러가 실행됩니다.
    - `CustomListManager.addCustomList()`를 호출하여 입력값의 유효성을 검사하고, `LocalStorageManager`를 통해 `localStorage`에 데이터를 저장합니다.
5.  **UI 피드백 및 갱신:**
    - `showToast(DOM, ...)`를 호출하여 성공 메시지를 표시합니다.
    - `renderCustomListManagementModalContent(DOM)`를 호출하여 모달 내의 '목록 관리' 탭을 새로고침합니다.
    - `EventBus.emit('rerender-boss-scheduler')`를 발생시켜 '보스 스케줄러' 화면의 게임 드롭다운 목록을 갱신하도록 요청합니다.
6.  **이벤트 수신 및 처리:**
    - `src/screens/boss-scheduler.js` 모듈이 `rerender-boss-scheduler` 이벤트를 수신하여 `renderBossSchedulerScreen()`을 호출, 드롭다운 UI를 업데이트합니다.

이처럼, 리팩토링된 아키텍처는 `app.js`가 전역적인 상호작용과 화면의 '틀'을 제어하고, 각 `screens/*.js` 모듈이 해당 화면 내부의 구체적인 로직을 담당하며, `EventBus`를 통해 서로 느슨하게 연결되는 구조를 가집니다.
