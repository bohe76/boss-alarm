# 데이터 흐름 (확장 명세서)

이 문서는 애플리케이션의 모든 주요 화면 및 기능에 대한 상세한 데이터 흐름을 설명합니다. 각 화면은 `event-handlers.js`의 `initApp` 함수가 오케스트레이션하고 `EventBus`를 통해 모듈 간 통신하며, `ui-renderer.js`를 통해 UI를 업데이트합니다.

## 1. 애플리케이션 초기 로드 및 내비게이션 메커니즘

1.  **`index.html` 로드:** 브라우저가 `app.js`를 로드하고, `app.js`는 `event-handlers.js`의 `initApp()` 함수를 호출합니다.
2.  **`event-handlers.js: initApp()` 실행:**
    *   `initDomElements()`를 호출하여 모든 DOM 요소 참조를 `DOM` 객체에 저장합니다.
    *   로거(`initLogger()`), 보스 목록(`loadBossLists()`), 로컬 스토리지(`LocalStorageManager.init()`), 커스텀 목록(`CustomListManager.init()`)과 같은 핵심 서비스를 초기화합니다.
    *   URL 파라미터(`?data=`) 또는 `default-boss-list.js`의 데이터를 파싱하여 `DOM.bossListInput.value`에 설정하고 `parseBossList()`를 통해 `BossDataManager`의 `bossSchedule` 상태를 초기화합니다.
    *   `initEventHandlers(DOM, globalTooltip)`를 호출하여 전역 UI 이벤트 핸들러와 **핵심 화면 모듈(`dashboard`, `calculator`, `notifications` 등)의 이벤트 리스너를 즉시 등록**합니다.
    *   `initGlobalEventListeners(DOM)`를 호출하여 전역 `EventBus` 리스너를 등록합니다.
    *   `EventBus.on('navigate', ...)` 리스너를 등록하여 화면 전환 요청을 중앙에서 처리하도록 합니다.
    *   `showScreen(DOM, 'dashboard-screen')`을 호출하여 초기 화면을 대시보드로 설정합니다.
    *   `EventBus.emit('refresh-dashboard', DOM)`을 발행하여 대시보드 UI를 갱신합니다.
3.  **`event-handlers.js: initEventHandlers()` 실행:**
    *   `DOM.alarmToggleButton`, `DOM.muteToggleButton` 등 전역 UI 요소에 대한 `click` 리스너를 설정합니다.
    *   사이드바 및 하단 내비게이션 링크에 대한 클릭 리스너를 설정합니다. 링크 클릭 시 해당 `data-screen` 속성 값을 `showScreen(DOM, screenId)`으로 전달하여 화면 전환을 요청합니다.
    *   **주요 화면 모듈의 초기화 함수를 호출**하여 각 화면의 이벤트 리스너를 **즉시(eagerly) 등록**합니다.
        *   `initDashboardScreen(DOM)`
        *   `initBossManagementScreen(DOM)`
        *   `initCalculatorScreen(DOM)`
        *   `initBossSchedulerScreen(DOM)`
        *   `initCustomListScreen(DOM)`
        *   `initNotificationSettingsScreen(DOM)`
4.  **`event-handlers.js: showScreen(DOM, screenId)` 실행:**
    *   모든 화면 요소에서 `active` 클래스를 제거하여 화면을 숨깁니다.
    *   지정된 `screenId`에 해당하는 요소에 `active` 클래스를 추가하여 화면을 표시합니다.
    *   모든 내비게이션 링크의 `active` 클래스를 동기화하여 현재 활성화된 화면을 강조합니다.
    *   **특정 화면으로 전환될 때만 필요한 로직을 지연 실행(lazily)합니다:**
        *   `dashboard-screen`: `EventBus.emit('refresh-dashboard', DOM)`를 통해 대시보드 렌더링을 요청합니다.
        *   `share-screen`: `initShareScreen(DOM)`을 호출하여 공유 링크 생성 로직을 실행합니다.
        *   `version-info-screen`: `initVersionInfoScreen(DOM)`을 호출하여 버전 정보를 렌더링합니다.
        *   `help-screen`: `initHelpScreen(DOM)`을 호출하여 도움말 콘텐츠를 로드하고 렌더링합니다.
        *   `calculator-screen`: `handleCalculatorScreenTransition(DOM)`을 호출하여 계산기 화면의 상태를 초기화하고 렌더링합니다.
        *   `alarm-log-screen`: `initAlarmLogScreen(DOM)`을 호출하여 알림 로그를 렌더링합니다.
        *   `boss-scheduler-screen`: `EventBus.emit('show-boss-scheduler-screen')` 이벤트를 발행하여 보스 스케줄러 화면의 렌더링을 트리거합니다.

