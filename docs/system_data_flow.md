# 데이터 흐름 (v2.0 - 리팩토링 후)

이 문서는 '보스 알리미' 애플리케이션의 주요 화면 및 기능에 대한 상세한 데이터 흐름을 설명합니다. 애플리케이션의 모든 동작은 `app.js`가 오케스트레이션하며, 모듈 간 통신은 주로 `EventBus` 및 데이터 관리자(`BossDataManager`, `LocalStorageManager`)의 구독 패턴을 통해 이루어지고, `ui-renderer.js`를 통해 UI가 업데이트됩니다.

## 1. 애플리케이션 초기 로드 및 내비게이션 메커니즘

1.  **`index.html` 로드:** 브라우저가 `app.js`를 로드하고, `app.js`의 `initApp()` 함수가 실행됩니다.
2.  **`app.js: initApp()` 실행 (async):**
    *   `initDomElements()`를 호출하여 모든 DOM 요소 참조를 `DOM` 객체에 수집합니다.
    *   `initializeCoreServices(DOM)`를 `await`하여 로거, 데이터 관리자(LocalStorageManager, CustomListManager), 보스 데이터 로딩(data/boss_lists.json)과 같은 핵심 서비스를 초기화합니다.
    *   `registerAllRoutes()`를 호출하여 `src/screens/*.js`의 모든 화면 모듈을 `src/router.js`에 등록합니다.
    *   `loadInitialData(DOM)`를 호출하여 URL 파라미터 또는 `default-boss-list.js`의 데이터를 파싱하고 `DOM.bossListInput.value`에 설정한 후 `parseBossList()`를 통해 `BossDataManager`의 `bossSchedule` 상태를 초기화합니다.
    *   `BossDataManager.subscribe(() => renderDashboard(DOM))`를 등록하여 `BossDataManager`의 데이터 변경 시 대시보드 UI가 반응적으로 갱신되도록 합니다.
    *   `initEventHandlers(DOM, globalTooltip)`를 호출하여 전역 UI 이벤트 핸들러(알람 토글, 사이드바, 내비게이션 링크 등)를 등록합니다.
    *   `initGlobalEventListeners(DOM)`를 호출하여 전역 `EventBus` 리스너(예: 로그 업데이트 시 알림 로그 화면 갱신)를 등록합니다.
    *   `showScreen(DOM, 'dashboard-screen')`을 호출하여 대시보드 화면을 초기 화면으로 설정하고 즉시 렌더링하며, 1초마다 주기적으로 갱신되도록 `setInterval`을 설정합니다.
    *   `EventBus.on('navigate', (screenId) => showScreen(DOM, screenId))` 리스너를 등록하여 다른 모듈에서 화면 전환을 요청할 수 있도록 합니다.
3.  **`app.js: showScreen(DOM, screenId)` 실행:**
    *   모든 화면 요소에서 `active` 클래스를 제거하고, 지정된 `screenId`에 해당하는 요소에 `active` 클래스를 추가하여 화면을 표시합니다.
    *   내비게이션 링크의 `active` 상태를 동기화합니다.
    *   `src/router.js`를 통해 해당 화면 모듈을 가져와 `screen.init(DOM)` (최초 방문 시) 또는 `screen.onTransition(DOM)` (화면 전환 시)을 호출하여 화면별 로직을 초기화/실행합니다.
    *   대시보드 화면으로 전환 시 `renderDashboard(DOM)`를 즉시 호출하고 `setInterval`을 설정하여 1초마다 갱신합니다. 다른 화면으로 전환 시 `setInterval`을 해제합니다.
    *   `share-screen`, `version-info-screen`, `help-screen` 등의 화면은 `onTransition` 시 `api-service.js`를 통해 데이터를 비동기적으로 로드하고 `ui-renderer.js`를 통해 렌더링합니다.

## 2. 알람 시작 및 주기적 갱신 흐름

