## 5. 데이터 흐름

애플리케이션의 주요 데이터 흐름은 다음과 같습니다.

1.  **초기 로드 (`index.html` -> `event-handlers.js:initApp`)**:
    *   `initApp`은 `dom-elements.js:initDomElements()`를 호출하여 `DOM` 객체를 가져옵니다。
    *   `initApp`은 `globalTooltip` 요소를 초기화합니다。
    *   `initApp`은 `logger.js:initLogger(DOM.logContainer)`를 호출합니다。
    *   `initApp`은 `src/boss-scheduler-data.js:loadBossLists()`를 호출하여 게임별 보스 목록 데이터를 로드합니다。
    *   `initApp`은 `data-managers.js:LocalStorageManager.init()`를 호출하여 영구 상태(고정 알람, 로그 가시성, 알람 실행, 사이드바 확장)를 로드합니다。
    *   `initApp`은 URL 매개변수에서 `data`를 확인합니다. 존재하면 디코딩하여 `DOM.bossListInput.value`를 설정합니다. 그렇지 않으면 `default-boss-list.js:bossPresets[0].list`를 사용합니다。
    *   `initApp`은 URL 매개변수에서 `fixedData`를 확인합니다. 존재하면 `LocalStorageManager.importFixedAlarms()`를 호출하여 고정 알림을 로드합니다。
    *   `initApp`은 `boss-parser.js:parseBossList(DOM.bossListInput)`를 호출하여 보스 목록을 파싱하고, 이는 `data-managers.js:BossDataManager.setBossSchedule()`를 호출합니다。
    *   `initApp`은 `LocalStorageManager`를 기반으로 초기 UI 상태를 설정합니다(예: `DOM.logVisibilityToggle.checked`, `DOM.sidebar.classList`)。
    *   **`initApp`은 뷰포트 너비를 감지하는 `ResizeObserver`를 초기화하고 `body`에 `is-mobile-view` 클래스를 동적으로 토글하는 로직을 추가합니다.**
    *   `initApp`은 초기 UI 렌더링을 위해 `ui-renderer.js:renderFixedAlarms()`, `ui-renderer.js:renderDashboard()`를 호출합니다。
    *   `initApp`은 모든 이벤트 리스너를 설정하기 위해 `event-handlers.js:initEventHandlers(DOM, globalTooltip)`를 호출합니다。
    *   `alarm-scheduler.js:getIsAlarmRunning()`이 true이면 `initApp`은 `alarm-scheduler.js:startAlarm(DOM)`를 호출합니다。