## 2. 알람 시작 및 주기적 갱신 흐름

1.  **사용자 입력:** 사용자가 '알람 시작' 버튼(`alarmToggleButton`)을 클릭합니다.
2.  **`event-handlers.js` 이벤트 처리:** `initEventHandlers`에 등록된 클릭 리스너가 `alarm-scheduler.js`의 `startAlarm(DOM)` 함수를 호출합니다.
3.  **`alarm-scheduler.js: startAlarm()` 실행:**
    1.  `LocalStorageManager.setAlarmRunningState(true)`를 호출하여 상태를 영구 저장합니다.
    2.  1초 간격의 `setInterval`을 시작합니다. 이 타이머는 매초 다음 두 가지 작업을 수행합니다.
        -   **`checkAlarms()` 호출:** 현재 시간과 `BossDataManager` 및 `LocalStorageManager`의 모든 알람 목록을 비교하여 알람(5분, 1분, 정각)을 트리거할지 결정합니다. 조건 충족 시 `log()`와 `speak()`를 호출합니다. 또한, 가장 가까운 다음 보스 정보를 계산하여 `BossDataManager.setNextBossInfo()`를 통해 상태를 업데이트합니다.
        -   `EventBus.emit('refresh-dashboard', DOM)` 발행:** 대시보드 UI 갱신을 요청합니다.
4.  **`global-event-listeners.js` 이벤트 수신:**
    *   `refresh-dashboard` 이벤트를 수신하여 `ui-renderer.js`의 `renderDashboard(DOM)`를 호출합니다. 이 함수는 `BossDataManager`에서 방금 `checkAlarms()`가 업데이트한 최신 '다음 보스' 정보를 가져와 화면에 표시합니다.

## 3. 화면별 데이터 흐름

### 3.1. 대시보드 화면 (`src/screens/dashboard.js`)

*   **초기화:** `event-handlers.js`의 `initApp` 함수에 의해 `initDashboardScreen(DOM)`이 호출됩니다.
*   **이벤트 리스너:**
    *   **음소거 토글 버튼 (`DOM.muteToggleButton`):** 클릭 시 `LocalStorageManager`의 `muteState`를 토글하고, `ui-renderer.js`의 `updateMuteButtonVisuals()`로 UI를 갱신하며, `log()`를 기록합니다.
    *   **`EventBus` `refresh-dashboard` 이벤트:**
        *   **트리거:** `app.js` 초기 로드, `alarm-scheduler.js` (알람 실행 중 1초마다), `event-handlers.js` (`showScreen` 함수 또는 특정 기능 완료 후) 등 다양한 시점에서 발생합니다.
        *   **흐름:** `ui-renderer.js`의 `renderDashboard(DOM)`를 호출합니다.
*   **렌더링 (`ui-renderer.js`의 `renderDashboard`):**
    *   `BossDataManager`에서 다음 보스 정보 및 예정된 보스 목록을 가져와 `updateNextBossDisplay()` 및 `renderUpcomingBossList()`를 통해 표시합니다.
    *   `alarm-scheduler.js`의 `getIsAlarmRunning()`을 통해 알람 실행 상태를 가져와 `renderAlarmStatusSummary()`로 표시합니다.
    *   `LocalStorageManager.getMuteState()`를 통해 음소거 상태를 가져와 `updateMuteButtonVisuals()`로 음소거 버튼을 갱신합니다.
    *   `logger.js`의 `getLogs()`를 통해 최근 알림 로그를 가져와 `renderRecentAlarmLog()`로 표시합니다.
