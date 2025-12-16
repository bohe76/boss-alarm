# 데이터 흐름 (v2.0 - 리팩토링 후)

이 문서는 '보스 알리미' 애플리케이션의 주요 화면 및 기능에 대한 상세한 데이터 흐름을 설명합니다. 애플리케이션의 모든 동작은 `app.js`가 오케스트레이션하며, 모듈 간 통신은 주로 `EventBus` 및 데이터 관리자(`BossDataManager`, `LocalStorageManager`)의 구독 패턴을 통해 이루어지고, `ui-renderer.js`를 통해 UI가 업데이트됩니다.

## 0. 카카오톡 인앱 브라우저 환경 처리 흐름 (초기 단계)

애플리케이션의 핵심 데이터 흐름이 시작되기 전, `index.html` 내부에 삽입된 스크립트가 가장 먼저 실행되어 현재 환경이 카카오톡 인앱 브라우저인지 확인합니다. 이 단계에서 애플리케이션의 정상적인 로딩 및 데이터 처리 여부가 결정됩니다.

1.  **환경 감지:** `index.html`의 `<head>` 섹션에 위치한 스크립트가 `navigator.userAgent`를 통해 현재 브라우저가 카카오톡 인앱 브라우저인지 판단합니다.
2.  **안드로이드 기기 처리:**
    *   카카오톡 인앱 브라우저가 감지되면, `location.href`를 `intent://` 스킴으로 변경하여 사용자의 기본 외부 브라우저(예: Chrome)로 페이지를 즉시 리디렉션합니다.
    *   이 과정에서 현재 인앱 브라우저의 페이지 로딩이 중단되며, 메인 애플리케이션의 데이터 흐름(초기 로드 포함)은 외부 브라우저에서 새로 시작됩니다.
3.  **iOS 기기 처리:**
    *   카카오톡 인앱 브라우저가 감지되더라도, 애플 보안 정책으로 인해 자동 리디렉션은 불가능합니다.
    *   대신, `document.body`에 전체 화면 안내 오버레이(`guideHTML`)를 추가하여 사용자에게 수동으로 Safari 등 외부 브라우저로 전환하도록 유도합니다.
    *   이 오버레이는 메인 애플리케이션의 UI 렌더링을 가리지만, `app.js`를 포함한 앱의 나머지 JavaScript 로딩 및 실행 자체는 계속됩니다. 다만, 사용자가 수동으로 외부 브라우저로 이동하기 전까지는 앱의 기능적 데이터 흐름이 사용자에게 보이지 않게 됩니다.

---

## 1. 애플리케이션 초기 로드 및 내비게이션 메커니즘