1.  **사용자 입력:** 사용자가 '알람 시작' 버튼(`DOM.alarmToggleButton`)을 클릭합니다.
2.  **`app.js: initEventHandlers` 이벤트 처리:** `DOM.alarmToggleButton`에 등록된 클릭 리스너가 `alarm-scheduler.js`의 `startAlarm(DOM)` 함수를 호출합니다.
3.  **`alarm-scheduler.js: startAlarm()` 실행:**
    *   `LocalStorageManager.setAlarmRunningState(true)`를 호출하여 알람 실행 상태를 `localStorage`에 저장합니다.
    *   `logger.js`와 `speech.js`를 통해 "알림 시스템 시작" 메시지를 로깅하고 음성으로 출력합니다.
    *   `alertTimerId`에 1초 간격의 `setInterval`을 설정하여 `checkAlarms()` 함수를 주기적으로 호출합니다.
    *   `checkAlarms()`를 즉시 한 번 호출하여 초기 알람 상태를 확인합니다.
    *   `renderAlarmStatusSummary(DOM)`를 호출하여 대시보드의 알람 상태 UI를 갱신합니다.
4.  **`alarm-scheduler.js: checkAlarms()` 실행 (매초):**
    *   현재 시간 기준으로 5분 후, 1분 후, 현재 시간을 계산합니다.
    *   자정(00:00)이 되면 모든 보스의 `alerted` 상태를 초기화하여 매일 알람이 반복되도록 준비합니다.
    *   `BossDataManager.getBossSchedule()`의 동적 보스와 `LocalStorageManager.getFixedAlarms()`의 활성화된 고정 알람을 결합하여 `allAlarms` 목록을 생성합니다.
    *   각 알람에 대해 `scheduledDate`를 계산하고, 오늘 이미 지난 알람은 다음 날로 자동 조정합니다.
    *   `allAlarms`를 `scheduledDate` 기준으로 정렬합니다.
    *   정렬된 `allAlarms`를 순회하며 각 보스에 대해 5분 전, 1분 전, 정각 알림 조건이 충족되었는지 확인합니다.
        *   조건 충족 시 해당 보스의 `alerted_Xmin` 플래그를 `true`로 설정하고, `logger.js`와 `speech.js`를 통해 알림 메시지를 로깅 및 음성 출력합니다.
        *   고정 알람의 경우 `LocalStorageManager.updateFixedAlarm()`을 통해 `localStorage`에 변경 사항을 반영합니다.
        *   동적 보스가 정각 알림되면 `BossDataManager.setBossSchedule()` 호출 시 목록에서 제거될 대상으로 표시합니다.
    *   제거 대상 동적 보스를 `BossDataManager.getBossSchedule()`에서 제거한 후 `BossDataManager.setBossSchedule()`을 호출하여 스케줄을 업데이트합니다.
    *   `allAlarms`에서 현재 시간 이후의 보스를 필터링하여 가장 가까운 `nextBoss`와 `minTimeDiff`를 결정합니다.
    *   `BossDataManager.setNextBossInfo(nextBoss, minTimeDiff)`를 호출하여 다음 보스 정보를 업데이트합니다. **이 호출은 `BossDataManager.subscribe`에 등록된 콜백(`renderDashboard(DOM)`)을 트리거하여 대시보드 UI를 반응적으로 갱신합니다.**
5.  **`app.js: dashboardRefreshInterval` 및 `BossDataManager.subscribe`:**
    *   `app.js`의 `showScreen` 함수에 의해 설정된 `setInterval`은 1초마다 `ui-renderer.js`의 `renderDashboard(DOM)`를 호출하여 '다음 보스', '다가오는 보스' 카운트다운 등을 주기적으로 갱신합니다.
    *   `app.js`의 `initApp` 함수에서 `BossDataManager.subscribe(() => renderDashboard(DOM))`를 통해, `checkAlarms()`에서 `BossDataManager.setNextBossInfo()` 또는 `BossDataManager.setBossSchedule()` 호출 시 대시보드가 즉시 갱신됩니다. 이는 `setInterval` 갱신과 더불어 데이터 변경에 대한 반응성을 제공합니다.