*   **데이터 흐름 요약:** `refresh-dashboard` 이벤트 발생 시 `renderDashboard`가 호출되어 `BossDataManager`, `LocalStorageManager`, `alarm-scheduler.js`, `logger.js` 등의 최신 정보를 종합하여 대시보드 UI를 구성합니다.

### 3.2. 보스 관리 화면 (`src/screens/boss-management.js`)

*   **초기화:** `event-handlers.js`에 의해 `initBossManagementScreen(DOM)`이 호출됩니다.
*   **이벤트 리스너:**
    *   **"시간순 정렬" 버튼 (`DOM.sortBossListButton`):**
        *   **액션:** 클릭 시 `DOM.bossListInput.value`의 내용을 `boss-parser.js`의 `getSortedBossListText()`로 정렬하고 텍스트 영역을 업데이트합니다.
        *   **흐름:** `boss-parser.js`의 `parseBossList()`를 호출하여 `BossDataManager.bossSchedule` 상태를 갱신하고, `log()`를 기록합니다. (텍스트 영역 업데이트로 인해 `input` 이벤트도 트리거됨)
    *   **보스 목록 텍스트 영역 (`DOM.bossListInput`) `input` 이벤트:**
        *   **액션:** 사용자가 텍스트 영역을 수정.
        *   **흐름:** `boss-parser.js`의 `parseBossList()`를 호출하여 `BossDataManager.bossSchedule` 상태를 갱신하고, `ui-renderer.js`의 `renderDashboard()`를 호출하여 대시보드를 갱신합니다.
*   **데이터 흐름 요약:** `DOM.bossListInput` 텍스트 영역의 내용을 직접 수정하거나 정렬 버튼으로 변경하면, `boss-parser.js` 모듈을 통해 애플리케이션의 중앙 보스 스케줄이 업데이트되고 `renderDashboard`를 통해 대시보드에 즉시 반영됩니다.

### 3.3. 보스 스케줄러 화면 (`src/screens/boss-scheduler.js`)

*   **상태 관리:** `_remainingTimes` 변수에 보스별 남은 시간을 저장하여 화면 재렌더링 시 사용자 입력값을 유지합니다.
*   **초기화:** `event-handlers.js`에 의해 `initBossSchedulerScreen(DOM)`이 호출됩니다.
    *   `EventBus` `show-boss-scheduler-screen` 이벤트 수신 시 `handleShowScreen()` (내부적으로 `ui-renderer.js`의 `renderBossSchedulerScreen()` 호출)을 실행합니다.
*   **이벤트 리스너 (DOM.bossSchedulerScreen에 위임):**
    *   **게임 선택 변경 (`DOM.gameSelect`):** `ui-renderer.js`의 `renderBossInputs()`를 호출하여 선택된 게임에 맞는 보스 입력 필드를 렌더링합니다.
    *   **남은 시간 입력 (`.remaining-time-input`):** `calculator.js`의 `calculateBossAppearanceTime()`로 출현 시간을 계산하고 표시합니다.
    *   **"모든 남은 시간 지우기" 버튼 (`DOM.clearAllRemainingTimesButton`):** 확인 후 모든 입력 필드를 초기화하고 `log()`를 기록합니다.
    *   **"보스 설정 적용" 버튼 (`DOM.moveToBossSettingsButton`):**
        1.  사용자 입력(남은 시간) 및 현재 시간을 기반으로 보스 출현 시간을 계산하여 `bossObjectList`를 생성합니다.
        2.  `specialBossNames`에 해당하는 보스에 대해 12시간 추가 규칙을 적용하고 '침공' 보스를 필터링합니다.
        3.  모든 보스를 `appearanceTime` 기준으로 정렬합니다.
        4.  정렬된 보스 목록을 `HH:MM 보스이름` 형식의 텍스트로 재구성하고 `DOM.bossListInput.value`에 설정합니다.
        5.  `boss-parser.js`의 `parseBossList()`를 호출하여 `BossDataManager.bossSchedule` 상태를 업데이트하고, `ui-renderer.js`의 `renderDashboard()`를 호출하여 대시보드를 갱신합니다.
        6.  현재 화면의 `_remainingTimes`를 갱신합니다.
        7.  `EventBus.emit('navigate', 'boss-management-screen')`을 발행하여 '보스 관리' 화면으로 전환을 요청하고, `log()`를 기록합니다.
