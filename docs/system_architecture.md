# 오딘 보스 알리미 시스템 아키텍처 문서

## 1. 개요

본 문서는 "오딘 보스 알리미" 웹 애플리케이션의 시스템 아키텍처를 설명합니다. 이 애플리케이션은 게임 보스 출현 시간을 사용자에게 알리고, 보스 목록을 공유할 수 있는 기능을 제공합니다. 초기 단일 HTML 파일 구조에서 모듈화된 JavaScript 파일 기반의 아키텍처로 리팩토링되었습니다.

## 2. 아키텍처 개요

애플리케이션은 클라이언트 측에서 동작하는 단일 페이지 애플리케이션(SPA) 형태로, HTML, CSS, JavaScript로 구성됩니다. JavaScript 코드는 기능별로 여러 모듈로 분리되어 있으며, 각 모듈은 명확한 책임을 가집니다.

## 3. 모듈별 상세 설명

### 3.1. `index.html`
- **역할:** 애플리케이션의 진입점. HTML 구조, CSS 스타일, 그리고 JavaScript 모듈을 로드하는 스크립트 태그를 포함합니다.
- **주요 내용:**
    - UI 요소(텍스트 영역, 버튼, 로그 컨테이너 등) 정의.
    - `src/event-handlers.js`의 `initApp` 함수를 호출하여 애플리케이션 초기화.

### 3.2. `src/dom-elements.js`
- **역할:** 애플리케이션에서 사용되는 모든 DOM 요소에 대한 참조를 캡슐화하고 제공합니다.
- **주요 기능:**
    - `document.getElementById()`를 통해 필요한 DOM 요소들을 한 번만 가져와 객체 형태로 반환.
    - 다른 모듈들이 DOM 요소에 직접 접근하는 대신 이 모듈을 통해 일관된 방식으로 접근하도록 함.

### 3.3. `src/logger.js`
- **역할:** 애플리케이션 내에서 발생하는 메시지(정보, 경고, 오류)를 UI의 로그 컨테이너에 표시하고 관리합니다.
- **주요 기능:**
    - `initLogger(containerElement)`: 로그 메시지를 표시할 DOM 컨테이너를 초기화.
    - `log(message, isImportant)`: 메시지를 로그 컨테이너에 추가. `isImportant` 플래그에 따라 스타일을 다르게 적용.

### 3.4. `src/speech.js`
- **역할:** 웹 음성 API (`window.speechSynthesis`)를 사용하여 음성 알림 기능을 제공합니다.
- **주요 기능:**
    - `speak(message)`: 주어진 메시지를 음성으로 출력. 음성 발화 큐잉 메커니즘을 통해 여러 알림이 순차적으로 재생되도록 처리.

### 3.5. `src/data-managers.js`
- **역할:** 보스 일정 데이터(`BossDataManager`)와 로컬 스토리지에 저장되는 설정 데이터(`LocalStorageManager`)를 관리합니다.
- **주요 기능:**
    - **`BossDataManager`:**
        - `bossSchedule` (현재 보스 일정) 상태 관리.
        - `setBossSchedule(schedule)`, `getBossSchedule()`, `clearBossSchedule()` 등의 메서드 제공.
    - **`LocalStorageManager`:**
        - `fixedAlarmStates` (고정 알림 설정) 및 `logVisibilityState` (로그 가시성 설정) 상태 관리.
        - `init()`: 로컬 스토리지에서 초기 상태 로드.
        - `setFixedAlarmStates(states)`, `getFixedAlarmStates()`, `setLogVisibilityState(state)`, `getLogVisibilityState()` 등의 메서드 제공.

