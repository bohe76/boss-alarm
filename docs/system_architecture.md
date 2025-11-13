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
- **DOM 추상화:** 이 모듈은 DOM 접근을 위한 추상화 계층 역할을 하여 일관성을 촉진하고 UI 변경 관리를 용이하게 합니다.
- **초기화 시점:** 모든 요소가 사용 가능하도록 DOM이 완전히 로드된 후에만 `initDomElements()`를 호출해야 합니다.

### 3.3. `src/logger.js`
- **역할:** 애플리케이션 내에서 발생하는 메시지(정보, 경고, 오류)를 UI의 로그 컨테이너에 표시하고 관리합니다.
- **주요 기능:**
    - `initLogger(containerElement)`: 로그 메시지를 표시할 DOM 컨테이너를 초기화.
    - `log(message, isImportant)`: 메시지를 로그 컨테이너에 추가. `isImportant` 플래그에 따라 스타일을 다르게 적용.
- **로깅 메커니즘:** `logger.js`는 사용자에게 애플리케이션 메시지를 표시하는 구조화된 방법을 제공합니다.
- **초기화 요구 사항:** `log()`를 사용하기 전에 올바른 DOM 요소로 `initLogger()`를 호출해야 합니다.
- **메시지 유형:** `isImportant` 플래그와 스타일링에 미치는 영향을 설명합니다.

### 3.4. `src/speech.js`
- **역할:** 웹 음성 API (`window.speechSynthesis`)를 사용하여 음성 알림 기능을 제공합니다.
- **주요 기능:**
    - `speak(message)`: 주어진 메시지를 음성으로 출력. 음성 발화 큐잉 메커니즘을 통해 여러 알림이 순차적으로 재생되도록 처리.
- **음성 합성:** 오디오 알림을 위한 `window.speechSynthesis` 사용을 자세히 설명합니다.
- **큐잉 로직:** `speechQueue` 및 `processQueue` 메커니즘이 순차적인 음성 출력을 위해 어떻게 작동하는지 설명하고, `refactoring_report.md`에 언급된 "음성 알림 중첩 문제 해결"을 다룹니다.
- **브라우저 호환성:** `window.speechSynthesis` 지원 확인 및 지원되지 않는 브라우저에 대한 `console.warn`을 언급합니다.

### 3.5. `src/data-managers.js`
- **역할:** 보스 일정 데이터(`BossDataManager`)와 로컬 스토리지에 저장되는 설정 데이터(`LocalStorageManager`)를 관리합니다.
- **주요 기능:**
    - **`BossDataManager`:**
        - `bossSchedule` (현재 보스 일정) 상태 관리.
        - `setBossSchedule(schedule)`, `getBossSchedule()`, `clearBossSchedule()` 등의 메서드 제공.
        - **`_nextBoss` 및 `_minTimeDiff`:** 다음 보스 정보와 해당 보스까지 남은 시간을 저장하고 관리합니다. `setNextBossInfo(nextBoss, minTimeDiff)` 및 `getNextBossInfo()` 메서드를 통해 접근합니다.
    - **`LocalStorageManager`:**
        - `fixedAlarmStates` (고정 알림 설정) 및 `logVisibilityState` (로그 가시성 설정) 상태 관리.
        - `init()`: 로컬 스토리지에서 초기 상태 로드.
        - `setFixedAlarmStates(states)`, `getFixedAlarmStates()`, `setLogVisibilityState(state)`, `getLogVisibilityState()` 등의 메서드 제공.
- **데이터 관리 전략:**
    - 싱글톤 데이터 관리자를 위한 IIFE 사용을 설명합니다.
    - 동적(`bossSchedule`) 데이터와 정적(`fixedBossSchedule`) 데이터를 구분합니다.
    - `fixedBossSchedule`이 하드코딩되어 있으며 UI를 통해 사용자가 수정할 수 없음을 명확히 합니다.
- **로컬 스토리지 사용:**
    - 저장되는 특정 사용자 환경 설정(`fixedAlarmStates`, `logVisibilityState`)을 자세히 설명합니다.
    - `fixedAlarmStates`의 구조(전역 토글, 개별 토글 배열)를 설명합니다.
    - 저장된 상태를 로드하기 위한 `init()` 메서드를 언급합니다.

### 3.6. `src/boss-parser.js` (확장)
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
- **날짜 파싱 로직 상세:**
    - 입력 텍스트는 줄 단위로 처리됩니다.
    - 'MM.DD' 형식의 줄은 날짜 마커로 작동하며, 이 날짜는 다음 날짜 마커가 나타나거나 목록이 끝날 때까지 모든 후속 보스 항목에 적용됩니다.
    - 입력의 첫 줄에 'MM.DD' 날짜 마커가 없으면, `baseDate`는 현재 날짜(오늘)로 기본 설정됩니다.
    - 'MM.DD HH:MM 보스이름'과 같이 날짜와 시간이 한 줄에 함께 있는 형식은 예상되지 않으며, 이 경우 'MM.DD' 부분은 무시될 수 있습니다. 'MM.DD'는 반드시 별도의 줄에 입력되어야 합니다.