*   **렌더링 (`ui-renderer.js`):** `renderBossSchedulerScreen()` 및 `renderBossInputs()`를 통해 게임 목록 및 보스 입력 필드를 동적으로 생성하고, `_remainingTimes`에 따라 입력값을 복원합니다.
*   **데이터 흐름 요약:** 사용자 입력(`remainingTime`)을 바탕으로 보스 출현 시간을 계산하고, "보스 설정 적용" 시 특별 규칙을 거쳐 정렬된 보스 목록이 `DOM.bossListInput` 텍스트 영역에 반영됩니다. 이는 `BossDataManager`의 핵심 스케줄을 업데이트하고 대시보드 등 다른 화면에 영향을 미칩니다.

### 3.4. 알림 로그 화면 (`src/screens/alarm-log.js`)

*   **초기화:** `event-handlers.js`의 `showScreen` 함수에 의해 'alarm-log-screen'으로 내비게이션될 때 `initAlarmLogScreen(DOM)`이 호출됩니다.
*   **렌더링:** `initAlarmLogScreen` 함수는 `logger.js`의 `getLogs()`를 호출하여 애플리케이션 내 모든 로그 메시지를 가져와 `DOM.alarmLogList` 요소에 HTML `<li>` 목록 형태로 표시합니다.
*   **데이터 소스:** `logger.js` (`getLogs()`)
*   **데이터 흐름 요약:** 화면 전환 시 `logger.js`로부터 모든 로그를 가져와 보여주는 단순한 읽기 전용 화면입니다.

### 3.5. 공유 화면 (`src/screens/share.js`)

*   **초기화:** `event-handlers.js`의 `showScreen` 함수에 의해 'share-screen'으로 내비게이션될 때 `initShareScreen(DOM)`이 호출됩니다.
*   **처리 흐름:**
    1.  `DOM.shareMessage`에 "공유 링크 생성 중..." 메시지를 표시합니다.
    2.  `DOM.bossListInput.value` 및 `LocalStorageManager.exportFixedAlarms()`를 통해 현재 보스 목록 및 고정 알림 데이터를 수집합니다.
    3.  수집된 데이터를 `encodeURIComponent()`로 인코딩하고, 현재 페이지 URL과 결합하여 긴 형태의 `longUrl`을 생성합니다.
    4.  `api-service.js`의 `getShortUrl(longUrl)`을 호출하여 TinyURL API를 통해 단축 URL을 요청합니다.
    5.  `navigator.clipboard.writeText()`를 사용하여 생성된 단축 URL(또는 원본 URL)을 클립보드에 복사합니다.
    6.  `DOM.shareMessage`를 업데이트하여 복사 결과를 사용자에게 알리고, `log()`를 기록합니다.
*   **데이터 소스:** `DOM.bossListInput.value`, `LocalStorageManager.exportFixedAlarms()`, `api-service.js` (`getShortUrl()`).
*   **데이터 흐름 요약:** 현재 보스 목록과 고정 알림 데이터를 URL 파라미터로 인코딩한 후 TinyURL API를 통해 단축 URL을 생성하여 클립보드에 복사하고, 결과를 사용자에게 알립니다.

### 3.6. 버전 정보 화면 (`src/screens/version-info.js`)

*   **초기화:** `event-handlers.js`의 `showScreen` 함수에 의해 'version-info-screen'으로 내비게이션될 때 `initVersionInfoScreen(DOM)`이 호출됩니다.
*   **렌더링:** `initVersionInfoScreen`은 `ui-renderer.js`의 `renderVersionInfo(DOM)`를 직접 호출합니다.
    *   `renderVersionInfo()`는 `api-service.js`의 `loadJsonContent(\`docs/version_history.json?v=${window.APP_VERSION}\`)`를 통해 `version_history.json` 파일을 비동기적으로 로드합니다.
    *   로드된 JSON 데이터를 파싱하여 각 버전에 대한 변경 내역을 포함하는 확장 가능한 HTML 구조로 변환하고 `DOM.versionHistoryContent`에 삽입합니다.
