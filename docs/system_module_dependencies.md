## 모듈 간 의존성

애플리케이션의 모듈 간 의존성은 다음과 같습니다.

*   `index.html` -> `src/event-handlers.js` (`initApp` 호출)
*   `index.html` -> `src/dom-elements.js` (`initDomElements` 호출)
*   `index.html` -> `src/logger.js` (`initLogger`, `log` 호출)
*   `index.html` -> `src/speech.js` (`speak` 호출)
*   `index.html` -> `src/data-managers.js` (`BossDataManager`, `LocalStorageManager` 사용)
*   `index.html` -> `src/boss-parser.js` (`parseBossList` 호출)
*   `index.html` -> `src/alarm-scheduler.js` (`startAlarm`, `stopAlarm`, `getIsAlarmRunning` 호출)
*   `index.html` -> `src/ui-renderer.js` (`updateBossListTextarea`, `renderFixedAlarms`, `updateFixedAlarmVisuals`, `renderDashboard`, `renderBossPresets`, `renderVersionInfo` 호출)
*   `index.html` -> `src/api-service.js` (`getShortUrl`, `loadJsonContent` 호출)
*   `src/event-handlers.js` -> `src/api-service.js` (`getShortUrl`, `loadJsonContent` 호출)
*   `src/event-handlers.js` -> `docs/feature_guide.json` (도움말 콘텐츠 로드)
*   `index.html` -> `src/default-boss-list.js` (`bossPresets` 사용)
*   `index.html` -> `src/calculator.js` (`calculateBossAppearanceTime` 호출)
*   `index.html` -> `src/boss-scheduler-data.js` (`loadBossLists`, `getGameNames`, `getBossNamesForGame` 호출)
*   `index.html` -> `src/light-calculator.js` (`LightCalculator` 사용)
*   `index.html` -> `src/custom-list-manager.js` (`CustomListManager` 사용)

*   `src/custom-list-manager.js` -> `src/data-managers.js` (`LocalStorageManager` 사용)
*   `src/custom-list-manager.js` -> `src/logger.js` (`log` 호출)
*   `src/custom-list-manager.js` -> `src/boss-scheduler-data.js` (`getGameNames` 호출, 미리 정의된 게임 이름과의 충돌 방지용)

*   `src/event-handlers.js` -> `src/dom-elements.js` (DOM 요소 접근)
*   `src/event-handlers.js` -> `src/logger.js` (`initLogger`, `log` 호출)
*   `src/event-handlers.js` -> `src/boss-parser.js` (`parseBossList`, **`getSortedBossListText`** 호출)
*   `src/event-handlers.js` -> `src/alarm-scheduler.js` (`startAlarm`, `stopAlarm`, `getIsAlarmRunning` 호출)
*   `src/event-handlers.js` -> `src/ui-renderer.js` (`updateBossListTextarea`, `renderFixedAlarms`, `updateFixedAlarmVisuals`, `renderDashboard`, `renderBossPresets`, `renderVersionInfo`, `renderCalculatorScreen`, `renderBossSchedulerScreen`, `renderBossInputs`, `updateLightStopwatchDisplay`, `updateLightExpectedTimeDisplay`, `renderLightTempResults`, `renderLightSavedList` 호출)
*   `src/event-handlers.js` -> `src/api-service.js` (`getShortUrl`, `loadMarkdownContent` 호출)
*   `src/event-handlers.js` -> `src/data-managers.js` (`LocalStorageManager` 사용)
*   `src/event-handlers.js` -> `src/default-boss-list.js` (`bossPresets` 사용)
*   `src/event-handlers.js` -> `src/custom-list-manager.js` (`CustomListManager` 사용)
*   `src/event-handlers.js` -> `src/data-managers.js` (`LocalStorageManager.addFixedAlarm`, `LocalStorageManager.updateFixedAlarm`, `LocalStorageManager.deleteFixedAlarm`, `LocalStorageManager.setFixedAlarmState`, `LocalStorageManager.clearLightCalculatorRecords` 호출)
*   `src/event-handlers.js` -> `src/calculator.js` (`calculateBossAppearanceTime` 호출)
*   `src/event-handlers.js` -> `src/boss-scheduler-data.js` (`loadBossLists`, `getGameNames`, `getBossNamesForGame` 호출)
*   `src/event-handlers.js` -> `src/light-calculator.js` (`LightCalculator`, `formatTime` 사용)
*   `src/event-handlers.js` -> `globalTooltip` (툴팁 요소 직접 접근)
*   `src/event-handlers.js` -> **모바일 하단 탭 바 요소들 (`bottomNavDashboard`, `bottomNavBossManagement`, `bottomNavCalculator`, `bottomNavShare`, `moreMenuButton`, `moreMenuCloseButton`, `sidebarBackdrop`)에 대한 이벤트 리스너 설정.**
*   `src/event-handlers.js` -> **`inert` 속성 제어 및 초점 가두기(Focus Trap)를 위한 DOM 요소 (`mainContentArea`, `header`, `footer`) 접근.**
*   `src/boss-parser.js` -> `src/logger.js` (`log` 호출)
*   `src/boss-parser.js` -> `src/data-managers.js` (`BossDataManager` 사용)

*   `src/ui-renderer.js` -> `src/custom-list-manager.js` (`CustomListManager` 사용, 커스텀 목록 데이터 조회용)

*   `src/alarm-scheduler.js` -> `src/logger.js` (`log` 호출)
*   `src/alarm-scheduler.js` -> `src/speech.js` (`speak` 호출)
*   `src/alarm-scheduler.js` -> `src/data-managers.js` (`BossDataManager`, `LocalStorageManager` 사용)
*   `src/alarm-scheduler.js` -> `src/ui-renderer.js` (`renderDashboard` 호출)

*   `src/speech.js` -> `src/data-managers.js` (`LocalStorageManager` 사용)

*   `src/ui-renderer.js` -> `src/data-managers.js` (`BossDataManager`, `LocalStorageManager` 사용, `LocalStorageManager.getFixedAlarms` 호출)
*   `src/ui-renderer.js` -> `src/alarm-scheduler.js` (`getIsAlarmRunning` 호출)
*   `src/ui-renderer.js` -> `src/logger.js` (`log`, `getLogs` 호출)
*   `src/ui-renderer.js` -> `src/default-boss-list.js` (`bossPresets` 사용, `LocalStorageManager.setFixedAlarmState` 호출)
*   `src/ui-renderer.js` -> `src/boss-scheduler-data.js` (`getGameNames`, `getBossNamesForGame` 호출)
*   `src/ui-renderer.js` -> `src/calculator.js` (`calculateBossAppearanceTime` 호출)
*   `src/ui-renderer.js` -> `src/custom-list-manager.js` (`CustomListManager` 사용, 커스텀 목록 데이터 조회용)

*   `src/api-service.js` -> (명시적인 JavaScript 모듈 의존성 없음, 네이티브 `fetch` API 사용)

*   `src/data-managers.js` -> `src/data-managers.js` (`BossDataManager`는 `LocalStorageManager`에서 사용됨)
