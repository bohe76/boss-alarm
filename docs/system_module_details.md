# 모듈별 상세 설명 (리팩토링 v4.0 - 상세)

## 1. 핵심 아키텍처

리팩토링 v4.0을 통해 애플리케이션은 **중앙 오케스트레이터(`app.js`)**와 **독립적인 화면 모듈(`screens/*.js`)** 구조로 재구성되었습니다.

### 1.1. `src/app.js`
- **역할:** 애플리케이션의 **최상위 오케스트레이터**. 모든 모듈의 초기화를 담당하고, 전역 이벤트를 처리하며, 화면 전환을 관리합니다.
- **주요 기능:**
    - `initApp()`: 애플리케이션의 메인 진입점.
        - `initDomElements()`를 호출하여 DOM 요소 참조 객체를 생성합니다.
        - `initLogger()`를 호출하여 로거를 초기화합니다.
        - `loadBossLists()`를 호출하여 `data/boss_lists.json`에서 기본 보스 목록을 로드합니다.
        - `LocalStorageManager.init()`, `CustomListManager.init()`을 호출하여 영구 데이터를 로드합니다.
        - URL 파라미터(`data`, `fixedData`)를 확인하고, 없으면 기본 보스 목록을 설정합니다.
        - `parseBossList()`를 호출하여 초기 보스 일정을 설정합니다.
        - `initEventHandlers()`를 호출하여 모든 이벤트 리스너를 등록합니다.
        - `EventBus.on('navigate', ...)` 리스너를 등록하여 화면 모듈로부터의 화면 전환 요청을 처리합니다.
        - `showScreen()`을 호출하여 초기 화면('dashboard-screen')을 표시합니다.
        - `ResizeObserver`를 초기화하여 모바일 뷰포트를 감지하고 `body`에 `is-mobile-view` 클래스를 동적으로 토글합니다.
    - `showScreen(DOM, screenId)`:
        - 모든 화면을 비활성화하고 `screenId`에 해당하는 화면만 활성화합니다.
        - 내비게이션 메뉴(사이드바, 하단 탭 바)의 `active` 상태를 동기화합니다.
        - 각 `screenId`에 맞는 `EventBus` 이벤트를 발생시켜 해당 화면 모듈이 자신의 UI를 렌더링하도록 트리거합니다. (예: `EventBus.emit('show-boss-scheduler-screen')`)
    - `initEventHandlers(DOM, globalTooltip)`:
        - **전역 이벤트 리스너 등록:** '알람 시작/중지', '사이드바 토글', '내비게이션 링크 클릭', '모바일 "더보기" 메뉴' 등 전역적인 사용자 상호작용에 대한 이벤트 리스너를 등록합니다.
        - **화면 모듈 초기화:** 모든 `screens/*.js` 모듈의 `init...Screen(DOM)` 함수를 호출하여 각 화면이 자신의 이벤트 리스너를 등록하도록 합니다.

### 1.2. `src/event-bus.js`
- **역할:** 모듈 간의 직접적인 종속성을 제거하기 위한 **중앙 이벤트 발행/구독(Pub/Sub) 시스템**.
- **주요 기능:**
    - `EventBus.on(event, listener)`: 특정 이벤트를 구독하여, 해당 이벤트가 발생했을 때 `listener` 함수가 실행되도록 등록합니다.
    - `EventBus.emit(event, data)`: 특정 이벤트를 발행하여, 이를 구독하는 모든 리스너에게 데이터를 전달하며 실행시킵니다.

---

## 2. 화면 모듈 (`src/screens/*.js`)

각 화면의 UI 이벤트 핸들러와 뷰(View) 관련 로직을 캡슐화하는 독립적인 모듈 그룹입니다.

### 2.1. `dashboard.js`
- **역할:** 대시보드 화면의 모든 로직을 담당합니다.
- **주요 기능:**
    - `initDashboardScreen(DOM)`:
        - '음소거' 버튼의 `click` 이벤트 리스너를 등록합니다. 클릭 시 `LocalStorageManager`의 음소거 상태를 변경하고, `updateMuteButtonVisuals`를 호출하여 UI를 갱신합니다.
        - `EventBus`의 `refresh-dashboard` 이벤트를 구독합니다. 이 이벤트는 `alarm-scheduler.js`에서 매초 발생하며, 수신 시 `renderDashboard` (from `ui-renderer.js`)를 호출하여 '다음 보스', '다가오는 보스 목록' 등 대시보드 UI 전체를 다시 그립니다.