*   **데이터 소스:** `docs/version_history.json`, `api-service.js` (`loadJsonContent()`).
*   **데이터 흐름 요약:** 화면 전환 시 `api-service.js`를 통해 `version_history.json` 파일에서 버전 기록 데이터를 로드하여 `DOM.versionHistoryContent`에 표시합니다.

### 3.7. 도움말 화면 (`src/screens/help.js`)

*   **초기화:** `event-handlers.js`의 `showScreen` 함수에 의해 'help-screen'으로 내비게이션될 때 `initHelpScreen(DOM)`이 호출됩니다.
*   **처리 흐름:**
    1.  `api-service.js`의 `loadJsonContent(\`docs/feature_guide.json?v=${window.APP_VERSION}\`)`를 호출하여 `feature_guide.json` 파일에서 도움말 콘텐츠를 비동기적으로 로드합니다.
    2.  로드된 JSON 데이터를 파싱하여 섹션 및 하위 섹션으로 구성된 확장 가능한 HTML 구조로 변환하고 `DOM.featureGuideContent`에 삽입합니다.
    3.  콘텐츠 로드 실패 시 적절한 메시지를 표시합니다.
*   **데이터 소스:** `docs/feature_guide.json`, `api-service.js` (`loadJsonContent()`).
*   **데이터 흐름 요약:** 화면 전환 시 `api-service.js`를 통해 `feature_guide.json` 파일에서 도움말 콘텐츠를 로드하여 `DOM.featureGuideContent`에 표시합니다.

### 3.8. 개인 보스 목록 화면 (`src/screens/custom-list.js`)

*   **초기화:** `app.js`에 의해 `initCustomListScreen(DOM)`이 호출됩니다. (직접 내비게이션되는 화면이 아님)
*   **모달 관리:**
    *   **"커스텀 목록 관리" 버튼 (`DOM.manageCustomListsButton`):** 클릭 시 모달 (`DOM.customBossListModal`)을 표시하고 "목록 추가" 탭으로 전환하며, `DOM.customListNameInput`에 포커스를 줍니다.
    *   **모달 닫기:** 닫기 버튼, 모달 외부 클릭, Esc 키 등으로 모달을 숨깁니다.
*   **탭 전환:**
    *   **"목록 추가" 탭 (`DOM.tabAddCustomList`):** 클릭 시 `ui-renderer.js`의 `showCustomListTab(DOM, 'add')` 호출.
    *   **"목록 관리" 탭 (`DOM.tabManageCustomLists`):** 클릭 시 `ui-renderer.js`의 `showCustomListTab(DOM, 'manage')` 호출. 이때 `renderCustomListManagementModalContent()`가 호출되어 목록을 갱신합니다.
*   **목록 추가/수정/삭제:**
    *   **"저장" 버튼 (`DOM.saveCustomListButton`):**
        1.  입력된 `listName`과 `listContent`를 가져옵니다.
        2.  `CustomListManager`를 통해 새 목록 추가, 기존 목록 이름 변경, 기존 목록 콘텐츠 업데이트 로직을 수행합니다. (중복 이름 확인 및 덮어쓰기 로직 포함)
        3.  성공 시 `ui-renderer.js`의 `showToast()`로 메시지 표시, `renderCustomListManagementModalContent()` 호출하여 목록 갱신.
        4.  `EventBus.emit('rerender-boss-scheduler')`를 발행하여 보스 스케줄러 화면의 드롭다운을 갱신합니다.
        5.  수정 시 "목록 관리" 탭으로 전환, 추가 시 모달 닫기. 실패 시 `alert()` 표시.
    *   **관리 목록 내 "삭제" 버튼:** `CustomListManager.deleteCustomList()` 호출, `showToast()` 및 `renderCustomListManagementModalContent()`로 UI 갱신, `EventBus.emit('rerender-boss-scheduler')` 발행.
    *   **관리 목록 내 "수정" 버튼:** 해당 목록의 이름과 내용을 가져와 "목록 추가" 탭의 입력 필드에 채우고, "수정" 모드로 전환합니다.