1.  **`index.html` 로드:** 브라우저가 `app.js`를 로드하고, `app.js`의 `initApp()` 함수가 실행됩니다.
2.  **`app.js: initApp()` 실행 (async):**
    *   `initDomElements()`를 호출하여 모든 DOM 요소 참조를 `DOM` 객체에 수집합니다.
    *   `initializeCoreServices(DOM)`를 `await`하여 로거, 데이터 관리자(LocalStorageManager, CustomListManager), 보스 데이터 로딩(data/boss_lists.json)과 같은 핵심 서비스를 초기화합니다. **이 과정에서 `LocalStorageManager`는 고정 알림 데이터에 `days` 속성이 없을 경우 마이그레이션 로직을 수행합니다.**
    *   `registerAllRoutes()`를 호출하여 `src/screens/*.js`의 모든 화면 모듈을 `src/router.js`에 등록합니다.
    *   `loadInitialData(DOM)`를 호출하여 URL 파라미터(`data`) 또는 `default-boss-list.js`의 기본 데이터를 파싱하여 `BossDataManager`의 `bossSchedule` 상태를 초기화합니다. (URL에 `fixedData`가 있더라도 무시합니다.)
    *   **`renderFixedAlarms(DOM)`를 호출하여 '설정' 화면의 고정 알림 목록을 초기 렌더링합니다.**
    *   `initGlobalEventListeners(DOM)`를 호출하여, `BossDataManager` 데이터 변경 감지나 로그 업데이트 같은 전역 이벤트 리스너를 중앙에서 활성화합니다.
    *   `initEventHandlers(DOM, globalTooltip)`를 호출하여 알람 토글, 사이드바, 내비게이션 링크 등 주요 UI 요소의 이벤트 핸들러를 등록합니다.
    *   **`renderAlarmStatusSummary(DOM)`를 호출하여 알림 상태 요약을 초기 렌더링합니다.**
    *   `showScreen(DOM, 'dashboard-screen')`을 호출하여 대시보드 화면을 초기 화면으로 설정하고 즉시 렌더링하며, 1초마다 주기적으로 갱신되도록 `setInterval`을 설정합니다.
    *   `EventBus.on('navigate', (screenId) => showScreen(DOM, screenId))` 리스너를 등록하여 다른 모듈에서 화면 전환을 요청할 수 있도록 합니다.3.  **`app.js: showScreen(DOM, screenId)` 실행:**
    *   모든 화면 요소에서 `active` 클래스를 제거하고, 지정된 `screenId`에 해당하는 요소에 `active` 클래스를 추가하여 화면을 표시합니다.
    *   내비게이션 링크의 `active` 상태를 동기화합니다.
    *   `src/router.js`를 통해 해당 화면 모듈을 가져와 `screen.init(DOM)` (최초 방문 시) 또는 `screen.onTransition(DOM)` (화면 전환 시)을 호출하여 화면별 로직을 초기화/실행합니다.
    *   대시보드 화면으로 전환 시 `renderDashboard(DOM)`를 즉시 호출하고 `setInterval`을 설정하여 1초마다 갱신합니다. 다른 화면으로 전환 시 `setInterval`을 해제합니다.
    *   `share-screen`, `version-info-screen`, `help-screen` 등의 화면은 `onTransition` 시 `api-service.js`를 통해 데이터를 비동기적으로 로드하고 `ui-renderer.js`를 통해 렌더링합니다.

## 2. 알람 시작 및 주기적 갱신 흐름

1.  **사용자 입력:** 사용자가 '알람 시작' 버튼(`DOM.alarmToggleButton`)을 클릭합니다.
2.  **`app.js: initEventHandlers` 이벤트 처리:** 리스너가 `alarm-scheduler.js`의 `startAlarm(DOM)` 함수를 호출합니다.
3.  **`alarm-scheduler.js: startAlarm()` 실행:**
    *   `LocalStorageManager`에 알람 실행 상태를 저장합니다.
    *   **시스템 알림(`Notification`) 권한을 요청합니다.**
    *   `syncScheduleToWorker()`를 호출하여 현재의 모든 보스 및 고정 알림 데이터를 알림 예정 시간(`flatSchedule`)으로 계산하여 워커로 전송(`UPDATE_SCHEDULE`)합니다. **이때 고정 알림은 `calculateNextOccurrence` 함수를 사용하여 요일 정보를 고려한 다음 발생 시간을 계산합니다.**
    *   워커(`src/workers/timer-worker.js`)에 `START` 메시지를 보냅니다.
4.  **`src/workers/timer-worker.js` (백그라운드 스레드):**
    *   `START` 메시지를 받으면 1초 간격의 `setInterval`을 시작합니다.
    *   매초(`tick`)마다 `flatSchedule`을 순회하며 현재 시간과 비교하여 알림 조건(5분 전, 1분 전, 정각)이 충족되었는지 확인합니다.
    *   조건 충족 시 메인 스레드로 `ALARM` 메시지를 보냅니다.
    *   매초 메인 스레드로 `TICK` 메시지를 보냅니다.
5.  **`alarm-scheduler.js: worker.onmessage` (메인 스레드):**
    *   **`ALARM` 수신 시:** `handleAlarm` 함수가 실행되어 소리(`speak`), 로그(`log`), 시스템 알림(`Notification`)을 출력하고, 데이터 상태(`alerted_*`)를 업데이트합니다. 데이터가 변경되었으므로 `syncScheduleToWorker`를 호출하여 워커의 데이터를 최신화합니다.
    *   **`TICK` 수신 시:** `updateAppState` 함수가 실행되어 자정 초기화 로직을 수행하고, `BossDataManager.setNextBossInfo`를 호출하여 대시보드 UI를 갱신합니다. 이때 `BossDataManager`는 `calculateNextBoss` 함수를 통해 고정 알림의 요일 정보를 고려한 '다음 보스'를 계산합니다.

