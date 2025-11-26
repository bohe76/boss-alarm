# 데이터 흐름 (API 명세서 수준)

리팩토링 v4.0 아키텍처의 주요 데이터 흐름은 **중앙 오케스트레이터(`app.js`)**와 **독립적인 화면 모듈(`screens/*.js`)** 간의 상호작용, 그리고 **`EventBus`를 통한 모듈 간 통신**을 중심으로 이루어집니다.

## 1. 애플리케이션 초기 로드

1.  **`index.html` 로드:** 브라우저가 `app.js`를 로드하고 `initApp()` 함수를 실행합니다.

2.  **`app.js: initApp()` 실행:**
    1.  **DOM 참조 생성:** `initDomElements()`를 호출하여 모든 DOM 요소 참조를 `DOM` 객체에 저장합니다.
    2.  **서비스 초기화:** `initLogger()`, `loadBossLists()`, `LocalStorageManager.init()`, `CustomListManager.init()`을 순차적으로 호출하여 로거, 기본 보스 데이터, 로컬 스토리지 데이터를 메모리로 로드합니다.
    3.  **데이터 설정:** URL 파라미터 또는 `default-boss-list.js`의 데이터를 `<textarea id="bossListInput">`의 `value`로 설정합니다.
    4.  **초기 상태 설정:** `parseBossList()`를 호출합니다. 이 함수는 `textarea`의 텍스트를 파싱하여 보스 객체 배열을 생성하고, `BossDataManager.setBossSchedule()`을 통해 애플리케이션의 핵심 상태인 `bossSchedule` 배열을 설정합니다.
    5.  **이벤트 리스너 등록:** `initEventHandlers(DOM)` 함수를 호출하여 전역 이벤트 리스너(내비게이션, 사이드바 토글 등)를 등록하고, 모든 `screens/*.js` 모듈의 `init...Screen()` 함수들을 호출하여 각 화면이 자신의 이벤트 리스너를 등록하고 `EventBus` 이벤트를 구독하도록 합니다. `EventBus.on('navigate', ...)` 리스너도 이 단계에서 등록됩니다.
    6.  **초기 화면 렌더링:**
        - `showScreen(DOM, 'dashboard-screen')`을 호출합니다.
        - `showScreen` 함수는 `EventBus.emit('refresh-dashboard', DOM)` 이벤트를 발행합니다.
        - `dashboard.js` 모듈은 이 이벤트를 수신하여 `renderDashboard(DOM)`를 호출합니다.
        - `renderDashboard`는 `BossDataManager.getNextBossInfo()`와 `getUpcomingBosses()` 등을 호출하여 현재 데이터 상태에 맞는 UI를 최종적으로 화면에 그립니다.
    7.  `initApp`은 마지막으로 `EventBus.emit('refresh-dashboard', DOM)`을 한 번 더 호출하여 모든 컴포넌트가 완전히 로드된 후 최종 UI 상태를 보장합니다.

## 2. 알람 시작 및 주기적 갱신 흐름

1.  **사용자 입력:** 사용자가 '알람 시작' 버튼(`alarmToggleButton`)을 클릭합니다.
2.  **`app.js` 이벤트 처리:** `initEventHandlers`에 등록된 클릭 리스너가 `alarm-scheduler.js`의 `startAlarm(DOM)` 함수를 호출합니다.
3.  **`alarm-scheduler.js: startAlarm()` 실행:**
    1.  `LocalStorageManager.setAlarmRunningState(true)`를 호출하여 상태를 영구 저장합니다.
    2.  1초 간격의 `setInterval`을 시작합니다. 이 타이머는 매초 다음 두 가지 작업을 수행합니다.
        - **`checkAlarms()` 호출:** 현재 시간과 `BossDataManager`의 `bossSchedule`을 비교하여 알람(5분, 1분, 정각)을 트리거할지 결정합니다. 조건 충족 시 `log()`와 `speak()`를 호출합니다. 또한, 가장 가까운 다음 보스 정보를 계산하여 `BossDataManager.setNextBossInfo()`를 통해 상태를 업데이트합니다.
        - **`EventBus.emit('refresh-dashboard', DOM)` 발행:** 대시보드 UI 갱신을 요청합니다.
4.  **`dashboard.js` 이벤트 수신:**
    - `dashboard.js`가 `refresh-dashboard` 이벤트를 수신합니다.
    - `renderDashboard(DOM)`를 호출합니다. 이 함수는 `BossDataManager`에서 방금 `checkAlarms()`가 업데이트한 최신 '다음 보스' 정보를 가져와 화면에 표시합니다.

## 3. 주요 기능 데이터 흐름 (예시: 보스 스케줄러 설정 적용)

1.  **사용자 입력:** '보스 스케줄러' 화면에서 시간 입력 후 '보스 설정 적용' 버튼(`moveToBossSettingsButton`) 클릭.
2.  **`boss-scheduler.js` 처리:**
    1.  클릭 이벤트 핸들러가 실행됩니다.
    2.  입력된 남은 시간들을 바탕으로 `HH:MM 보스이름` 형식의 전체 보스 목록 텍스트를 생성합니다.
    3.  **DOM 상태 변경:** 생성된 텍스트를 `DOM.bossListInput.value`에 설정합니다.
    4.  **애플리케이션 상태 업데이트:** `boss-parser.js`의 `parseBossList()`를 호출합니다. 이 함수는 `DOM.bossListInput.value`를 읽어 보스 객체 배열을 생성하고, `BossDataManager.setBossSchedule()`을 통해 전역 보스 일정 상태를 업데이트합니다.
    5.  **화면 전환 요청:** `EventBus.emit('navigate', 'boss-management-screen')`을 통해 `app.js`에 화면 전환을 요청합니다.
3.  **`app.js` 이벤트 수신 및 처리:**
    1.  `app.js`의 `navigate` 이벤트 리스너가 `'boss-management-screen'` 값을 받아 `showScreen(DOM, 'boss-management-screen')`을 호출합니다.
4.  **UI 최종 갱신:**
    - `showScreen`은 '보스 관리' 화면을 활성화합니다. 사용자는 `<textarea>`에서 방금 생성된 새로운 보스 목록을 즉시 확인할 수 있습니다.
    - `alarm-scheduler.js`의 주기적인 `refresh-dashboard` 이벤트에 의해 대시보드가 갱신되면서, '다음 보스' 정보도 새로운 일정에 맞게 업데이트됩니다.