## 3. 화면별 데이터 흐름 상세

### 3.1. 대시보드 화면 (`src/screens/dashboard.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 `initDashboardScreen(DOM)`이 호출됩니다. `global-event-listeners.js`에 등록된 `BossDataManager.subscribe`와 `setInterval`에 의해 `ui-renderer.js`의 `renderDashboard(DOM)`가 주기적으로 호출되어 최신 상태를 반영합니다.
*   **이벤트 리스너:**
    *   **음소거 토글 버튼 (`DOM.muteToggleButton`):** 클릭 시 `LocalStorageManager.setMuteState()`를 호출하여 음소거 상태를 토글하고, `ui-renderer.js`의 `updateMuteButtonVisuals()`로 UI를 갱신하며, `log()`를 기록합니다.
*   **렌더링:** `ui-renderer.js`의 `renderDashboard(DOM)` 함수가 호출되면, `BossDataManager`에서 다음 보스 정보 및 예정된 보스 목록을 가져와 `updateNextBossDisplay()` 및 `renderUpcomingBossList()`를 통해 표시하고, `LocalStorageManager` 및 `alarm-scheduler.js`에서 알람 상태 및 음소거 상태를 가져와 `renderAlarmStatusSummary()` 및 `updateMuteButtonVisuals()`로 표시합니다. `renderRecentAlarmLog(DOM)`는 `logger.js`의 `log-updated` 이벤트에 반응하여 갱신됩니다.
*   **데이터 흐름 요약:** 대시보드는 `BossDataManager`의 구독 및 1초 `setInterval`을 통해 보스 데이터 및 타이머를 갱신하고, `logger.js`의 `log-updated` 이벤트에 반응하여 최근 알림 로그를 갱신하는 복합적인 반응형/주기적 갱신 메커니즘을 가집니다.

### 3.2. 보스 관리 화면 (`src/screens/boss-management.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 `initBossManagementScreen(DOM)`이 호출됩니다.
*   **이벤트 리스너:**
    *   **"시간순 정렬" 버튼 (`DOM.sortBossListButton`):** 클릭 시 `DOM.bossListInput.value`의 내용을 `boss-parser.js`의 `getSortedBossListText()`로 정렬하고 `DOM.bossListInput.value`를 업데이트합니다. 이후 `DOM.bossListInput`의 `input` 이벤트가 트리거되어 `parseBossList()` 및 `renderDashboard()`를 호출합니다.
    *   **보스 목록 텍스트 영역 (`DOM.bossListInput`) `input` 이벤트:** 사용자가 텍스트 영역을 수정하면 `boss-parser.js`의 `parseBossList()`를 호출하여 `BossDataManager.bossSchedule` 상태를 갱신합니다. `BossDataManager`의 변경은 대시보드를 반응적으로 갱신합니다.
*   **데이터 흐름 요약:** `DOM.bossListInput` 텍스트 영역의 내용을 직접 수정하거나 정렬 버튼으로 변경하면, `boss-parser.js` 모듈을 통해 애플리케이션의 중앙 보스 스케줄(`BossDataManager`)이 업데이트되고, 이는 대시보드 등 구독하는 다른 화면에 즉시 반영됩니다.