## 3. 화면별 데이터 흐름 상세

### 3.1. 대시보드 화면 (`src/screens/dashboard.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 `initDashboardScreen(DOM)`이 호출됩니다. `global-event-listeners.js`에 등록된 `BossDataManager.subscribe`와 `setInterval`에 의해 `ui-renderer.js`의 `renderDashboard(DOM)`가 주기적으로 호출되어 최신 상태를 반영합니다.
*   **이벤트 리스너:**
    *   **음소거 토글 버튼 (`DOM.muteToggleButton`):** 클릭 시 `LocalStorageManager.setMuteState()`를 호출하여 음소거 상태를 토글하고, `ui-renderer.js`의 `updateSoundControls()`로 UI를 갱신하며, `log()`를 기록합니다.
    *   **볼륨 슬라이더 (`DOM.volumeSlider`):** `input` 이벤트 발생 시 `LocalStorageManager.setVolume()`을 호출하여 볼륨 값을 저장하고, 만약 음소거 상태였다면 `LocalStorageManager.setMuteState(false)`를 호출하여 음소거를 해제합니다. 이후 `ui-renderer.js`의 `updateSoundControls()`를 호출하여 UI를 갱신합니다.
*   **렌더링:** `ui-renderer.js`의 `renderDashboard(DOM)` 함수가 호출되면, `BossDataManager`에서 다음 보스 정보 및 예정된 보스 목록을 가져와 `updateNextBossDisplay()` 및 `renderUpcomingBossList()`를 통해 표시하고, `LocalStorageManager` 및 `alarm-scheduler.js`에서 알람 상태 및 음소거 상태를 가져와 `renderAlarmStatusSummary()` 및 `updateSoundControls()`로 표시합니다. **특히 '다가오는 보스 목록'을 렌더링할 때는 `BossDataManager` 내부에서 `calculateNextOccurrence` 함수를 사용하여 고정 알림의 다음 발생 시간을 계산합니다.** `renderRecentAlarmLog(DOM)`는 `logger.js`의 `log-updated` 이벤트에 반응하여 갱신됩니다.
*   **데이터 흐름 요약:** 대시보드는 `BossDataManager`의 구독 및 1초 `setInterval`을 통해 보스 데이터 및 타이머를 갱신하고, `logger.js`의 `log-updated` 이벤트에 반응하여 최근 알림 로그를 갱신하는 복합적인 반응형/주기적 갱신 메커니즘을 가집니다.

### 3.2. 보스 관리 화면 (`src/screens/boss-management.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 `initBossManagementScreen(DOM)`이 호출됩니다. 이 함수는 `LocalStorageManager`에서 저장된 '뷰/편집' 모드(`bossManagementMode`) 및 '다음 보스' 필터(`bossManagementNextBossFilter`) 상태를 로드하고, `ui-renderer.js`의 `updateBossManagementUI(DOM, mode)`를 호출하여 해당 모드에 맞는 UI를 초기 렌더링합니다.
*   **이벤트 리스너:**
    *   **'뷰/편집' 토글 버튼 (`DOM.viewEditModeToggleButton`):** 클릭 시 모드를 전환하고 `LocalStorageManager`에 저장합니다. `updateBossManagementUI`를 호출하여 UI를 갱신합니다.
    *   **'다음 보스' 토글 버튼 (`DOM.nextBossToggleButton`):** 뷰 모드에서만 활성화되며, 클릭 시 필터 상태를 토글하고 저장합니다. 이후 `updateBossManagementUI` -> `renderBossListTableView`를 호출하여 **카드 리스트 형태**로 필터링된 목록을 다시 렌더링합니다.
    *   **"보스 설정 저장" 버튼 (`DOM.sortBossListButton`):** 편집 모드에서만 활성화되며, 클릭 시 `boss-parser.js`의 `parseBossList()`를 호출하여 텍스트 영역의 내용을 파싱합니다. 이 과정에서 각 줄의 시간 형식을 감지하여 `timeFormat` 속성을 `boss` 객체에 포함시키고, 유효성을 검사합니다.
        *   **유효성 실패:** 에러 메시지를 담은 경고창(`alert`)을 띄우고 저장을 중단합니다.
        *   **유효성 성공:** 파싱된 결과를 `BossDataManager.setBossSchedule()`로 저장하고, `ui-renderer.js`의 `updateBossListTextarea(DOM)`를 호출하여 정렬 및 `timeFormat`에 따라 포맷팅된 텍스트로 갱신합니다. `window.isBossListDirty`를 `false`로 초기화합니다.