### 3.6. `src/boss-parser.js`
- **역할:** 사용자 입력 텍스트 영역에서 보스 목록을 파싱하고, 유효성을 검사하며, `BossDataManager`를 통해 보스 일정을 업데이트합니다.
- **주요 기능:**
    - `parseBossList(bossListInput)`:
        - 텍스트를 줄 단위로 분리하고 정규화.
        - 날짜(`MM.DD`) 및 시간(`HH:MM`) 형식 유효성 검사.
        - 월/일 값의 유효 범위 검사.
        - 누락된 보스 이름 검사.
        - 지난 보스 일정 필터링.
        - 파싱 오류 발생 시 `logger.js`를 통해 경고 메시지 출력.
        - 유효한 보스 일정을 `BossDataManager`에 설정.

### 3.7. `src/alarm-scheduler.js`
- **역할:** 보스 알림 타이머를 관리하고, 설정된 시간에 맞춰 알림을 트리거합니다.
- **주요 기능:**
    - `startAlarm()`: 알림 타이머를 시작하고 주기적으로 `checkAlarms`를 호출.
    - `stopAlarm()`: 알림 타이머를 중지.
    - `getIsAlarmRunning()`: 현재 알림이 실행 중인지 여부 반환.
    - `checkAlarms()`:
        - `BossDataManager`에서 현재 보스 일정을 가져옴.
        - 각 보스에 대해 5분 전, 1분 전, 정각 알림을 확인하고 트리거.
        - 알림 트리거 시 `speech.js`를 통해 음성 알림, `logger.js`를 통해 로그 메시지 출력.
        - 자정(새로운 날)이 되면 보스 일정을 초기화하고 다시 파싱.

### 3.8. `src/ui-renderer.js`
- **역할:** 애플리케이션의 UI 요소를 업데이트하고 렌더링합니다.
- **주요 기능:**
    - `updateBossListTextarea(bossList)`: 보스 목록 텍스트 영역 업데이트.
    - `renderFixedAlarms(container)`: 고정 알림 목록을 렌더링.
    - `updateFixedAlarmVisuals()`: 고정 알림 UI의 시각적 상태 업데이트.
    - `nextBossDisplay(nextBoss)`: 다음 보스 정보를 UI에 표시.

### 3.9. `src/api-service.js`
- **역할:** 외부 TinyURL API와 통신하여 긴 URL을 짧은 URL로 변환하는 기능을 제공합니다.
- **주요 기능:**
    - `getShortUrl(longUrl)`: 주어진 긴 URL을 TinyURL API를 사용하여 단축.
    - API 호출 중 발생할 수 있는 오류를 처리하고 `logger.js`를 통해 메시지 출력.

### 3.10. `src/event-handlers.js`
- **역할:** 모든 사용자 인터랙션(버튼 클릭, 토글 변경 등)에 대한 이벤트 리스너를 설정하고 관리합니다.
- **주요 기능:**
    - `initEventHandlers()`: `DOM` 요소에 이벤트 리스너를 등록.
    - `initApp()`: 애플리케이션 초기화 로직을 포함하며, URL 파라미터에서 보스 목록 로드, `LocalStorageManager` 초기화, `parseBossList` 호출, `initEventHandlers` 호출 등을 수행.

### 3.11. `src/default-boss-list.js`
- **역할:** 애플리케이션의 기본 보스 목록 데이터를 제공합니다.
- **주요 기능:**
    - 하드코딩된 보스 목록 텍스트를 상수로 내보냅니다.
    - `event-handlers.js`에서 URL 파라미터가 없을 때 초기 보스 목록으로 사용됩니다.

### 3.12. `src/style.css`
- **역할:** 애플리케이션의 모든 시각적 스타일을 정의합니다.
- **주요 기능:**
    - `index.html`에서 `<link>` 태그를 통해 로드되어 UI 요소의 레이아웃, 색상, 폰트 등을 제어합니다.
    - HTML 구조와 분리되어 유지보수성과 가독성을 높입니다.

## 4. 모듈 간 의존성