- **시간 순서 및 날짜 변경 처리:**
    - `lastBossTimeInMinutes`와 `dayOffset` 변수를 사용하여 보스 항목의 시간 순서를 추적합니다.
    - 이전 보스 시간보다 이른 시간이 감지되면(예: 23:00 다음 01:00), `dayOffset`을 증가시켜 자동으로 다음 날로 넘어간 것으로 처리합니다.
- **오류 처리:** 유효하지 않은 날짜/시간 형식, 누락된 보스 이름, 빈 보스 목록에 대한 경고 메시지를 `logger.js`를 통해 출력합니다.

### 3.7. `src/alarm-scheduler.js` (확장)
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
        - **다음 보스 정보 관리:** 현재 시간 기준으로 가장 가까운 다음 보스를 식별하고, 해당 보스 정보와 남은 시간을 `BossDataManager`에 저장합니다.
- **알림 로직 상세:**
    - `setInterval`을 사용하여 매초 `checkAlarms` 함수를 호출하여 알림을 확인합니다.
    - 각 보스에 대해 5분 전, 1분 전, 정각(0분)의 세 가지 알림 단계를 처리합니다.
    - `alerted_5min`, `alerted_1min`, `alerted_0min` 플래그를 사용하여 중복 알림을 방지합니다.
- **자정 초기화:** 매일 자정(00:00)에 모든 일반 보스 및 고정 보스의 `alerted_Xmin` 플래그를 'false'로 초기화하여 매일 알림이 반복될 수 있도록 합니다.
- **보스 삭제 메커니즘:**
    - 일반 보스는 정각 알림(0분)이 트리거된 직후 `BossDataManager`의 스케줄에서 즉시 제거됩니다.
    - 고정 보스는 알림이 트리거되어도 목록에서 제거되지 않으며, 매일 반복됩니다.
- **고정 알림 처리:** 전역 고정 알림 토글과 개별 고정 알림 토글이 모두 활성화된 경우에만 고정 알림을 확인합니다.

### 3.8. `src/ui-renderer.js` (확장)
- **역할:** 애플리케이션의 UI 요소를 업데이트하고 렌더링합니다.
- **주요 기능:**
    - `updateBossListTextarea(bossList)`: 보스 목록 텍스트 영역 업데이트.
    - `renderFixedAlarms(container)`: 고정 알림 목록을 렌더링.
    - `updateFixedAlarmVisuals()`: 고정 알림 UI의 시각적 상태 업데이트.
    - `nextBossDisplay(nextBoss)`: 다음 보스 정보를 UI에 표시.
    - **다음 보스 남은 시간 표시:** `BossDataManager`에서 다음 보스 정보와 남은 시간을 가져와 `(HH:MM:SS)` 형식으로 UI에 표시합니다.
- **UI 업데이트 책임:** 보스 목록 텍스트 영역, 다음 보스 표시, 고정 알림 목록 등 애플리케이션의 다양한 UI 요소를 업데이트하고 렌더링하는 역할을 합니다.
- **날짜 마커 표시 로직:** `updateBossListTextarea` 함수는 'MM.DD' 날짜 마커 뒤에 실제 보스 항목이 있을 경우에만 해당 마커를 텍스트 영역에 표시하여 고아 날짜 마커가 표시되지 않도록 합니다.
- **DOM 초기화 의존성:** 이 모듈의 함수들은 `initApp`에서 초기화된 `DOM` 객체를 인수로 받아 사용함으로써, DOM 요소가 완전히 로드된 후에만 접근하도록 보장합니다.

### 3.9. `src/api-service.js` (확장)
- **역할:** 외부 TinyURL API와 통신하여 긴 URL을 짧은 URL로 변환하는 기능을 제공합니다.
- **주요 기능:**
    - `getShortUrl(longUrl)`: 주어진 긴 URL을 TinyURL API를 사용하여 단축.
    - API 호출 중 발생할 수 있는 오류를 처리하고 `logger.js`를 통해 메시지 출력.
