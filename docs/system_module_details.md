# 모듈별 상세 설명 (API 명세서 - 최종)

이 문서는 '보스 알리미' 애플리케이션을 구성하는 각 JavaScript 모듈의 역할, `export`되는 모든 API의 상세 명세, 핵심 내부 로직, 그리고 다른 모듈과의 상호작용 방식을 코드 수준에서 상세히 기술합니다.

---

## 1. `src/app.js` (최상위 오케스트레이터)

### 역할
애플리케이션의 메인 진입점. 모든 모듈의 생명주기를 관리하고, 전역 이벤트를 처리하며, 화면 전환을 관장하는 최상위 오케스트레이터입니다.

### 주요 `export` 함수

#### `initApp()`
- **설명:** 애플리케이션의 메인 진입점. `index.html`에서 단 한번 호출되어 앱 전체를 초기화하고 실행합니다. 비동기(`async`) 함수입니다.
- **인자:** 없음
- **반환값:** `Promise<void>`
- **핵심 내부 로직:**
    1.  `initDomElements()`를 호출하여 모든 DOM 요소 참조를 `DOM` 객체에 저장합니다.
    2.  `initLogger()`를 호출하여 로거 UI를 초기화합니다.
    3.  `loadBossLists()`를 비동기로 호출하여 `data/boss_lists.json`에서 게임별 보스 목록 및 사용자 정의 보스 목록 데이터를 메모리로 로드합니다.
    4.  `LocalStorageManager.init()`과 `CustomListManager.init()`을 호출하여 `localStorage`의 모든 영구 데이터를 메모리로 로드합니다.
    5.  URL의 쿼리 파라미터를 파싱하여 `data`와 `fixedData`가 있는지 확인합니다.
    6.  `data`가 있으면 해당 값으로 보스 목록 `<textarea>`를 채우고, 없으면 `default-boss-list.js`와 현재 날짜를 조합하여 기본 목록을 생성하고 채웁니다.
    7.  `parseBossList()`를 호출하여 `<textarea>`의 텍스트를 기반으로 `BossDataManager`의 `bossSchedule` 상태를 초기 설정합니다.
    8.  `initEventHandlers(DOM, globalTooltip)`를 호출하여 모든 이벤트 리스너를 등록합니다.
    9.  `showScreen(DOM, 'dashboard-screen')`을 호출하여 초기 화면을 대시보드로 설정합니다.
    10. `ResizeObserver`를 생성하고 `body`에 연결하여, 뷰포트 너비가 768px 이하일 때 `body`에 `is-mobile-view` 클래스를 추가/제거하는 로직을 수행합니다.

### 주요 내부 함수

#### `showScreen(DOM, screenId)`
- **설명:** `screenId`에 해당하는 화면만 표시하고, 다른 모든 화면은 숨깁니다. 또한 화면 전환에 따른 부가적인 로직을 처리합니다.
- **인자:**
    - `DOM` (`Object`): `initDomElements`에서 반환된 DOM 요소 참조 객체.
    - `screenId` (`string`): 표시할 화면의 ID (예: 'dashboard-screen').
- **핵심 내부 로직:**
    1.  모든 화면 요소의 `active` 클래스를 제거합니다.
    2.  `screenId`를 가진 요소에 `active` 클래스를 추가합니다.
    3.  모든 내비게이션 링크(사이드바, 하단 탭 바)의 `active` 클래스를 제거하고, `screenId`에 해당하는 링크에만 `active` 클래스를 추가하여 UI 상태를 동기화합니다.
    4.  `if (screenId === ...)` 분기문을 통해, 각 화면에 맞는 초기화 함수를 호출하거나 `EventBus` 이벤트를 발행합니다.

#### `initEventHandlers(DOM, globalTooltip)`
- **설명:** 애플리케이션의 모든 전역 사용자 상호작용에 대한 이벤트 리스너를 등록하고, 각 화면 모듈의 초기화 함수를 호출합니다.
- **인자:**
    - `DOM` (`Object`): DOM 요소 참조 객체.
    - `globalTooltip` (`HTMLElement`): 툴팁 DOM 요소.
- **핵심 내부 로직:**
    1.  '알람 시작/중지', '사이드바 토글', 내비게이션 링크 클릭, '모바일 "더보기" 메뉴' 등 전역 UI 요소에 `addEventListener`를 사용하여 이벤트 핸들러를 등록합니다.
    2.  모든 `screens/*.js` 모듈의 `init...Screen()` 함수를 호출하여, 각 화면이 자신의 이벤트 리스너를 등록하고 `EventBus` 이벤트를 구독하도록 위임합니다.
    3.  `EventBus.on('navigate', (screenId) => showScreen(DOM, screenId))` 리스너를 등록하여, 어떤 모듈이든 `navigate` 이벤트를 발행하면 `showScreen` 함수가 호출되도록 중앙에서 제어합니다.