- `index.html` -> `src/event-handlers.js` (`initApp` 호출)
- `index.html` -> `src/style.css` (CSS 로드)
- `src/event-handlers.js` -> `src/dom-elements.js` (`initDomElements` 호출)
- `src/event-handlers.js` -> `src/logger.js` (`log`, `initLogger` 호출)
- `src/event-handlers.js` -> `src/boss-parser.js` (`parseBossList` 호출)
- `src/event-handlers.js` -> `src/alarm-scheduler.js` (`startAlarm`, `stopAlarm`, `getIsAlarmRunning` 호출)
- `src/event-handlers.js` -> `src/ui-renderer.js` (`updateBossListTextarea`, `renderFixedAlarms`, `updateFixedAlarmVisuals` 호출)
- `src/event-handlers.js` -> `src/api-service.js` (`getShortUrl` 호출)
- `src/event-handlers.js` -> `src/data-managers.js` (`LocalStorageManager` 호출)
- `src/event-handlers.js` -> `src/default-boss-list.js` (`defaultBossList` 가져오기)

- `src/boss-parser.js` -> `src/logger.js` (`log` 호출)
- `src/boss-parser.js` -> `src/data-managers.js` (`BossDataManager` 호출)

- `src/alarm-scheduler.js` -> `src/data-managers.js` (`BossDataManager` 호출)
- `src/alarm-scheduler.js` -> `src/speech.js` (`speak` 호출)
- `src/alarm-scheduler.js` -> `src/logger.js` (`log` 호출)
- `src/alarm-scheduler.js` -> `src/ui-renderer.js` (`nextBossDisplay` 호출)

- `src/ui-renderer.js` -> `src/dom-elements.js` (DOM 요소 접근)
- `src/ui-renderer.js` -> `src/data-managers.js` (`BossDataManager`, `LocalStorageManager` 호출)

- `src/api-service.js` -> `src/logger.js` (`log` 호출)

## 5. 데이터 흐름

1.  **초기 로드:** `index.html` 로드 -> `initApp` 호출 (`event-handlers.js`).
2.  **URL 데이터 처리 및 기본 목록 로드:** `initApp`은 URL 파라미터에서 보스 목록 데이터를 확인합니다. `data` 파라미터가 없으면 `src/default-boss-list.js`에서 `defaultBossList`를 가져와 `DOM.bossListInput`에 설정합니다. `data` 파라미터가 있으면 해당 데이터를 `DOM.bossListInput`에 설정합니다.
3.  **보스 목록 파싱:** `initApp`은 `parseBossList(DOM.bossListInput)`를 호출하여 `DOM.bossListInput`의 텍스트를 파싱하고 `BossDataManager`에 저장합니다.
4.  **UI 렌더링:** `initApp`은 `LocalStorageManager`를 초기화하고, `renderFixedAlarms` 및 `updateFixedAlarmVisuals`를 호출하여 고정 알림 UI를 렌더링합니다.
5.  **알림 시작:** 사용자가 "알림 시작" 버튼 클릭 -> `event-handlers.js`에서 `startAlarm()` 호출.
6.  **주기적 알림 확인:** `alarm-scheduler.js`의 `checkAlarms`가 주기적으로 실행되며 `BossDataManager`의 보스 일정을 확인.
7.  **알림 트리거:** 조건 충족 시 `speech.js`를 통해 음성 알림, `logger.js`를 통해 로그 기록.
8.  **공유 링크 생성:** 사용자가 "공유 링크 생성" 버튼 클릭 -> `event-handlers.js`에서 `api-service.js`의 `getShortUrl` 호출 -> 단축 URL 생성 및 UI에 표시.

## 6. 결론

이 문서는 "오딘 보스 알리미" 애플리케이션의 리팩토링된 아키텍처를 상세히 설명합니다. 모듈화된 접근 방식은 각 기능의 독립성을 보장하고, 코드의 가독성, 유지보수성 및 확장성을 향상시킵니다. 명확한 책임 분리와 의존성 관리를 통해 향후 기능 추가 및 변경이 용이해질 것입니다.