*   **데이터 흐름 요약:** `LocalStorageManager`를 통해 모드 및 필터 상태를 관리합니다. **뷰 모드**에서는 `BossDataManager` 데이터를 기반으로 `ui-renderer.js`가 `timeFormat`을 존중하여 날짜별 카드 리스트를 생성하고, **편집 모드**에서는 사용자 입력을 파싱하여 `timeFormat`을 포함한 데이터를 `BossDataManager`에 저장하는 양방향 흐름을 가집니다.

### 3.3. 보스 스케줄러 화면 (`src/screens/boss-scheduler.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 `initBossSchedulerScreen(DOM)`이 호출됩니다. `EventBus.on('show-boss-scheduler-screen', ...)` 리스너가 화면 전환 시 `ui-renderer.js`의 `renderBossSchedulerScreen()`을 호출합니다.
*   **이벤트 리스너 (DOM.bossSchedulerScreen에 위임):**
    *   **게임 선택 변경 (`DOM.gameSelect`):** `ui-renderer.js`의 `renderBossInputs()`를 호출하여 선택된 게임에 맞는 보스 입력 필드를 렌더링합니다. 이때 기존 보스의 ID를 `data-id` 속성에 매핑합니다.
    *   **남은 시간 입력 (`.remaining-time-input`):** `input` 이벤트 발생 시, 사용자의 입력 형식을('hm' 또는 'hms') 감지하여 `dataset.timeFormat`에 저장하고, `calculateBossAppearanceTime()`으로 계산된 젠 시간을 `timeFormat`에 맞춰 동적으로 표시합니다. 최종 시간은 `dataset.calculatedDate`에 ISO 형식으로 저장됩니다.
    *   **"모든 남은 시간 지우기" 버튼 (`DOM.clearAllRemainingTimesButton`):** 모든 입력 필드를 초기화합니다.
    *   **"보스 설정 적용" 버튼 (`DOM.moveToBossSettingsButton`):**
        1.  입력된 남은 시간(및 `dataset.calculatedDate`, `dataset.timeFormat`)과 `data-id`를 기반으로 `timeFormat` 속성이 포함된 `boss` 객체를 생성하거나 업데이트합니다.
        2.  전체 보스 리스트를 `scheduledDate` 기준으로 정렬하고, 날짜 마커(`type: 'date'`)를 적절한 위치에 새로 삽입하는 **재구성(Reconstruction)** 과정을 거칩니다.
        3.  완성된 리스트를 `BossDataManager.setBossSchedule()`에 저장하고 `updateBossListTextarea`를 호출합니다.
        4.  `EventBus.emit('navigate', 'boss-management-screen')`을 발행하여 '보스 관리' 화면으로 전환을 요청합니다.
*   **데이터 흐름 요약:** 사용자 입력을 바탕으로 정확한 시간(`Date`)과 표시 형식(`timeFormat`)을 계산/감지하여 저장하고, ID를 통해 데이터를 안전하게 업데이트하며, 전체 리스트를 재구성하여 데이터 꼬임을 방지합니다.