---

## 2. `src/event-bus.js` (이벤트 버스)

### 역할
모듈 간의 직접적인 종속성을 제거하기 위한 **중앙 이벤트 발행/구독(Pub/Sub) 시스템**.

### 주요 `export` 객체 `EventBus`

#### `EventBus.on(event, listener)`
- **설명:** 특정 이벤트를 구독합니다.
- **인자:**
    - `event` (`string`): 구독할 이벤트 이름.
    - `listener` (`Function`): 이벤트 발생 시 실행될 콜백 함수.
- **반환값:** `void`

#### `EventBus.emit(event, data)`
- **설명:** 특정 이벤트를 발행하여, 구독된 모든 리스너에게 데이터를 전달하며 실행시킵니다.
- **인자:**
    - `event` (`string`): 발행할 이벤트 이름.
    - `data` (`any`): 리스너에게 전달할 데이터.
- **반환값:** `void`

---

## 3. 화면 모듈 (`src/screens/*.js`)

각 화면의 UI 이벤트 핸들러와 뷰(View) 관련 로직을 캡슐화합니다.

| 모듈 파일 | 주요 `export` 함수 | 상세 역할 및 내부 로직 |
|---|---|---|
| **`dashboard.js`** | `initDashboardScreen(DOM)` | '음소거' 버튼의 `click` 이벤트 리스너를 등록합니다. `EventBus`의 `refresh-dashboard` 이벤트를 구독하고, 수신 시 `renderDashboard(DOM)`를 호출하여 대시보드 UI를 갱신합니다. |
| **`boss-management.js`**| `initBossManagementScreen(DOM)`| '시간순 정렬' 버튼 클릭 시 `getSortedBossListText()`를, `textarea` 입력 시 `parseBossList()`를 호출합니다. |
| **`calculator.js`** | `initCalculatorScreen(DOM)`, `handleCalculatorScreenTransition(DOM)` | 젠/광 계산기의 모든 버튼 이벤트 리스너를 등록하고, 화면 진입 시 UI를 초기화합니다. |
| **`boss-scheduler.js`** | `initBossSchedulerScreen(DOM)` | '게임 선택', '시간 입력' 등 보스 스케줄러의 모든 이벤트 리스너를 등록합니다. 화면 전환이 필요할 때 `EventBus.emit('navigate', ...)`를 호출합니다. |

| **`custom-list.js`** | `initCustomListScreen(DOM)`| 커스텀 목록 관리 모달의 모든 UI(열기, 닫기, 탭 전환, 저장, 수정, 삭제) 이벤트 리스너를 등록하고 `CustomListManager`를 통해 데이터를 관리합니다. |
| **`share.js`** | `initShareScreen(DOM)`| 화면이 표시될 때 `getShortUrl`을 비동기 호출하고, 결과를 클립보드에 복사한 후 메시지를 업데이트합니다. |
| **`help.js`** | `initHelpScreen(DOM)`| 화면이 표시될 때 `loadJsonContent`를 비동기 호출하여 `feature_guide.json`을 읽고 아코디언 UI를 생성합니다. |
| **`version-info.js`**| `initVersionInfoScreen(DOM)`| 화면이 표시될 때 `renderVersionInfo`를 호출합니다. |
| **`alarm-log.js`** | `initAlarmLogScreen(DOM)`| 화면이 표시될 때 `getLogs`를 호출하여 로그 목록 UI를 생성합니다. |

---

## 4. 핵심 로직 및 서비스 모듈

### 고정 알림 (Fixed Alarms) 로직 처리

`src/screens/notifications.js` 파일은 존재하지 않으며, 고정 알림 관련 로직은 다음과 같이 분산되어 처리됩니다.

*   **이벤트 핸들러 (`src/event-handlers.js`)**: `initEventHandlers()` 함수 내에서 고정 알림 추가 버튼(`addFixedAlarmButton`) 및 `DOM.fixedAlarmListDiv`에 대한 이벤트 위임(`click` 이벤트)을 통해 '편집', '삭제', '토글' 버튼 이벤트를 처리합니다. 이때 `LocalStorageManager`를 사용하여 고정 알림 데이터를 추가, 업데이트, 삭제합니다.
*   **렌더링 (`src/ui-renderer.js`)**: `renderFixedAlarms(DOM)` 함수는 `LocalStorageManager`에서 고정 알림 목록을 가져와 UI에 렌더링하며, `updateFixedAlarmVisuals(DOM)` 함수는 각 알림의 활성화/비활성화 상태에 따른 시각적 피드백(faded 효과)을 제공합니다.