### 2.2. `boss-management.js`
- **역할:** 보스 관리 화면의 로직을 담당합니다.
- **주요 기능:**
    - `initBossManagementScreen(DOM)`:
        - '시간순 정렬' 버튼의 `click` 이벤트 리스너를 등록합니다. 클릭 시 `getSortedBossListText`로 텍스트를 정렬하고, `parseBossList`를 호출하여 내부 상태를 갱신합니다.
        - 보스 목록 `textarea`의 `input` 이벤트 리스너를 등록하여, 사용자가 내용을 수정할 때마다 실시간으로 `parseBossList`를 호출하고 `renderDashboard`를 통해 대시보드를 갱신합니다.

### 2.3. `calculator.js`
- **역할:** 계산기 화면('젠 계산기', '광 계산기')의 모든 로직을 담당합니다.
- **주요 기능:**
    - `initCalculatorScreen(DOM)`: 젠 계산기와 광 계산기의 모든 이벤트 리스너를 등록합니다.
        - **젠 계산기:** '남은 시간' 입력 시 `calculateBossAppearanceTime`으로 실시간 계산, '보스 선택' 드롭다운 변경 감지, '보스 시간 업데이트' 버튼 클릭 시 `BossDataManager`의 데이터를 직접 수정하고 `parseBossList`로 재파싱하는 로직을 포함합니다.
        - **광 계산기:** '시작', '광', '잡힘', '기록 초기화' 버튼의 이벤트 리스너를 등록하고, `LightCalculator` 모듈의 함수들을 호출하여 스톱워치, 시간 기록, 결과 저장 등의 기능을 수행합니다.
    - `handleCalculatorScreenTransition(DOM)`: 계산기 화면으로 전환될 때 호출되어, `LightCalculator` 상태를 초기화하고 관련 UI를 리셋합니다.

### 2.4. `boss-scheduler.js`
- **역할:** 보스 스케줄러 화면의 로직을 담당합니다.
- **주요 기능:**
    - `initBossSchedulerScreen(DOM)`:
        - `show-boss-scheduler-screen` 및 `rerender-boss-scheduler` 이벤트를 `EventBus`에서 구독하여 화면 UI를 렌더링/새로고침합니다.
        - '게임 선택' 드롭다운, '남은 시간' 입력, '남은 시간 초기화', '보스 설정 적용' 버튼의 이벤트 리스너를 등록합니다.
        - '보스 설정 적용' 시, 입력된 시간들을 바탕으로 보스 목록 텍스트를 생성하여 `DOM.bossListInput.value`에 설정하고, `parseBossList`로 상태를 업데이트한 후, `EventBus.emit('navigate', 'boss-management-screen')`을 통해 화면 전환을 요청합니다.
    - **자체 상태 관리:** `_remainingTimes` 변수를 모듈 내에 두어, 다른 게임을 선택했다가 돌아와도 이전에 입력한 시간을 기억하도록 상태를 유지합니다.

### 2.5. `notifications.js`
- **역할:** 알림 설정 화면의 로직을 담당합니다.
- **주요 기능:**
    - `initNotificationSettingsScreen(DOM)`:
        - `fixedAlarmListDiv`에 이벤트 리스너를 위임하여, 동적으로 생성된 각 고정 알림 항목의 '편집', '삭제', '활성화 토글' 버튼 이벤트를 처리합니다.
        - `LocalStorageManager`를 호출하여 고정 알림 데이터를 수정/삭제하고, `renderFixedAlarms`를 호출하여 UI를 즉시 갱신합니다.
        - `prompt`를 통해 사용자 입력을 받고, `validateFixedAlarmTime` 및 `normalizeTimeFormat` 함수로 입력값을 검증/정규화합니다.

### 2.6. `custom-list.js`
- **역할:** 커스텀 보스 목록 관리 모달의 모든 로직을 담당합니다.
- **주요 기능:**
    - `initCustomListScreen(DOM)`:
        - '커스텀 목록 관리' 버튼 클릭 시 모달을 여는 이벤트 리스너를 등록합니다.
        - 모달 내의 닫기, 탭 전환, 저장/수정, 삭제/편집 버튼에 대한 모든 이벤트 리스너를 등록하고 처리합니다.
        - `CustomListManager`를 호출하여 커스텀 목록 데이터를 생성, 수정, 삭제하고 `localStorage`에 영구 저장합니다.
        - `EventBus.emit('rerender-boss-scheduler')`를 통해 '보스 스케줄러' 화면의 드롭다운 목록 갱신을 요청합니다.

### 2.7. `share.js`, `help.js`, `version-info.js`, `alarm-log.js`
- **역할:** 각각의 단일 기능 화면('공유', '도움말', '릴리즈 노트', '알림 로그')의 초기화 로직을 담당합니다.
- **주요 기능:** `init...Screen(DOM)` 함수들은 각 화면이 표시될 때 필요한 콘텐츠를 `api-service.js`나 `logger.js` 등에서 가져와 `ui-renderer.js`의 함수를 통해 렌더링하는 역할을 합니다.