*   **데이터 소스:** `CustomListManager` (로컬 스토리지 기반), `DOM.customListNameInput`, `DOM.customListContentTextarea`.
*   **데이터 흐름 요약:** 모달을 통해 커스텀 보스 목록을 추가/수정/삭제합니다. 모든 변경사항은 `CustomListManager`를 통해 로컬 스토리지에 저장되며, `renderCustomListManagementModalContent()`와 `EventBus.emit('rerender-boss-scheduler')`를 통해 관련 UI가 갱신됩니다.

### 3.9. 보탐 계산기 화면 (`src/screens/calculator.js`)

*   **초기화:**
    *   `initCalculatorScreen(DOM)`은 `event-handlers.js`에 의해 호출되어 모든 이벤트 리스너를 설정합니다.
    *   `event-handlers.js`의 `showScreen` 함수에 의해 'calculator-screen'으로 내비게이션될 때 `handleCalculatorScreenTransition(DOM)`이 호출되어 계산기 UI 및 `LightCalculator` 상태를 초기화하고 렌더링합니다.
*   **젠 계산기:**
    *   **남은 시간 입력 (`DOM.remainingTimeInput`):** `calculator.js`의 `calculateBossAppearanceTime()`로 출현 시간 계산 및 `DOM.bossAppearanceTimeDisplay`에 표시.
    *   **보스 선택 드롭다운 (`DOM.bossSelectionDropdown`):** 선택 시 "업데이트" 버튼 활성화 상태 확인.
    *   **"업데이트" 버튼 (`DOM.updateBossTimeButton`):**
        1.  선택된 보스의 ID 및 계산된 새 시간으로 새 `scheduledDate`를 구성합니다.
        2.  `BossDataManager.getBossSchedule()`을 통해 현재 보스 스케줄을 가져와 `time`과 `scheduledDate`를 업데이트합니다.
        3.  `BossDataManager.setBossSchedule()`로 스케줄 업데이트.
        4.  `ui-renderer.js`의 `updateBossListTextarea()`로 `DOM.bossListInput.value`를 갱신하고, `boss-parser.js`의 `getSortedBossListText()` 및 `parseBossList()`를 통해 애플리케이션 상태를 동기화합니다.
        5.  `ui-renderer.js`의 `renderDashboard()`를 호출하여 대시보드를 갱신하고, `showToast()`로 결과 메시지 표시.
        6.  젠 계산기 UI를 초기화하고, `ui-renderer.js`의 `populateBossSelectionDropdown()`으로 드롭다운을 다시 채웁니다.
*   **광 계산기:**
    *   **"시작" 버튼 (`DOM.lightStartButton`):** `LightCalculator.startStopwatch()` 호출, `ui-renderer.js`의 `updateLightStopwatchDisplay()`로 실시간 업데이트, 버튼 상태 변경.
    *   **"광" 버튼 (`DOM.lightGwangButton`):** `LightCalculator.triggerGwang()` 호출, `ui-renderer.js`의 `updateLightExpectedTimeDisplay()`로 예상 시간 표시, 버튼 비활성화.
    *   **"캡처" 버튼 (`DOM.lightCaptureButton`):**
        1.  `LightCalculator.stopStopwatch()` 호출.
        2.  확인 후 보스 이름을 입력받아 `LightCalculator.saveLightCalculation()`으로 기록 저장.
        3.  `ui-renderer.js`의 `renderLightSavedList()`로 저장된 기록 표시, `renderLightTempResults()`로 최근 계산 결과 표시.
        4.  `LightCalculator.resetCalculator()`로 상태 초기화, 버튼 상태 초기화, 디스플레이 초기화.
    *   **"목록" 버튼 (`DOM.lightListButton`):** `ui-renderer.js`의 `renderLightSavedList()` 호출.
    *   **"기록 초기화" 버튼 (`#clearLightRecordsButton`):** 확인 후 `LocalStorageManager.clearLightCalculatorRecords()` 호출, `renderLightSavedList()`로 UI 갱신, `log()` 기록.