### 3.4. 알림 로그 화면 (`src/screens/alarm-log.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 'alarm-log-screen'으로 내비게이션될 때 `initAlarmLogScreen(DOM)`이 호출됩니다.
*   **렌더링 및 필터링:** `initAlarmLogScreen`은 "15개 보기" 토글 버튼의 상태를 `LocalStorageManager`에서 로드하고, `DOM.viewMoreLogsButton`의 시각적 상태를 업데이트합니다. `renderAlarmLog(DOM)`는 토글 버튼의 상태에 따라 `logger.js`의 `getLogs()`를 통해 가져온 전체 로그 또는 최근 15개의 로그만 `DOM.logContainer` 요소에 HTML `<li>` 목록 형태로 표시합니다. `global-event-listeners.js`에 등록된 `EventBus.on('log-updated', ...)` 리스너에 의해 새로운 로그 발생 시 `DOM.logContainer`가 갱신됩니다.
*   **이벤트 리스너:** "15개 보기" 버튼 클릭 시 토글 상태가 변경되고 `LocalStorageManager`에 저장되며, `renderAlarmLog(DOM)`를 다시 호출하여 로그 표시를 업데이트합니다.
*   **데이터 흐름 요약:** `logger.js`로부터 가져온 로그를 "15개 보기" 토글 상태에 따라 필터링하여 보여주는 화면이며, 새로운 로그 발생 시 이벤트 기반으로 갱신되고 사용자 설정(토글 상태)은 로컬 스토리지에 유지됩니다.

### 3.5. 공유 화면 (`src/screens/share.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 'share-screen'으로 내비게이션될 때 `initShareScreen(DOM)`이 호출됩니다.
*   **처리 흐름:** `DOM.bossListInput.value`를 통해 현재 동적 보스 목록 데이터만 수집하고, 이를 URL 파라미터(`data`)로 인코딩합니다. `api-service.js`의 `getShortUrl()`을 통해 단축 URL을 생성하고 클립보드에 복사한 후, `DOM.shareMessage`에 결과를 표시합니다.
*   **데이터 흐름 요약:** 현재 동적 보스 목록만 URL 파라미터로 인코딩한 후 TinyURL API를 통해 단축 URL을 생성하여 클립보드에 복사하고, 결과를 사용자에게 알립니다. (고정 알림은 공유되지 않습니다.)

### 3.6. 버전 정보 화면 (`src/screens/version-info.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 'version-info-screen'으로 내비게이션될 때 `initVersionInfoScreen(DOM)`이 호출됩니다.
*   **처리 흐름:** `api-service.js`의 `loadJsonContent()`를 통해 `data/version_history.json` 파일에서 버전 기록 데이터를 로드하고, `ui-renderer.js`의 `renderVersionInfo()`를 호출하여 `DOM.versionHistoryContent`에 표시합니다.
*   **데이터 흐름 요약:** 화면 전환 시 `api-service.js`를 통해 `version_history.json` 파일에서 버전 기록 데이터를 로드하여 `DOM.versionHistoryContent`에 표시합니다.

### 3.7. 도움말 화면 (`src/screens/help.js`)

*   **초기화 (`init`):** `app.js`의 `showScreen` 함수를 통해 화면에 처음 진입할 때 한 번만 호출됩니다. '도움말'과 'FAQ' 탭 버튼에 대한 클릭 이벤트 리스너를 등록하여, 탭 클릭 시 해당 탭과 콘텐츠 패널에 `.active` 클래스를 토글하는 역할을 합니다.
*   **처리 흐름 (`onTransition`):** 화면에 진입할 때마다 호출됩니다. `api-service.js`의 `loadJsonContent()`를 통해 `data/feature_guide.json`과 `data/faq_guide.json`을 병렬로 로드합니다. 로드가 완료되면, `ui-renderer.js`의 `renderHelpScreen()`과 `renderFaqScreen()`을 각각 호출하여 '도움말' 탭과 'FAQ' 탭의 콘텐츠를 아코디언 형태로 렌더링합니다.
*   **데이터 흐름 요약:** 화면 진입 시 두 개의 JSON 파일에서 데이터를 로드하여 각 탭 콘텐츠를 렌더링하고, 탭 클릭을 통해 두 콘텐츠 뷰를 전환하는 탭 기반 인터페이스로 동작합니다.

### 3.8. 개인 보스 목록 화면 (`src/screens/custom-list.js`)