2.  **사용자 상호 작용 (`event-handlers.js`의 메뉴 클릭 및 기타)**:
    *   **내비게이션 링크 클릭 (사이드바 또는 하단 탭 바):**
        *   사용자가 탐색 링크(예: `nav-dashboard` 또는 `bottom-nav-dashboard`)를 클릭합니다.
        *   `event-handlers.js`의 클릭 리스너는 `showScreen(DOM, screenId)`를 호출합니다。
        *   `showScreen` 함수는 화면 요소의 `classList`를 조작하여 표시/숨김을 처리하고, **클릭된 링크(`event.currentTarget`) 및 해당하는 모든 내비게이션 링크(사이드바/하단 탭 바)에 `active` 클래스를 추가/제거하여 활성 상태를 동기화합니다.**
        *   'dashboard-screen'의 경우 `showScreen`은 `ui-renderer.js:renderDashboard(DOM)`를 호출합니다。
        *   'boss-management-screen'의 경우 `showScreen`은 `ui-renderer.js:updateBossListTextarea()`를 호출합니다。
        *   'notification-settings-screen'의 경우 `showScreen`은 `ui-renderer.js:renderFixedAlarms()`를 호출합니다。
        *   'alarm-log-screen'의 경우 `showScreen`은 `ui-renderer.js:updateLogDisplay()`를 호출합니다。
        *   'calculator-screen'의 경우 `showScreen`은 `ui-renderer.js:renderCalculatorScreen()`를 호출합니다。
        *   **'share-screen'의 경우 `showScreen`은 공유 링크 생성 로직(URL 인코딩, TinyURL API 호출, 클립보드 복사 등)을 실행하고 `DOM.shareMessage`를 업데이트합니다.**
    *   'calculator-screen' (젠 계산기)에서 `DOM.remainingTimeInput`의 `input` 이벤트 발생 시 `src/event-handlers.js`는 `src/calculator.js:calculateBossAppearanceTime()`를 호출하고 `DOM.bossAppearanceTimeDisplay`를 업데이트합니다。
    *   **젠 계산기 상호 작용 추가:** 사용자가 젠 계산기에서 보스를 선택하고 시간을 입력한 후 '보스 시간 업데이트' 버튼을 클릭하면, `event-handlers.js`의 리스너가 이를 감지하여 `DOM.bossListInput.value`를 업데이트하고 `boss-parser.js`를 통해 스케줄을 재파싱합니다。 `ui-renderer.js`의 `showToast`를 통해 업데이트 결과를 시각적으로 알리고, UI를 초기화합니다。
    *   'calculator-screen' (광 계산기)에서:
        - '시작' 버튼 클릭 시 `src/event-handlers.js`는 `src/light-calculator.js:LightCalculator.startStopwatch()`를 호출하고 `ui-renderer.js:updateLightStopwatchDisplay()`를 통해 UI를 업데이트합니다。
        - '광' 버튼 클릭 시 `src/event-handlers.js`는 `src/light-calculator.js:LightCalculator.triggerGwang()`를 호출하고 `ui-renderer.js:updateLightExpectedTimeDisplay()`를 통해 UI를 업데이트합니다。
        - '잡힘' 버튼 클릭 시 `src/event-handlers.js`는 `src/light-calculator.js:stopStopwatch()`를 호출하고, 사용자 확인 후 `src/light-calculator.js:LightCalculator.saveLightCalculation()`을 통해 데이터를 저장하며, `ui-renderer.js`를 통해 최근 계산 결과 및 저장된 목록을 업데이트하고 계산기를 초기화합니다。
        - '목록' 버튼 클릭 시 `src/event-handlers.js`는 `ui-renderer.js:renderLightSavedList()`를 호출하여 저장된 기록을 표시합니다。
        - '기록 초기화' 버튼 클릭 시 `src/event-handlers.js`는 `LocalStorageManager.clearLightCalculatorRecords()`를 호출하고 `ui-renderer.renderer.js:renderLightSavedList()`를 통해 UI를 업데이트합니다。
    *   'boss-scheduler-screen'의 경우 `showScreen`은 `ui-renderer.js:renderBossSchedulerScreen()`를 호출합니다。
    *   'boss-scheduler-screen'에서 게임 선택 드롭다운 변경 시 `src/event-handlers.js`는 `ui-renderer.js:renderBossInputs()`를 호출합니다。
    *   'boss-scheduler-screen'에서 남은 시간 입력 필드(`remaining-time-input`)의 `input` 이벤트 발생 시 `src/calculator.js`를 통해 젠 시간 계산 및 표시。
    *   'boss-scheduler-screen'에서 '남은 시간 초기화' 버튼 클릭 시 `src/event-handlers.js`는 모든 남은 시간 입력 필드 초기화 (확인 대화 상자 포함)。
    *   'boss-scheduler-screen'에서 '보스 설정 적용' 버튼 클릭 시 `src/event-handlers.js`는 다음 복합적인 로직을 수행합니다: 계산된 보스 목록을 `DOM.bossListInput`에 설정하고, `parseBossList`로 스케줄을 업데이트한 뒤 '보스 목록' 화면으로 이동합니다。
    *   **모바일 '더보기' 버튼 클릭:**
        *   `event-handlers.js`는 `DOM.moreMenuButton` 클릭을 감지하여 `DOM.sidebar`에 `.more-menu-open` 클래스를 토글하고, `DOM.sidebarBackdrop`에 `.active` 클래스를 추가합니다。
        *   **`inert` 속성을 `main`, `header`, `footer`에 적용하고, 초점 가두기(Focus Trap)를 활성화하며, `Escape` 키 이벤트를 등록하여 접근성을 강화합니다。**
    *   **모바일 '더보기' 메뉴 닫기 (`moreMenuCloseButton` 클릭 또는 백드롭 클릭, `Escape` 키):**
        *   `event-handlers.js`는 이러한 이벤트를 감지하여 '더보기' 메뉴를 닫고, **`inert` 속성 제거, 초점 가두기 비활성화 등 접근성 관련 처리를 원상 복구합니다。**
    *   **모바일 하단 탭 바 텍스트 라벨 제거:** `index.html`에서 하단 탭 바의 텍스트 라벨이 제거되어 아이콘만 표시됩니다。
    *   **모바일 하단 탭 바 아이콘 정렬 개선:** `src/style.css`에서 관련 CSS 속성 조정(`.bottom-nav` `align-items`, `.bottom-nav-item` `justify-content` 등)을 통해 아이콘이 중앙에 잘 정렬되도록 합니다。
    *   **모바일 푸터 여백 계산 수정:** `src/style.css`에서 `body`의 `padding-bottom` 계산 로직을 `calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))`으로 수정하여, 하단 탭 바가 푸터를 가리지 않도록 합니다。