### 3.3. 보스 스케줄러 화면 (`src/screens/boss-scheduler.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 `initBossSchedulerScreen(DOM)`이 호출됩니다. `EventBus.on('show-boss-scheduler-screen', ...)` 리스너가 화면 전환 시 `ui-renderer.js`의 `renderBossSchedulerScreen()`을 호출합니다.
*   **이벤트 리스너 (DOM.bossSchedulerScreen에 위임):**
    *   **게임 선택 변경 (`DOM.gameSelect`):** `ui-renderer.js`의 `renderBossInputs()`를 호출하여 선택된 게임에 맞는 보스 입력 필드를 렌더링합니다.
    *   **남은 시간 입력 (`.remaining-time-input`):** `calculator.js`의 `calculateBossAppearanceTime()`로 출현 시간을 계산하여 표시합니다.
    *   **"모든 남은 시간 지우기" 버튼 (`DOM.clearAllRemainingTimesButton`):** 모든 입력 필드를 초기화합니다.
    *   **"보스 설정 적용" 버튼 (`DOM.moveToBossSettingsButton`):**
        1.  입력된 남은 시간을 바탕으로 보스 출현 시간을 계산하고, 특수 보스 규칙(12시간 추가 등) 및 필터링(`침공` 보스)을 적용합니다.
        2.  결과를 `DOM.bossListInput.value`에 설정한 후 `boss-parser.js`의 `parseBossList()`를 호출하여 `BossDataManager.bossSchedule` 상태를 업데이트합니다. (`BossDataManager` 변경은 대시보드 갱신을 트리거).
        3.  `EventBus.emit('navigate', 'boss-management-screen')`을 발행하여 '보스 관리' 화면으로 전환을 요청합니다.
*   **데이터 흐름 요약:** 사용자 입력(`remainingTime`)을 바탕으로 보스 출현 시간을 계산하고, 복잡한 규칙을 거쳐 정렬된 보스 목록 텍스트를 생성합니다. 이 텍스트는 `DOM.bossListInput`에 반영되어 `BossDataManager`의 핵심 스케줄을 업데이트하고 대시보드 및 '보스 관리' 화면 전환에 영향을 미칩니다.

### 3.4. 알림 로그 화면 (`src/screens/alarm-log.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 'alarm-log-screen'으로 내비게이션될 때 `initAlarmLogScreen(DOM)`이 호출됩니다.
*   **렌더링:** `initAlarmLogScreen` 함수는 `logger.js`의 `getLogs()`를 호출하여 애플리케이션 내 모든 로그 메시지를 가져와 `DOM.logContainer` 요소에 HTML `<li>` 목록 형태로 표시합니다. `global-event-listeners.js`에 등록된 `EventBus.on('log-updated', ...)` 리스너에 의해 새로운 로그 발생 시 `DOM.logContainer`가 갱신됩니다.
*   **데이터 흐름 요약:** `logger.js`로부터 모든 로그를 가져와 보여주는 화면이며, 새로운 로그 발생 시에만 이벤트 기반으로 갱신됩니다.

### 3.5. 공유 화면 (`src/screens/share.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 'share-screen'으로 내비게이션될 때 `initShareScreen(DOM)`이 호출됩니다.
*   **처리 흐름:** `DOM.bossListInput.value` 및 `LocalStorageManager.exportFixedAlarms()`를 통해 현재 보스 목록 및 고정 알림 데이터를 수집하고, 이를 URL 파라미터로 인코딩합니다. `api-service.js`의 `getShortUrl()`을 통해 단축 URL을 생성하고 클립보드에 복사한 후, `DOM.shareMessage`에 결과를 표시합니다.
*   **데이터 흐름 요약:** 현재 보스 목록과 고정 알림 데이터를 URL 파라미터로 인코딩한 후 TinyURL API를 통해 단축 URL을 생성하여 클립보드에 복사하고, 결과를 사용자에게 알립니다.

### 3.6. 버전 정보 화면 (`src/screens/version-info.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 'version-info-screen'으로 내비게이션될 때 `initVersionInfoScreen(DOM)`이 호출됩니다.
*   **처리 흐름:** `api-service.js`의 `loadJsonContent()`를 통해 `docs/version_history.json` 파일에서 버전 기록 데이터를 로드하고, `ui-renderer.js`의 `renderVersionInfo()`를 호출하여 `DOM.versionHistoryContent`에 표시합니다.
*   **데이터 흐름 요약:** 화면 전환 시 `api-service.js`를 통해 `version_history.json` 파일에서 버전 기록 데이터를 로드하여 `DOM.versionHistoryContent`에 표시합니다.

