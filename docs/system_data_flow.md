# 데이터 흐름 (리팩토링 v4.0 - 상세)

리팩토링 v4.0 아키텍처의 주요 데이터 흐름은 **중앙 오케스트레이터(`app.js`)**와 **독립적인 화면 모듈(`screens/*.js`)** 간의 상호작용, 그리고 **`EventBus`를 통한 모듈 간 통신**을 중심으로 이루어집니다.

## 1. 애플리케이션 초기 로드

1.  **`index.html` 로드:** 브라우저가 `index.html`을 로드하고, `<script type="module" src="src/app.js"></script>`를 통해 `app.js`를 실행합니다.
2.  **`app.js: initApp()` 실행:**
    1.  `initDomElements()`를 호출하여 모든 DOM 요소 참조(`DOM` 객체)를 생성합니다.
    2.  `initLogger()`를 호출하여 로거 UI를 준비합니다.
    3.  `loadBossLists()`를 호출하여 `data/boss_lists.json`에서 기본 보스 목록을 로드합니다.
    4.  `LocalStorageManager.init()`과 `CustomListManager.init()`을 호출하여 `localStorage`에서 모든 영구 데이터를 메모리로 로드합니다. (고정 알림, 커스텀 목록, 각종 설정 등)
    5.  URL에 `data` 파라미터가 있으면 그 값을, 없으면 `default-boss-list.js`의 기본 목록을 `<textarea>`에 설정합니다.
    6.  `parseBossList()`를 호출하여 텍스트 영역의 내용을 기반으로 `BossDataManager`에 초기 보스 일정을 설정합니다.
3.  **이벤트 리스너 등록 (`initEventHandlers`):**
    1.  `initEventHandlers(DOM)` 함수가 호출됩니다.
    2.  **전역 이벤트 리스너**('알람 시작/중지', '사이드바 토글', 내비게이션 메뉴 클릭 등)가 등록됩니다.
    3.  모든 `screens/*.js` 모듈의 **`init...Screen(DOM)` 함수가 각각 호출**됩니다. 각 화면 모듈은 이 시점에 자신의 이벤트 리스너를 DOM에 등록하고, 필요한 `EventBus` 이벤트를 구독하기 시작합니다.
    4.  `EventBus.on('navigate', ...)` 리스너가 등록되어, 어떤 모듈이든 화면 전환을 요청할 수 있게 됩니다.
4.  **초기 화면 표시:**
    1.  `showScreen(DOM, 'dashboard-screen')`을 호출합니다.
    2.  `showScreen` 함수는 `'dashboard-screen'`이 활성화되도록 하고, `EventBus.emit('refresh-dashboard', DOM)`을 발생시킵니다.
    3.  `dashboard.js` 모듈의 `refresh-dashboard` 이벤트 리스너가 이를 수신하여 `renderDashboard(DOM)`를 호출, 초기 대시보드 UI를 렌더링합니다.
    4.  `initApp`은 마지막으로 `EventBus.emit('refresh-dashboard', DOM)`을 한 번 더 호출하여 모든 컴포넌트가 완전히 로드된 후 최종 UI 상태를 보장합니다.

## 2. 화면 전환 흐름 (예: '보스 스케줄러' 클릭)

1.  **사용자 입력:** 사용자가 사이드바 또는 하단 탭 바에서 '보스 스케줄러' 메뉴를 클릭합니다.
2.  **`app.js` 이벤트 처리:** `app.js`의 `initEventHandlers`에 등록된 내비게이션 클릭 리스너가 실행되고, `showScreen(DOM, 'boss-scheduler-screen')`을 호출합니다.
3.  **`showScreen` 실행:**
    1.  모든 화면(`screen` 클래스)을 비활성화하고, 대상 화면(`boss-scheduler-screen`)만 활성화합니다.
    2.  내비게이션 메뉴의 `active` 클래스를 동기화합니다.
    3.  `EventBus.emit('show-boss-scheduler-screen')` 이벤트를 발행합니다.
4.  **화면 모듈 이벤트 수신:**
    - `src/screens/boss-scheduler.js` 모듈이 `show-boss-scheduler-screen` 이벤트를 수신합니다.
    - 리스너 함수는 `renderBossSchedulerScreen()`을 호출하여 화면의 초기 콘텐츠(게임 드롭다운, 보스 입력 목록 등)를 렌더링합니다.

## 3. 주요 기능 데이터 흐름 (예시: 보스 스케줄러 설정 적용)

1.  **사용자 입력:** '보스 스케줄러' 화면에서 시간 입력 후 '보스 설정 적용' 버튼 클릭.
2.  **`boss-scheduler.js` 처리:**
    1.  `moveToBossSettingsButton`의 클릭 핸들러가 실행됩니다.
    2.  현재 입력된 남은 시간들을 바탕으로 `HH:MM 보스이름` 형식의 전체 보스 목록 텍스트를 생성합니다.
    3.  생성된 텍스트를 `DOM.bossListInput.value`에 설정합니다.
    4.  `boss-parser.js`의 `parseBossList()`를 호출하여 `BossDataManager`의 `bossSchedule` 상태를 업데이트합니다.
    5.  `EventBus.emit('navigate', 'boss-management-screen')`을 통해 `app.js`에 화면 전환을 요청합니다.
3.  **`app.js` 이벤트 수신 및 처리:**
    1.  `app.js`의 `navigate` 이벤트 리스너가 `'boss-management-screen'` 값을 받아 `showScreen(DOM, 'boss-management-screen')`을 호출합니다.
4.  **UI 최종 갱신:**
    - `showScreen`은 '보스 관리' 화면을 활성화합니다. 이 화면은 별도의 초기화 로직 없이 `<textarea>`의 값만 보여주므로, 사용자는 방금 생성된 새로운 보스 목록을 즉시 확인할 수 있습니다.
    - 잠시 후 `alarm-scheduler.js`의 `setInterval`이 `EventBus.emit('refresh-dashboard', DOM)`을 발생시키면, 대시보드의 '다음 보스' 정보도 새로운 일정에 맞게 업데이트됩니다.