- **외부 API 통합:** TinyURL API(`https://tinyurl.com/api-create.php`)를 사용하여 긴 URL을 짧은 URL로 변환하는 기능을 제공합니다.
- **API 호출 세부 사항:** GET 요청을 사용하며, `url` 매개변수에 인코딩된 긴 URL을 전달합니다. 응답으로 단축된 URL 텍스트를 받습니다.
- **오류 처리:** 네트워크 연결 오류 및 HTTP 응답 실패(404, 500 등)를 `try-catch` 블록으로 처리하고 `console.error`에 기록하며, `log` 함수를 통해 사용자에게 메시지를 전달합니다.

### 3.10. `src/event-handlers.js` (확장)
- **역할:** 모든 사용자 인터랙션(버튼 클릭, 토글 변경 등)에 대한 이벤트 리스너를 설정하고 관리합니다.
- **주요 기능:**
    - `initEventHandlers()`: `DOM` 요소에 이벤트 리스너를 등록.
    - `initApp()`: 애플리케이션 초기화 로직을 포함하며, URL 파라미터에서 보스 목록 로드, `LocalStorageManager` 초기화, `parseBossList` 호출, `initEventHandlers` 호출 등을 수행.
- **애플리케이션 수명 주기 및 초기화:**
    - `initApp` 함수는 `window.addEventListener('load')` 이벤트 발생 시 호출되는 애플리케이션의 주요 진입점입니다.
    - `initApp` 내에서 `initDomElements()`를 호출하여 DOM 요소들을 초기화하고, 이 `DOM` 객체를 `initEventHandlers` 및 다른 UI 관련 함수에 명시적으로 전달합니다.
    - URL 파라미터(`data`)를 확인하여 보스 목록을 미리 채우거나 `defaultBossList`를 로드합니다.
    - `parseBossList`, `LocalStorageManager.init`, `renderFixedAlarms` 등을 순차적으로 호출하여 애플리케이션 상태를 설정합니다.
- **이벤트 처리 흐름:** `initEventHandlers`는 시작/중지 버튼, 고정 알림 토글, 공유/복사 버튼, 도움말 모달 관련 버튼 등 모든 사용자 인터랙션에 대한 이벤트 리스너를 중앙에서 설정하고 관리합니다.
- **도움말 모달 상호작용:**
    - 도움말 버튼 클릭 시 모달을 열고, 닫기 버튼 또는 모달 외부 클릭 시 모달을 닫습니다.
    - 탭 버튼 클릭 시 `loadMarkdownContent` 함수를 사용하여 `docs/feature_guide.txt` 또는 `docs/version_history.txt` 파일의 내용을 동적으로 가져와 해당 탭에 표시합니다.
    - **CORS 경고:** `file://` 프로토콜로 `index.html`을 직접 열 경우 `fetch` 요청이 CORS 오류로 실패할 수 있으므로, 로컬 웹 서버(예: VS Code Live Server)를 사용하여 애플리케이션을 실행하는 것을 권장합니다.

### 3.11. `src/default-boss-list.js` (확장)
- **역할:** 애플리케이션의 기본 보스 목록 데이터를 제공합니다.
- **주요 기능:**
    - 하드코딩된 보스 목록 텍스트를 상수로 내보냅니다.
    - `event-handlers.js`에서 URL 파라미터가 없을 때 초기 보스 목록으로 사용됩니다.
- **기본 보스 목록 제공:** URL 파라미터에 보스 목록 데이터가 없을 경우, 애플리케이션 초기 상태로 사용되는 기본 보스 목록 텍스트를 제공합니다.
- **암시적 날짜 처리:** 이 기본 목록이 사용될 경우, `boss-parser.js`는 명시적인 날짜 마커가 없으므로 현재 날짜를 기준으로 보스 일정을 파싱하며, 시간 순서에 따른 날짜 변경(자정 넘김)을 자동으로 처리합니다.

### 3.12. `src/style.css` (확장)
- **역할:** 애플리케이션의 모든 시각적 스타일을 정의합니다.
- **주요 기능:**
    - `index.html`에서 `<link>` 태그를 통해 로드되어 UI 요소의 레이아웃, 색상, 폰트 등을 제어합니다.
    - HTML 구조와 분리되어 유지보수성과 가독성을 높입니다.
- **스타일링 구조:** 애플리케이션의 시각적 표현을 담당하며, 기능별로 명확하게 구분된 섹션(버튼, 입력 그룹, 로그, 푸터, 토글 스위치, 고정 알림, 도움말 모달 및 탭 등)으로 구성되어 있습니다.
- **주요 UI 컴포넌트 스타일:**
    - **도움말 버튼:** `header-container` 내에서 `display: flex`를 통해 `h1`과 수평으로 정렬되고 수직 중앙에 위치합니다.
    - **모달:** 고정된 높이(`600px`)와 `overflow-y: auto`를 통해 스크롤 가능한 콘텐츠 영역을 제공합니다.
    - **탭:** 고정된 너비(`150px`)와 왼쪽 정렬을 통해 닫기 버튼과의 겹침 문제를 해결합니다.
    - **남은 시간 표시:** 다음 보스까지 남은 시간을 표시하는 텍스트에 파란색(`color: #007aff;`) 스타일을 적용합니다.