### 3.7. 도움말 화면 (`src/screens/help.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 'help-screen'으로 내비게이션될 때 `initHelpScreen(DOM)`이 호출됩니다.
*   **처리 흐름:** `api-service.js`의 `loadJsonContent()`를 통해 `docs/feature_guide.json` 파일에서 도움말 콘텐츠를 비동기적으로 로드하고, `ui-renderer.js`의 `renderHelpScreen()`를 호출하여 `DOM.featureGuideContent`에 표시합니다.
*   **데이터 흐름 요약:** 화면 전환 시 `api-service.js`를 통해 `feature_guide.json` 파일에서 도움말 콘텐츠를 로드하여 `DOM.featureGuideContent`에 표시합니다.

### 3.8. 개인 보스 목록 화면 (`src/screens/custom-list.js`)

*   **초기화:** `app.js`에 의해 `initCustomListScreen(DOM)`이 호출됩니다. (이 화면은 직접 내비게이션되는 화면이 아니며, '보스 스케줄러' 화면에서 모달 형태로 열립니다.)
*   **처리 흐름:** '커스텀 목록 관리' 모달의 이벤트 리스너를 등록합니다. 모달 내에서 목록 추가/수정/삭제 작업을 `CustomListManager`를 통해 수행하고, 변경 시 `EventBus.emit('rerender-boss-scheduler')`를 발행하여 '보스 스케줄러' 화면의 드롭다운을 갱신합니다.
*   **데이터 흐름 요약:** 모달을 통해 커스텀 보스 목록을 추가/수정/삭제하고, 모든 변경사항은 `CustomListManager`를 통해 로컬 스토리지에 저장되며, 관련 UI가 갱신됩니다.

### 3.9. 보탐 계산기 화면 (`src/screens/calculator.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 'calculator-screen'으로 내비게이션될 때 `handleCalculatorScreenTransition(DOM)`이 호출되어 계산기 UI 및 `LightCalculator` 상태를 초기화하고 렌더링합니다.
*   **처리 흐름 (젠 계산기):** 남은 시간 입력 시 `calculator.js`를 통해 보스 출현 시간을 계산하고, "업데이트" 버튼 클릭 시 `BossDataManager`를 통해 보스 시간을 업데이트합니다. 이는 `BossDataManager`의 변경을 통해 대시보드를 갱신합니다.
*   **처리 흐름 (광 계산기):** "시작", "광", "캡처" 버튼 클릭을 통해 `LightCalculator` 모듈이 스톱워치를 제어하고, `LocalStorageManager`를 통해 기록을 저장합니다.
*   **데이터 흐름 요약:** "젠 계산기"는 사용자 입력 및 `BossDataManager`를 통해 보스 시간을 업데이트하고, "광 계산기"는 `LightCalculator` 모듈을 통해 스톱워치 기반의 시간 측정을 수행하고 로컬 스토리지에 기록합니다.

### 3.10. 알림 설정 화면 (`src/screens/notifications.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 'notification-settings-screen'으로 내비게이션될 때 `initNotificationSettingsScreen(DOM)`이 호출되어 고정 알림 목록 관리 이벤트 리스너가 설정됩니다.
*   **처리 흐름:** 고정 알림은 `LocalStorageManager`를 통해 추가, 편집, 삭제, 활성화/비활성화 상태 토글이 가능합니다. 모든 변경사항은 로컬 스토리지에 즉시 반영되며, `ui-renderer.js`의 헬퍼 함수들을 통해 UI가 갱신됩니다.
*   **데이터 흐름 요약:** 고정 알림은 `LocalStorageManager`를 통해 CRUD 및 상태 토글이 가능하며, `ui-renderer.js`를 통해 UI가 갱신됩니다.