*   **초기화:** `app.js`에 의해 `initCustomListScreen(DOM)`이 호출됩니다. (이 화면은 직접 내비게이션되는 화면이 아니며, '보스 스케줄러' 화면에서 모달 형태로 열립니다.)
*   **처리 흐름:** '커스텀 목록 관리' 모달의 이벤트 리스너를 등록합니다. 모달 내에서 목록 추가/수정/삭제 작업을 `CustomListManager`를 통해 수행하고, 변경 시 `EventBus.emit('rerender-boss-scheduler')`를 발행하여 '보스 스케줄러' 화면의 드롭다운을 갱신합니다.
*   **데이터 흐름 요약:** 모달을 통해 커스텀 보스 목록을 추가/수정/삭제하고, 모든 변경사항은 `CustomListManager`를 통해 로컬 스토리지에 저장되며, 관련 UI가 갱신됩니다.

### 3.9. 보탐 계산기 화면 (`src/screens/calculator.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 'calculator-screen'으로 내비게이션될 때 `handleCalculatorScreenTransition(DOM)`이 호출되어 계산기 UI 및 `CrazyCalculator` 상태를 초기화하고 렌더링합니다.
*   **처리 흐름 (젠 계산기):** 남은 시간 입력 시 `calculator.js`를 통해 보스 출현 시간을 계산합니다. "업데이트" 버튼 클릭 시 `BossDataManager`에서 해당 보스(ID 기준)를 찾아 시간을 업데이트하고, 전체 리스트를 재구성(Reconstruction)하여 저장합니다. 이후 `updateBossListTextarea` 및 `updateBossManagementUI`를 호출하여 텍스트 영역 및 뷰 모드 UI를 즉시 갱신합니다.
*   **처리 흐름 (광 계산기):** "시작", "광", "캡처" 버튼 클릭을 통해 `CrazyCalculator` 모듈이 스톱워치를 제어하고, `LocalStorageManager`를 통해 기록을 저장합니다.
*   **데이터 흐름 요약:** "젠 계산기"는 사용자 입력 및 `BossDataManager`를 통해 보스 시간을 직접 업데이트하고 재구성하며, "광 계산기"는 `CrazyCalculator` 모듈을 통해 스톱워치 기반의 시간 측정을 수행하고 로컬 스토리지에 기록합니다.

### 3.10. 설정 화면 (`src/screens/settings.js`)

*   **초기화:** `app.js`의 `showScreen` 함수를 통해 'settings-screen'으로 내비게이션될 때 `initSettingsScreen(DOM)`이 호출되어 '고정 알림' 관련 이벤트 리스너(모달 열기/닫기, 저장, 요일 버튼 상호작용 등)가 설정됩니다.
*   **고정 알림 추가/편집 흐름:**
    1.  **모달 열기:**
        *   '고정 알림' 카드의 '추가' 버튼 클릭 또는 기존 알림 항목의 '편집' 버튼 클릭 시 `openFixedAlarmModal(DOM, alarmId)` 함수가 호출됩니다.
        *   모달은 `fixed-alarm-modal` ID를 가지며, CSS `display` 속성을 통해 표시/숨김 처리됩니다.
    2.  **데이터 바인딩:**
        *   **'추가' 모드:** 모달 제목은 "고정 알림 추가"로 설정되고, 입력 필드(시간, 이름)는 비워지며, 요일 버튼은 모두 활성화 상태로 초기화됩니다.
        *   **'편집' 모드:** `LocalStorageManager.getFixedAlarmById(alarmId)`를 통해 해당 알람 데이터를 가져옵니다. 모달 제목은 "고정 알림 편집"으로 설정되고, 시간/이름 입력 필드와 요일 버튼 상태(활성화/비활성화)가 해당 알람 데이터에 맞춰 채워집니다.
    3.  **요일 버튼 상호작용:** 모달 내 요일 버튼 클릭 시 해당 버튼의 `.active` 클래스가 토글되어 사용자가 요일을 선택/해제할 수 있습니다.
    4.  **저장 처리:**
        *   모달의 '저장' 버튼 클릭 시, `settings.js` 내의 로직이 실행됩니다.
        *   시간, 이름 입력값과 활성화된 요일 버튼 정보(`days` 배열)를 수집합니다.
        *   `validateFixedAlarmTime` 및 `normalizeTimeFormat` 함수를 사용하여 입력값을 검증하고 정규화합니다.
        *   모달의 `dataset.editingId` 속성을 통해 '추가' 모드(`id` 없음)와 '편집' 모드(`id` 있음)를 구분합니다.
        *   **'추가' 모드:** `fixed-${Date.now()}` 형식의 새로운 ID를 생성하고, `LocalStorageManager.addFixedAlarm()`을 호출하여 새 알람을 추가합니다.
        *   **'편집' 모드:** `LocalStorageManager.updateFixedAlarm(id, updatedAlarm)`을 호출하여 기존 알람을 업데이트합니다.
        *   저장 완료 후 `closeFixedAlarmModal(DOM)`를 호출하여 모달을 닫고, `ui-renderer.js`의 `renderFixedAlarms(DOM)`를 호출하여 알림 목록 UI를 갱신합니다.
        *   `log()` 함수로 기록을 남기고, 알람이 실행 중이면 `syncScheduleToWorker()`를 호출하여 워커에 변경사항을 동기화합니다.