*   **데이터 소스:** `BossDataManager`, `DOM.bossListInput.value`, `calculator.js`, `LightCalculator` 모듈 (내부 상태 및 로컬 스토리지 연동), `LocalStorageManager`.
*   **데이터 흐름 요약:** "젠 계산기"는 사용자 입력 및 `BossDataManager`를 통해 보스 시간을 업데이트하고, "광 계산기"는 `LightCalculator` 모듈을 통해 스톱워치 기반의 시간 측정을 수행하고 로컬 스토리지에 기록합니다. 두 기능 모두 `ui-renderer.js`를 통해 UI를 갱신하고 `showToast` 등으로 사용자에게 피드백을 제공합니다.

### 3.10. 알림 설정 화면 (`src/screens/notifications.js`)

*   **초기화:** `event-handlers.js`의 `initEventHandlers`에 의해 `initNotificationSettingsScreen(DOM)`이 호출되어 이벤트 리스너가 설정됩니다. 화면이 표시될 때 `ui-renderer.js`의 `renderFixedAlarms(DOM)`가 호출되어 최신 목록을 그립니다.
*   **이벤트 리스너 (`DOM.fixedAlarmListDiv`에 위임):**
    *   **알림 추가:** `renderFixedAlarms`에 의해 동적으로 생성된 '추가' 버튼에 연결된 이벤트 리스너가 동작합니다.
        1.  사용자가 입력한 시간과 이름(`newFixedAlarmTimeInput`, `newFixedAlarmNameInput`)을 가져옵니다.
        2.  시간 형식을 정규화(`normalizeTimeFormat()`)하고 유효성을 검사(`validateFixedAlarmTime()`)합니다.
        3.  유효한 입력이면 새 고정 알림 객체를 생성하고 `LocalStorageManager.addFixedAlarm()`을 호출하여 로컬 스토리지에 저장합니다.
        4.  `ui-renderer.js`의 `showToast()`로 성공 메시지를 표시하고 `renderFixedAlarms()`를 호출하여 목록을 다시 렌더링합니다.
        5.  입력 필드를 초기화하고 `log()`를 기록합니다.
    *   `DOM.fixedAlarmListDiv` (이벤트 위임):
        *   **개별 토글 변경 (`.switch input[type="checkbox"]`):** `data-id`에서 `alarmId`를 가져와 `LocalStorageManager.updateFixedAlarm()`으로 `enabled` 상태를 토글하고, `ui-renderer.js`의 `updateFixedAlarmVisuals()`로 UI를 갱신합니다.
        *   **편집 버튼 (`.edit-fixed-alarm-button`):** `data-id`에서 `alarmId`를 가져와 `LocalStorageManager.getFixedAlarms()`에서 해당 알림을 찾습니다. `prompt()`를 통해 새 시간과 이름을 입력받고 유효성을 검사한 후 `LocalStorageManager.updateFixedAlarm()`으로 업데이트하고, `renderFixedAlarms()`로 UI 갱신 후 `log()`를 기록합니다.
        *   **삭제 버튼 (`.delete-fixed-alarm-button`):** `data-id`에서 `alarmId`를 가져와 `confirm()`으로 확인 후 `LocalStorageManager.deleteFixedAlarm()`으로 삭제하고, `renderFixedAlarms()`로 UI 갱신 후 `log()`를 기록합니다.
*   **데이터 소스:** `LocalStorageManager` (고정 알림 저장 및 관리).
*   **데이터 흐름 요약:** 고정 알림은 `LocalStorageManager`를 통해 추가, 편집, 삭제, 활성화/비활성화 상태 토글이 가능합니다. 모든 변경사항은 로컬 스토리지에 즉시 반영되며, `ui-renderer.js`의 헬퍼 함수들을 통해 UI가 갱신됩니다.