### 3.13. `docs/version_history.txt`
- **역할:** 애플리케이션의 버전별 주요 기능 업데이트 내역을 기록합니다.
- **내용 및 형식:**
    - 각 버전은 `vX.X.X (YYYY-MM-DD)` 형식으로 시작합니다.
    - 그 아래에 해당 버전에서 업데이트된 기능 목록을 글머리 기호(`*`)로 나열합니다.
    - 기술적인 구현 세부 사항보다는 사용자에게 영향을 미치는 기능적 변경 사항에 중점을 둡니다.
    - 각 버전 항목 사이에는 빈 줄을 두어 가독성을 높입니다.
    - 예시:
        ```
        v1.1.0 (2025-11-13)
        * 대규모 리팩토링

        v1.0.0 (2025-11-13)
        * 최초 릴리스: 오딘 보스 알리미 프로젝트의 첫 번째 릴리스입니다.
        * 보스 목록 관리, 시간 기반 알림, 오디오 알림, 로깅, 공유 가능한 URL 생성 기능이 포함되어 있습니다.
        ```

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

- `src/alarm-scheduler.js` -> `src/data-managers.js` (`BossDataManager` 호출, `setNextBossInfo` 사용)
- `src/alarm-scheduler.js` -> `src/speech.js` (`speak` 호출)
- `src/alarm-scheduler.js` -> `src/logger.js` (`log` 호출)
- `src/alarm-scheduler.js` -> `src/ui-renderer.js` (`updateBossListTextarea` 호출)

- `src/ui-renderer.js` -> `src/dom-elements.js` (DOM 요소 접근)
- `src/ui-renderer.js` -> `src/data-managers.js` (`BossDataManager` 호출, `getNextBossInfo` 사용, `LocalStorageManager` 호출)

- `src/api-service.js` -> `src/logger.js` (`log` 호출)

## 5. 데이터 흐름

1.  **초기 로드:** `index.html` 로드 -> `initApp` 호출 (`event-handlers.js`).
2.  **URL 데이터 처리 및 기본 목록 로드:** `initApp`은 URL 파라미터에서 보스 목록 데이터를 확인합니다. `data` 파라미터가 없으면 `src/default-boss-list.js`에서 `defaultBossList`를 가져와 `DOM.bossListInput`에 설정합니다. `data` 파라미터가 있으면 해당 데이터를 `DOM.bossListInput`에 설정합니다.
3.  **보스 목록 파싱:** `initApp`은 `parseBossList(DOM.bossListInput)`를 호출하여 `DOM.bossListInput`의 텍스트를 파싱하고 `BossDataManager`에 저장합니다.
4.  **UI 렌더링:** `initApp`은 `LocalStorageManager`를 초기화하고, `renderFixedAlarms` 및 `updateFixedAlarmVisuals`를 호출하여 고정 알림 UI를 렌더링합니다.
5.  **알림 시작:** 사용자가 "알림 시작" 버튼 클릭 -> `event-handlers.js`에서 `startAlarm()` 호출.
6.  **주기적 알림 확인:** `alarm-scheduler.js`의 `checkAlarms`가 주기적으로 실행되며 `BossDataManager`의 보스 일정을 확인.
7.  **다음 보스 정보 업데이트:** `checkAlarms`는 현재 시간 기준으로 가장 가까운 다음 보스를 식별하고, 해당 보스 정보와 남은 시간을 `BossDataManager.setNextBossInfo()`를 통해 저장합니다.
8.  **알림 트리거:** 조건 충족 시 `speech.js`를 통해 음성 알림, `logger.js`를 통해 로그 기록.
9.  **UI 업데이트:** `updateBossListTextarea()`는 `BossDataManager.getNextBossInfo()`를 통해 다음 보스 정보와 남은 시간을 가져와 UI에 표시합니다.
10. **공유 링크 생성:** 사용자가 "공유 링크 생성" 버튼 클릭 -> `event-handlers.js`에서 `api-service.js`의 `getShortUrl` 호출 -> 단축 URL 생성 및 UI에 표시.

## 6. 결론

이 문서는 "오딘 보스 알리미" 애플리케이션의 리팩토링된 아키텍처를 상세히 설명합니다. 모듈화된 접근 방식은 각 기능의 독립성을 보장하고, 코드의 가독성, 유지보수성 및 확장성을 향상시킵니다. 명확한 책임 분리와 의존성 관리를 통해 향후 기능 추가 및 변경이 용이해질 것입니다.