---

## 3. 핵심 로직 및 유틸리티 모듈

### 3.1. `src/ui-renderer.js`
- **역할:** UI 컴포넌트 렌더링 담당. 각 화면 모듈의 요청에 따라 실제 DOM을 생성하고 업데이트하는 모든 함수를 포함합니다.
- **주요 함수:**
    - `renderDashboard(DOM)`: 대시보드 전체를 다시 그립니다.
    - `renderFixedAlarms(DOM)`: 고정 알림 목록과 '새 알림 추가' 폼을 렌더링합니다.
    - `populateBossSelectionDropdown(DOM)`: 젠 계산기의 보스 선택 드롭다운을 채웁니다.
    - `renderBossSchedulerScreen(DOM, remainingTimes)`: 보스 스케줄러 화면의 전체 UI를 렌더링합니다.
    - `showToast(DOM, message)`: 화면에 토스트 메시지를 표시합니다.
    - 그 외 다수의 UI 렌더링 및 업데이트 헬퍼 함수 포함.

### 3.2. `src/alarm-scheduler.js`
- **역할:** 보스 알림 타이머를 관리하고, 설정된 시간에 맞춰 알림을 트리거합니다.
- **주요 함수:**
    - `startAlarm(DOM)`: 1초 간격의 `setInterval`을 시작합니다. 하나는 `checkAlarms`를, 다른 하나는 `EventBus.emit('refresh-dashboard', DOM)`을 호출합니다.
    - `stopAlarm(DOM)`: `setInterval`을 정지시킵니다.
    - `checkAlarms()`: 매초 실행되며 `BossDataManager`와 `LocalStorageManager`의 모든 알람을 확인하여, 5분/1분/정각 알림 조건이 충족되면 `log()`와 `speak()`를 호출합니다. 또한 다음 보스 정보를 계산하여 `BossDataManager`에 업데이트합니다.

### 3.3. `src/data-managers.js`
- **역할:** 애플리케이션의 핵심 데이터를 관리하는 두 개의 싱글톤 객체를 제공합니다.
- **주요 객체:**
    - `BossDataManager`: 현재 파싱된 동적 보스 일정 배열(`bossSchedule`)과 다음 보스 정보(`_nextBoss`)를 메모리에서 관리합니다.
    - `LocalStorageManager`: `localStorage`에 저장되는 모든 사용자 설정(고정 알림, 음소거, 사이드바 상태 등)에 대한 `get/set` 인터페이스를 제공하고, `init` 시 모든 값을 로드합니다.

### 3.4. `src/boss-parser.js`
- **역할:** 사용자가 입력한 텍스트를 파싱하여 보스 일정 객체 배열을 생성합니다.
- **주요 함수:**
    - `parseBossList(bossListInput)`: `textarea`의 문자열을 받아, 날짜와 시간 형식을 검증하고, 날짜 변경(자정)을 감지하며, 유효한 보스 객체 배열을 생성하여 `BossDataManager`에 저장합니다.
    - `getSortedBossListText(rawText)`: 날짜 그룹을 유지하면서 시간순으로 텍스트를 정렬하여 반환합니다.

### 3.5. `src/utils.js`
- **역할:** 특정 모듈에 종속되지 않는 순수 헬퍼 함수들의 라이브러리입니다.
- **주요 함수:** `padNumber`, `formatMonthDay`, `validateFixedAlarmTime`, `normalizeTimeFormat`, `generateUniqueId`, `formatTime` 등.

### 3.6. 기타 모듈
- **`dom-elements.js`**: `document.getElementById` 호출을 한 곳에 모아 애플리케이션에서 사용되는 모든 DOM 요소에 대한 참조를 캡슐화합니다.
- **`logger.js`**: 로그 메시지를 배열에 저장하고 UI에 표시합니다.
- **`speech.js`**: `window.speechSynthesis` API를 사용하여 음성 알림을 순차적으로 처리하는 큐(Queue)를 관리합니다.
- **`api-service.js`**: `fetch`를 사용하여 외부 TinyURL API 통신 및 로컬 JSON 파일 로드를 담당합니다.
- **`boss-scheduler-data.js`**: `data/boss_lists.json` 파일을 로드하고, `CustomListManager`의 목록과 병합하여 게임/커스텀 목록 정보를 제공합니다.
- **`calculator.js`**, **`light-calculator.js`**: 각각 젠 계산기, 광 계산기의 핵심 계산 로직을 캡슐화합니다.
- **`default-boss-list.js`**: URL 파라미터가 없을 때 사용될 기본 보스 목록 텍스트를 상수로 제공합니다.