*   **데이터 흐름 요약:** '설정' 화면은 고정 알림 추가/편집을 위한 모달을 제공하며, 모달은 `LocalStorageManager`를 통해 데이터를 읽고 쓰고, `ui-renderer.js`를 통해 목록을 갱신하며, `alarm-scheduler.js`를 통해 알람 워커를 동기화합니다.

### 3.11. PiP 위젯 데이터 흐름 (Document PiP Widget Data Flow)

*   **초기화:** `app.js`의 `initApp()` 함수에서 Document PiP API 지원 여부를 확인하고, 지원하는 경우 PiP 토글 버튼(`DOM.pipToggleButton`)을 표시합니다.
*   **PiP 창 열기/닫기:**
    1.  사용자가 PiP 토글 버튼을 클릭하면 `app.js`의 `initEventHandlers`에 등록된 리스너가 `pip-manager.js`의 `togglePipWindow()` 함수를 호출합니다.
    2.  `togglePipWindow()`는 현재 PiP 창이 열려 있는지 확인합니다. 열려 있으면 닫고, 닫혀 있으면 `documentPictureInPicture.requestWindow()`를 호출하여 가로 240px, 세로 100px 크기의 새 PiP 창을 엽니다.
    3.  PiP 창이 성공적으로 열리면 `src/pip-content.html`의 HTML 콘텐츠를 가져와 삽입합니다.
    4.  PiP 창에 `pagehide` 이벤트 리스너를 등록하여, 사용자가 직접 창을 닫을 경우 `pip-manager.js`의 내부 상태(`pipWindow`, `isPipOpen`)를 재설정합니다.
*   **콘텐츠 동기화:**
    1.  `app.js`의 `showScreen` 함수에 의해 대시보드 화면(`dashboard-screen`)이 활성화되면, 1초마다 `ui-renderer.js`의 `renderDashboard(DOM)` 함수가 호출되어 대시보드 UI가 갱신됩니다.
    2.  `renderDashboard(DOM)`는 `updateNextBossDisplay(DOM)`를 호출하여 '다음 보스' 정보를 메인 화면에 표시합니다.
    3.  `updateNextBossDisplay(DOM)` 함수는 `pip-manager.js`의 `isPipWindowOpen()`을 통해 PiP 창이 열려 있는지 확인하고, 열려 있다면 `updatePipContent(nextBoss, minTimeDiff)`를 호출합니다.
    4.  `updatePipContent()`는 `BossDataManager`에서 현재 '다음 보스' 정보(`nextBoss`, `minTimeDiff`)를 가져와 PiP 창 내의 `#pip-boss-name` (보스 이름)과 `#pip-remaining-time` (남은 시간) 요소의 텍스트를 최신 정보로 업데이트합니다.
*   **데이터 흐름 요약:** PiP 위젯은 `app.js`에서 초기화되고 `pip-manager.js`에서 창 생명주기를 관리하며, `ui-renderer.js`를 통해 `BossDataManager`의 데이터를 기반으로 콘텐츠가 실시간으로 동기화됩니다.