3.  **알람 토글 (`event-handlers.js` -> `alarmToggleButton` 클릭)**:
    *   `event-handlers.js`는 `alarm-scheduler.js:getIsAlarmRunning()`를 호출합니다。
    *   실행 중이 아니면 `alarm-scheduler.js:startAlarm(DOM)`를 호출하고, 이는 `data-managers.js:LocalStorageManager.setAlarmRunningState(true)`를 설정하고, `logger.js:log()`를 호출하고, `speech.js:speak()`를 호출하고, `alarm-scheduler.js:checkAlarms` 및 `ui-renderer.js:renderDashboard`에 대한 `setInterval`을 시작합니다。
    *   실행 중이면 `alarm-scheduler.js:stopAlarm()`를 호출하고, 이는 `data-managers.js:LocalStorageManager.setAlarmRunningState(false)`를 설정하고, `logger.js:log()`를 호출하고, `speech.js:speak()`를 호출하고, `setInterval`을 지웁니다。

4.  **주기적 알람 확인 (`alarm-scheduler.js:checkAlarms` - 매 1초)**:
    *   `checkAlarms`는 `data-managers.js:BossDataManager`에서 보스 일정을 검색합니다。
    *   현재 시간을 보스 시간(동적 및 고정)과 비교합니다。
    *   알림 조건이 충족되면 `logger.js:log()` 및 `speech.js:speak()`를 호출합니다。
    *   가장 가까운 다가오는 보스로 `data-managers.js:BossDataManager.setNextBossInfo()`를 업데이트합니다。
    *   젠된 동적 보스는 `data-managers.js:BossDataManager`의 일정에서 제거됩니다。
    *   자정에는 모든 보스의 `alerted_Xmin` 플래그를 재설정합니다。

5.  **대시보드 업데이트 (`alarm-scheduler.js` -> `renderDashboard(DOM)` - 매 1초)**:
    *   `ui-renderer.js:renderDashboard(DOM)`는 `ui-renderer.js:updateNextBossDisplay(DOM)`, `ui-renderer.js:renderUpcomingBossList(DOM)`, `ui-renderer.js:renderAlarmStatusSummary(DOM)`, `ui-renderer.js:updateMuteButtonVisuals(DOM)`, `ui-renderer.js:renderRecentAlarmLog(DOM)`를 호출합니다。
    *   이 함수들은 `data-managers.js:BossDataManager`, `data-managers.js:LocalStorageManager`, `alarm-scheduler.js:getIsAlarmRunning()`, `logger.js:getLogs()`에서 데이터를 검색하여 대시보드 UI를 업데이트합니다。

6.  **공유 링크 생성 (`showScreen` 함수 내부에서 실행)**:
    *   `showScreen` 함수 내에서 `DOM.bossListInput.value`를 가져옵니다。
    *   `longUrl`을 구성합니다。
    *   `LocalStorageManager.exportFixedAlarms()`를 호출하여 고정 알림 데이터를 가져와 `longUrl`에 추가합니다。
    *   `api-service.js:getShortUrl(longUrl)`를 호출합니다。
    *   결과로 `DOM.shareLinkInput.value`를 업데이트하고 `logger.js:log()`를 호출합니다。

7.  **고정 알람 관리 (`event-handlers.js` -> 고정 알람 관련 버튼 클릭)**:
    *   `event-handlers.js`의 위임된 이벤트 리스너는 고정 알람 추가, 편집, 삭제, 토글 이벤트를 감지합니다。
    *   각 이벤트에 따라 `LocalStorageManager.addFixedAlarm()`, `LocalStorageManager.updateFixedAlarm()`, `LocalStorageManager.deleteFixedAlarm()`, `LocalStorageManager.setFixedAlarmState()` 등의 적절한 `LocalStorageManager` 메서드를 호출합니다。
    *   데이터 변경 후 `ui-renderer.js:renderFixedAlarms()`를 호출하여 고정 알림 목록 UI를 새로 고칩니다。

8.  **음소거 버튼 클릭 (`event-handlers.js` -> `muteToggleButton` 클릭)**:
    *   `event-handlers.js`는 `LocalStorageManager.getMuteState()`를 호출하여 현재 상태를 가져옵니다。
    *   `LocalStorageManager.setMuteState()`를 호출하여 상태를 반전시키고 로컬 스토리지에 저장합니다。
    *   `ui-renderer.js:updateMuteButtonVisuals(DOM)`를 호출하여 버튼의 아이콘과 스타일을 업데이트합니다。
    *   `logger.js:log()`를 호출하여 사용자에게 상태 변경을 알립니다。 **이때 로그 메시지는 실제 음소거 상태에 맞춰 정확하게 출력됩니다。**