### `data-managers.js`

- **`BossDataManager` (싱글톤 객체)**
    - `getBossSchedule()`: `Array`. 현재 보스 일정 배열 반환.
    - `setBossSchedule(newSchedule)`: `void`. 새로운 보스 일정 배열로 교체.
    - `getNextBossInfo()`: `{ nextBoss, minTimeDiff }`. 다음 보스 정보 객체 반환.
    - `setNextBossInfo(nextBoss, minTimeDiff)`: `void`. 다음 보스 정보 설정.
    - `getUpcomingBosses(count)`: `Array`. 예정된 보스 목록 `count`만큼 반환.
- **`LocalStorageManager` (싱글톤 객체)**
    - `init()`: `void`. 앱 시작 시 모든 데이터를 `localStorage`에서 로드.
    - `get(key)` / `set(key, value)`: `any` / `void`. 특정 키의 데이터를 읽고 씀.
    - `getFixedAlarms()`: `Array`. 고정 알림 배열 반환.
    - `addFixedAlarm(alarm)` / `updateFixedAlarm(id, updatedAlarm)` / `deleteFixedAlarm(id)`: `void`. 고정 알림 데이터 CRUD.
    - 그 외 각 설정 데이터에 대한 `get/set` 함수 제공.

### `alarm-scheduler.js`

- `startAlarm(DOM)`: `void`. 알람 `setInterval` 시작.
- `stopAlarm(DOM)`: `void`. 알람 `setInterval` 정지.
- `getIsAlarmRunning()`: `boolean`. 현재 알람 실행 상태 반환.
- **핵심 내부 로직 (`checkAlarms`)**: 매초 실행되며 `BossDataManager`와 `LocalStorageManager`의 모든 알람을 확인. 조건 충족 시 `log()`와 `speak()`를 호출하고, 다음 보스 정보를 계산하여 `BossDataManager` 상태를 업데이트.

### `ui-renderer.js`

- **역할:** DOM을 직접 조작하여 UI를 그리거나 업데이트하는 모든 함수를 포함합니다.
- **주요 `export` 함수:**
    - `showToast(DOM, message)`: 화면에 토스트 메시지를 표시합니다.
    - `populateBossSelectionDropdown(DOM)`: 젠 계산기의 보스 선택 드롭다운 메뉴를 동적으로 생성합니다.
    - `updateMuteButtonVisuals(DOM)`: 음소거 상태에 따라 음소거 버튼의 아이콘을 변경합니다.
    - `updateNextBossDisplay(DOM)`: 대시보드의 '다음 보스' 정보를 갱신합니다.
    - `renderUpcomingBossList(DOM)`: 대시보드의 '다가오는 보스 목록'을 렌더링합니다.
    - `renderAlarmStatusSummary(DOM)`: 대시보드의 '알림 실행 상태' 텍스트를 갱신합니다.
    - `renderRecentAlarmLog(DOM)`: 대시보드의 '최근 알림 로그'를 렌더링합니다.
    - `renderDashboard(DOM)`: 대시보드 전체 UI를 다시 그립니다.
    - `updateLightStopwatchDisplay(DOM, time)`: 광 계산기의 스톱워치 시간을 갱신합니다.
    - `updateLightExpectedTimeDisplay(DOM, time, isOverTime)`: 광 계산기의 '예상 시간' 또는 '오버 시간'을 갱신합니다.
    - `renderLightTempResults(DOM, gwangTime, afterGwangTime, totalTime)`: 광 계산기의 최근 계산 결과를 렌더링합니다.
    - `renderLightSavedList(DOM, records)`: 광 계산기의 저장된 기록 목록을 렌더링합니다.
    - `updateBossListTextarea(DOM)`: `BossDataManager`의 현재 보스 일정을 기반으로 보스 목록 `<textarea>`의 내용을 업데이트합니다.
    - `renderFixedAlarms(DOM)`: 고정 알림 목록과 '새 알림 추가' 폼을 렌더링합니다.
    - `updateFixedAlarmVisuals(DOM)`: 고정 알림의 활성화/비활성화에 따른 시각적 효과(faded)를 적용합니다.
    - `renderVersionInfo(DOM)`: 릴리즈 노트 화면의 버전 정보를 렌더링합니다.
    - `renderCalculatorScreen(DOM)`: 계산기 화면의 UI를 초기 상태로 리셋합니다.
    - `renderCustomListManagementModalContent(DOM)`: 커스텀 목록 관리 모달의 목록을 렌더링합니다.
    - `showCustomListTab(DOM, tabId)`: 커스텀 목록 관리 모달의 탭 화면을 전환합니다.
    - `renderBossSchedulerScreen(DOM, remainingTimes)`: 보스 스케줄러 화면의 전체 UI를 렌더링합니다.
    - `renderBossInputs(DOM, gameName, remainingTimes)`: 보스 스케줄러에서 선택된 게임의 보스 입력 필드를 렌더링합니다.

### `boss-parser.js`

- `parseBossList(bossListInput)`: `void`. `textarea`의 텍스트를 파싱하여 `BossDataManager` 상태를 변경.
- `getSortedBossListText(rawText)`: `string`. 정렬된 보스 목록 텍스트 반환.

### `custom-list-manager.js`

- **역할:** 커스텀 목록의 생성, 조회, 수정, 삭제(CRUD) 로직을 처리하고 `LocalStorageManager`를 통해 영구 저장합니다.
- **주요 `export` 함수:**
    - `init()`: `void`. 로컬 스토리지에서 커스텀 목록을 로드합니다.
    - `getCustomLists()`: `Array`. 모든 커스텀 목록 객체 배열을 반환합니다.
    - `addCustomList(name, content)`: `{success, message}`. 커스텀 목록을 추가합니다.
    - `updateCustomList(originalName, newListContent)`: `{success, message}`. 커스텀 목록 내용을 수정합니다.
    - `deleteCustomList(listName)`: `{success, message}`. 커스텀 목록을 삭제합니다.
    - `renameCustomList(oldName, newName)`: `{success, message}`. 커스텀 목록의 이름을 변경합니다.
    - `getBossNamesForCustomList(listName)`: `string[] | null`. 특정 커스텀 목록의 보스 이름 배열을 반환합니다.
    - `getCustomListContent(listName)`: `string | null`. 특정 커스텀 목록의 원본 텍스트 내용을 반환합니다.
    - `isPredefinedGameName(name)`: `boolean`. 미리 정의된 게임 이름과 중복되는지 확인합니다.

### `utils.js`
- `padNumber(number)`: 숫자를 두 자리 문자열로 변환합니다 (예: 7 -> "07").
- `formatMonthDay(date)`: Date 객체를 "MM.DD" 형식의 문자열로 변환합니다.
- `validateStandardClockTime(time)`: HH:MM, HH:MM:SS, HHMM, HHMMSS 형식의 시간을 검증합니다.
- `validateCountdownTime(time)`: MM:SS, MMSS 형식의 시간을 검증합니다.
- `validateBossSchedulerInput(time)`: `validateStandardClockTime` 또는 `validateCountdownTime`을 통과하는지 검증합니다.
- `validateFixedAlarmTime(time)`: 고정 알림에 유효한 시간 형식(HH:MM, HHMM)인지 검증합니다.
- `generateUniqueId()`: 고유 ID를 생성하여 반환합니다.
- `formatTime(seconds)`: 초를 MM:SS 형식으로 변환합니다.
- `formatTimeDifference(ms, showSeconds)`: 밀리초를 (HH:MM:SS) 또는 (HH:MM) 형식으로 변환합니다.
- `formatSpawnTime(timeString)`: 시간을 [HH:MM:SS] 형식으로 변환합니다.
- `normalizeTimeFormat(timeStr)`: `HHMM` 형식의 시간을 `HH:MM`으로 정규화합니다.

### 그 외 모듈
- **`dom-elements.js`**: `initDomElements()` 함수를 통해 모든 DOM 요소 참조를 캡슐화합니다.
- **`logger.js`**: `initLogger(element)`, `log(message, isImportant)`, `getLogs()` 함수를 제공합니다.
- **`speech.js`**: `speak(text)` 함수를 통해 음성 알림 큐를 관리합니다.
- **`api-service.js`**: `getShortUrl(longUrl)`, `loadJsonContent(filePath)` 함수를 제공합니다.
- **`boss-scheduler-data.js`**: `loadBossLists()`, `getGameNames()`, `getBossNamesForGame(gameName)` 함수를 제공합니다.
- **`calculator.js`**: `calculateBossAppearanceTime(remainingTimeString)` 함수를 제공합니다.
- **`light-calculator.js`**: `LightCalculator` 싱글톤 객체를 제공합니다.
- **`default-boss-list.js`**: `bossPresets` 배열을 `export` 하여 기본 보스 목록 데이터를 제공합니다.
