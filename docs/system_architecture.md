# 보스 알리미 시스템 아키텍처 문서 (리뉴얼)

## 1. 개요

본 문서는 "보스 알리미" 웹 애플리케이션의 리뉴얼된 시스템 아키텍처를 설명합니다. 기존 단일 화면 구성에서 메뉴 기반의 다중 화면 레이아웃으로 전환하여 사용자 경험을 개선하고 기능별 분리를 강화했습니다. 이 애플리케이션은 게임 보스 출현 시간을 사용자에게 알리고, 보스 목록을 공유할 수 있는 기능을 제공합니다.

## 2. 아키텍처 개요

애플리케이션은 클라이언트 측에서 동작하는 단일 페이지 애플리케이션(SPA) 형태로, HTML, CSS, JavaScript로 구성됩니다. 핵심적으로 **헤더, 내비게이션 메뉴 (사이드바), 메인 콘텐츠 영역, 푸터, 그리고 모바일 뷰를 위한 하단 탭 바**의 5가지 주요 UI 영역으로 나뉘며, JavaScript 코드는 기능별로 여러 모듈로 분리되어 각 모듈은 명확한 책임을 가집니다. 메인 콘텐츠 영역은 선택된 메뉴 항목에 따라 동적으로 다른 화면을 렌더링합니다. 모바일 뷰에서는 기존 사이드바가 '더보기' 메뉴 오버레이로 재활용됩니다.

## 3. 모듈별 상세 설명

### 3.1. `index.html`
- **역할:** 애플리케이션의 진입점. 기본 HTML 구조, CSS 스타일, 그리고 JavaScript 모듈을 로드하는 스크립트 태그를 포함합니다.
- **주요 내용:**
    - 헤더, 내비게이션 메뉴, 메인 콘텐츠 영역, 푸터의 기본 구조 정의.
    - **모바일 뷰를 위한 하단 탭 바 (`<nav id="bottom-nav">`) 및 '더보기' 메뉴 오버레이의 배경을 처리하는 백드롭 (`<div id="sidebar-backdrop">`) 요소 추가.**
    - `src/app.js` (가칭, 기존 `event-handlers.js`의 `initApp` 역할 확장)를 호출하여 애플리케이션 초기화 및 라우팅 설정.

### 3.2. `src/dom-elements.js`
- **역할:** 애플리케이션에서 사용되는 모든 DOM 요소에 대한 참조를 캡슐화하고 제공합니다.
- **주요 기능:**
    - `document.getElementById()` 또는 `document.querySelector()`를 통해 필요한 DOM 요소들을 한 번만 가져와 객체 형태로 반환.
    - 다른 모듈들이 DOM 요소에 직접 접근하는 대신 이 모듈을 통해 일관된 방식으로 접근하도록 함.
- **DOM 추상화:** 이 모듈은 DOM 접근을 위한 추상화 계층 역할을 하여 일관성을 촉진하고 UI 변경 관리를 용이하게 합니다.
- **초기화 시점:** 모든 요소가 사용 가능하도록 DOM이 완전히 로드된 후에만 `initDomElements()`를 호출해야 합니다.
- **보스 스케줄러:** `boss-list-display-container` (보스 목록 헤더와 목록을 감싸는 컨테이너)에 대한 DOM 참조가 추가되었습니다.
- **커스텀 보스 목록:** `manageCustomListsButton` (커스텀 보스 목록 모달 열기 버튼), `customBossListModal` (모달 컨테이너), `closeCustomListModal` (모달 닫기 버튼), `customListNameInput` (목록 이름 입력 필드), `customListContentTextarea` (목록 내용 텍스트 영역), `saveCustomListButton` (목록 저장 버튼), `customListManagementContainer` (관리 탭의 목록 표시 컨테이너), `modalTabs` (모달 내 탭 내비게이션), `tabAddCustomList` (목록 추가 탭 버튼), `tabManageCustomLists` (목록 관리 탭 버튼), `customListAddSection` (목록 추가 섹션), `customListManageSection` (목록 관리 섹션)에 대한 DOM 참조가 추가되었습니다.

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
    - `speak(message)`: 주어진 메시지를 음성으로 출력. **음소거 상태를 확인하여, 음소거 시에는 음성을 출력하지 않습니다.** 음성 발화 큐잉 메커니즘을 통해 여러 알림이 순차적으로 재생되도록 처리.
- **음성 합성:** 오디오 알림을 위한 `window.speechSynthesis` 사용을 자세히 설명합니다.
- **큐잉 로직:** `speechQueue` 및 `processQueue` 메커니즘이 순차적인 음성 출력을 위해 어떻게 작동하는지 설명하고, "음성 알림 중첩 문제 해결"을 다룹니다.
- **브라우저 호환성:** `window.speechSynthesis` 지원 확인 및 지원되지 않는 브라우저에 대한 `console.warn`을 언급합니다.

### 3.5. `src/data-managers.js`
- **역할:** 보스 일정 데이터(`BossDataManager`)와 로컬 스토리지에 저장되는 설정 데이터(`LocalStorageManager`)를 관리합니다.
- **주요 기능:**
    - **`BossDataManager`:**
        - `bossSchedule` (현재 보스 일정) 상태 관리.
        - `setBossSchedule(schedule)`, `getBossSchedule()`, `clearBossSchedule()` 등의 메서드 제공.
        - `_nextBoss` 및 `_minTimeDiff`: 다음 보스 정보와 해당 보스까지 남은 시간을 저장하고 관리합니다. `setNextBossInfo(nextBoss, minTimeDiff)` 및 `getNextBossInfo()` 메서드를 통해 접근합니다.
    - **`LocalStorageManager`:**
        - `fixedAlarmStates` (고정 알림 설정), `logVisibilityState` (로그 가시성 설정), `sidebarState` (사이드바 접힘/펼쳐짐 상태), `activeScreen` (현재 활성화된 화면), `muteState` (음소거 상태) 등 다양한 사용자 환경 설정 상태 관리.
        - `fixedAlarms` (고정 알림 목록): 사용자가 추가, 편집, 삭제할 수 있는 고정 알림 객체 배열을 관리합니다. 각 고정 알림은 `id`, `name`, `time`, `enabled` 속성을 가집니다.
        - `lightCalculatorRecords` (광 계산 기록): 사용자가 저장한 광 계산 결과를 관리합니다. 각 기록은 `id`, `bossName`, `gwangTime`, `afterGwangTime`, `totalTime`, `timestamp` 속성을 가집니다.
        - `init()`: 로컬 스토리지에서 초기 상태 로드.
        - `set/get` 메서드를 통해 각 설정 상태에 접근.
        - `addFixedAlarm(alarm)`, `updateFixedAlarm(id, updatedAlarm)`, `deleteFixedAlarm(id)`: 고정 알림을 추가, 업데이트, 삭제하는 메서드를 제공합니다.
        - `exportFixedAlarms()`, `importFixedAlarms(encodedData)`: 고정 알림 목록을 Base64로 인코딩/디코딩하여 공유 기능을 지원합니다.
        - `getLightCalculatorRecords()`, `setLightCalculatorRecords(records)`, `clearLightCalculatorRecords()`: 광 계산 기록을 조회, 설정, 초기화하는 메서드를 제공합니다.
- **데이터 관리 전략:**
    - 싱글톤 데이터 관리자를 위한 IIFE 사용을 설명합니다.
    - `BossDataManager`는 동적 보스 일정과 `LocalStorageManager`에서 관리되는 사용자 설정 고정 알림을 통합하여 관리합니다.
- **로컬 스토리지 사용:**
    - 저장되는 특정 사용자 환경 설정(`fixedAlarms`, `logVisibilityState`, `sidebarState`, `activeScreen`, `alarmRunningState`, `lightCalculatorRecords`)을 자세히 설명합니다.
    - `fixedAlarms`의 구조(고유 `id`, `name`, `time`, `enabled` 상태)를 설명합니다.
    - `lightCalculatorRecords`의 구조(고유 `id`, `bossName`, `gwangTime`, `잡힘`, `totalTime`, `timestamp` 상태)를 설명합니다.
    - 저장된 상태를 로드하기 위한 `init()` 메서드를 언급합니다.

### 3.6. `src/custom-list-manager.js`
- **역할:** 사용자 정의 커스텀 보스 목록의 생성, 조회, 수정, 삭제 등 모든 관리를 위한 비즈니스 로직을 캡슐화합니다. 로컬 스토리지에 사용자 지정 목록을 영구적으로 저장하고 로드합니다.
- **주요 기능:**
    - `init()`: 앱 시작 시 로컬 스토리지에서 사용자 지정 목록을 로드합니다.
    - `getCustomLists()`: 현재 저장된 모든 사용자 지정 목록 객체 배열을 반환합니다.
    - `addCustomList(listName, listContent)`: 목록 이름과 내용을 유효성 검사한 후 새 사용자 지정 목록을 추가합니다.
    - `updateCustomList(originalName, newListContent)`: 기존 사용자 지정 목록의 이름을 변경하거나 내용을 업데이트합니다.
    - `deleteCustomList(listName)`: 특정 사용자 지정 목록을 삭제합니다.
    - `renameCustomList(oldName, newName)`: 기존 사용자 지정 목록의 이름을 변경합니다. (`event-handlers.js`의 편집/저장 로직에서 내부적으로 호출될 수 있습니다.)
    - `getBossNamesForCustomList(listName)`: 특정 사용자 지정 목록에 포함된 보스 이름 배열을 반환합니다.
    - `getCustomListContent(listName)`: 특정 사용자 지정 목록의 원본 텍스트 내용을 반환합니다.
    - `isPredefinedGameName(name)`: 주어진 이름이 미리 정의된 게임 이름과 충돌하는지 확인하여 이름 중복을 방지합니다.
- **유효성 검사:**
    - `validateListName(name)`: 목록 이름의 길이, 허용 문자(영문, 한글, 숫자, 공백, 하이픈, 밑줄, 괄호)에 대한 유효성을 검사합니다.
    - `parseAndValidateBossContent(content)`: 목록 내용의 빈 줄 여부, 보스 이름의 길이 및 제어 문자 포함 여부 등을 검사합니다.
- **내용 정리:** `_cleanBossListContent(content)` 함수를 통해 목록 내용에서 불필요한 빈 줄이나 공백만 있는 줄을 제거하여 저장합니다.
- **영구성:** `LocalStorageManager`를 사용하여 `customBossLists` 배열을 로컬 스토리지에 저장하고 로드합니다.
- **데이터 구조:** 각 사용자 지정 목록은 `name` (문자열), `bosses` (보스 이름 문자열 배열), `content` (사용자가 입력한 원본 텍스트 내용) 속성을 가집니다.

- **커스텀 보스 목록 관리 기능:**
    - **3.6.1. 기능 설명**
        1.  **모달 열기/닫기**:
            *   '커스텀 목록 관리' 버튼 클릭 (`event-handlers.js`) 시 모달 창이 표시됩니다。
            *   모달 닫기 버튼 클릭 또는 모달 외부 클릭 (`event-handlers.js`) 시 모달 창이 닫힙니다。
        2.  **탭 전환**:
            *   '목록 추가' 또는 '목록 관리' 탭 버튼 클릭 (`event-handlers.js`) 시 `ui-renderer.js:showCustomListTab`를 호출하여 해당 탭의 내용을 표시하고 활성 탭 버튼의 스타일을 업데이트합니다。
            *   '목록 추가' 탭으로 전환 시 입력 필드를 초기화합니다。
        3.  **목록 추가**:
            *   사용자가 '목록 추가' 탭에서 이름과 내용을 입력 후 '저장' 버튼 클릭 (`event-handlers.js`) 시 `CustomListManager.addCustomList`를 호출하여 새 목록을 추가합니다。
            *   `CustomListManager`는 `validateListName` 및 `parseAndValidateBossContent`를 통해 유효성을 검사하고 `_cleanBossListContent`를 통해 내용을 정리합니다。
            *   `LocalStorageManager`를 통해 로컬 스토리지에 저장합니다。
            *   `ui-renderer.js:showToast`로 결과 메시지를 표시하고 `ui-renderer.js:renderCustomListManagementModalContent`를 호출하여 '목록 관리' 탭을 새로 고칩니다。
            *   보스 스케줄러 화면의 게임 선택 드롭다운도 `ui-renderer.js:renderBossSchedulerScreen`을 통해 업데이트됩니다。
        4.  **목록 수정**:
            *   '목록 관리' 탭에서 특정 목록의 '편집' 버튼 클릭 (`event-handlers.js`) 시 '목록 추가' 탭으로 전환되며, 해당 목록의 이름과 내용이 입력 필드에 미리 채워집니다。
            *   사용자가 내용을 수정한 후 '수정' 버튼 클릭 (`event-handlers.js`) 시 `CustomListManager.updateCustomList`를 호출하여 목록을 업데이트합니다。
            *   만약 목록 이름도 변경되었다면, `CustomListManager.renameCustomList`를 먼저 호출한 후 `CustomListManager.updateCustomList`를 호출하여 이름 변경과 내용 업데이트를 처리합니다。
            *   유효성 검사 및 저장, UI 업데이트는 목록 추가와 동일한 방식으로 진행됩니다。
        5.  **목록 삭제**:
            *   '목록 관리' 탭에서 특정 목록의 '삭제' 버튼 클릭 (`event-handlers.js`) 시 사용자 확인 후 `CustomListManager.deleteCustomList`를 호출하여 목록을 삭제합니다。
            *   `LocalStorageManager`에서 해당 목록을 제거합니다。
            *   `ui-renderer.js:showToast`로 결과 메시지를 표시하고 `ui-renderer.js:renderCustomListManagementModalContent` 및 `ui-renderer.js:renderBossSchedulerScreen`을 업데이트합니다。
        6.  **데이터 초기 로드 (`event-handlers.js:initApp`)**:
            *   `initApp`은 `CustomListManager.init()`를 호출하여 앱 시작 시 로컬 스토리지에서 기존 사용자 지정 목록을 로드합니다。
    - **3.6.2. UI/UX 개선**
        - 모달 내 "목록 관리" 탭의 각 커스텀 목록 항목에 있는 '수정' 및 '삭제' 버튼이 수평으로 정렬되도록 `src/style.css`에 `.custom-list-manage-item .button-group` 스타일이 추가되었습니다。
        - '이름 변경' 버튼은 '수정' 기능을 통해 이름 변경이 가능하므로 UI에서 제거되었으며 (`src/ui-renderer.js`), 관련 이벤트 핸들러도 삭제되었습니다 (`src/event-handlers.js`)。
        - `src/custom-list-manager.js`의 `renameCustomList` 함수는 '수정' 기능을 통한 이름 변경 시 내부적으로 호출되어 여전히 사용됩니다。

### 3.7. `src/boss-parser.js`
- **역할:** 사용자 입력 텍스트 영역에서 보스 목록을 파싱하고, 유효성을 검사하며, `BossDataManager`를 통해 보스 일정을 업데이트합니다.
- **주요 기능:**
    - `parseBossList(bossListInput)`:
        - 텍스트를 줄 단위로 분리하고 정규화.
        - 날짜(`MM.DD`) 및 시간(`HH:MM` 또는 `HH:MM:SS`) 형식 유효성 검사. 초 단위가 생략되면 `:00`으로 처리.
        - 월/일 값의 유효 범위 검사.
        - 누락된 보스 이름 검사.
        - 지난 보스 일정 필터링.
        - 파싱 오류 발생 시 `logger.js`를 통해 경고 메시지 출력.
        - 유효한 보스 일정을 `BossDataManager`에 설정.
    - `getSortedBossListText(rawText)`:
        - 입력된 텍스트를 날짜 마커(`MM.DD`) 기준으로 블록을 나눕니다.
        - 각 블록 내에서 보스들을 시간순으로 정렬하고, 자정이 넘어가는 시간을 계산하여 정확한 `scheduledDate`를 할당합니다.
        - 모든 보스 객체를 취합하여 전체 목록을 최종적으로 시간순으로 정렬합니다.
        - 정렬된 목록을 다시 날짜 마커가 포함된 텍스트 형식으로 재구성하여 반환합니다. 이 기능은 사용자가 순서에 맞지 않게 목록을 입력해도 정확하게 정렬된 결과를 제공합니다.
- **날짜 파싱 로직 상세:**
    - 입력 텍스트는 줄 단위로 처리됩니다.
    - 'MM.DD' 형식의 줄은 날짜 마커로 작동하며, 이 날짜는 다음 날짜 마커가 나타나거나 목록이 끝날 때까지 모든 후속 보스 항목에 적용됩니다.
    - 입력의 첫 줄에 'MM.DD' 날짜 마커가 없으면, `baseDate`는 현재 날짜(오늘)로 기본 설정됩니다.
    - 'MM.DD HH:MM 보스이름'과 같이 날짜와 시간이 한 줄에 함께 있는 형식은 예상되지 않으며, 이 경우 'MM.DD' 부분은 무시될 수 있습니다. 'MM.DD'는 반드시 별도의 줄에 입력되어야 합니다.
- **시간 순서 및 날짜 변경 처리:**
    - `lastBossTimeInSeconds`와 `dayOffset` 변수를 사용하여 보스 항목의 시간 순서를 추적합니다.
    - 이전 보스 시간보다 이른 시간이 감지되면(예: 23:00 다음 01:00), `dayOffset`을 증가시켜 자동으로 다음 날로 넘어간 것으로 처리합니다.
- **오류 처리:** 유효하지 않은 날짜/시간 형식, 누락된 보스 이름, 빈 보스 목록에 대한 경고 메시지를 `logger.js`를 통해 출력합니다.

### 3.8. `src/calculator.js`
- **역할:** 현재 시간과 주어진 남은 시간을 기반으로 보스 출현 시간을 계산하는 기능을 제공합니다.
- **주요 기능:**
    - `calculateBossAppearanceTime(remainingTimeString)`: "HH:MM:SS" 형식, **"MM:SS" 형식**, **"HHMMSS"(6자리 숫자)** 형식, **"MMSS"(4자리 숫자)** 형식의 남은 시간 문자열을 입력받아 보스 출현 시간을 계산합니다.
    - 입력 유효성 검사: `HH:MM` 또는 `HH:MM:SS` 형식에 맞는지 확인하고, `SS`가 생략된 경우 `00`으로 처리합니다.
    - 시간 계산: 현재 시간에 남은 시간을 더하여 미래 시간을 계산합니다.
    - 결과 포맷팅: 계산된 보스 출현 시간을 "HH:MM:SS" 형식으로 반환합니다.
- **입력 및 출력:**
    - 입력: `HH:MM:SS`, **`MM:SS`, `HHMMSS`, `MMSS`** 형식의 문자열.
    - 출력: `HH:MM:SS` 형식의 문자열 또는 유효하지 않은 입력 시 `null`.
- **오류 처리:** 유효하지 않은 시간 형식이나 값에 대해 `null`을 반환하여 호출하는 측에서 처리할 수 있도록 합니다.

### 3.9. `src/light-calculator.js`
- **역할:** "광 계산기"의 핵심 로직을 담당합니다. 스톱워치 기능, "광" 시간 계산, 예상 시간 카운트다운 및 오버타임 카운트업, 그리고 계산 결과 저장 및 초기화 기능을 제공합니다.
- **주요 기능:**
    - `formatTime(seconds)`: 초 단위 시간을 "MM:SS" 형식의 문자열로 변환합니다.
    - `startStopwatch(updateDisplayCallback)`: 스톱워치를 시작하고 매초 `updateDisplayCallback`을 호출하여 경과 시간을 업데이트합니다.
    - `stopStopwatch()`: 스톱워치를 중지합니다.
    - `resetCalculator()`: 스톱워치, 카운트다운, 모든 시간 관련 상태를 초기화합니다.
    - `triggerGwang(updateExpectedTimeCallback)`: "광" 버튼이 눌린 시점의 시간을 기록하고, 이를 기반으로 예상 카운트다운 시간을 계산하여 시작합니다. 카운트다운이 끝나면 오버타임 카운트업으로 전환됩니다. `updateExpectedTimeCallback`을 통해 예상/오버 시간을 업데이트합니다.
    - `calculateGwangTimesIfMissing()`: "광" 버튼이 눌리지 않은 경우, 총 시간의 70%를 "광" 시간으로 자동 계산합니다.
    - `saveLightCalculation(bossName)`: 현재 계산된 "광" 시간, "잡힘", "총 시간"을 `LocalStorageManager`에 저장합니다.
    - `getLightCalculatorRecords()`: `LocalStorageManager`에서 광 계산 목록을 가져옵니다.
    - `getGwangTime()`, `getAfterGwangTime()`, `getTotalTime()`: 현재 계산된 "광" 시간, "잡힘", "총 시간"을 초 단위 숫자로 반환합니다.
- **데이터 흐름:**
    - `LocalStorageManager`와 연동하여 광 계산 기록을 영구적으로 저장하고 로드합니다.
    - `ui-renderer.js`의 콜백 함수를 통해 UI를 업데이트합니다.
- **상태 관리:** `stopwatchInterval`, `countdownInterval`, `stopwatchStartTime`, `gwangTime`, `currentStopwatchTime`, `expectedCountdownTime`, `currentCountdownTime`, `currentOverTime` 등의 내부 상태 변수를 관리하여 계산기의 정확한 동작을 보장합니다.

### 3.10. `src/boss-scheduler-data.js`
- **역할:** `data/boss_lists.json` 파일에서 게임별 보스 목록 데이터를 로드하고 관리합니다.
- **주요 기능:**
    - `loadBossLists(filePath)`: 지정된 JSON 파일에서 보스 목록 데이터를 비동기적으로 로드합니다. 로드 실패 시 오류를 로깅하고 빈 객체를 반환합니다.
    - `getGameNames()`: 로드된 보스 목록에서 사용 가능한 게임 이름(최상위 키) 배열을 반환합니다.
    - `getBossNamesForGame(gameName)`: 특정 게임에 대한 보스 이름 배열을 반환합니다.
- **데이터 구조:** `data/boss_lists.json`은 게임 이름을 키로 하고 해당 게임의 보스 이름 배열을 값으로 하는 JSON 객체 형태입니다.
### 3.11. `src/alarm-scheduler.js`
- **역할:** 보스 알림 타이머를 관리하고, 설정된 시간에 맞춰 알림을 트리거합니다.
- **주요 기능:**
    - `startAlarm()`: 알림 타이머를 시작하고 주기적으로 `checkAlarms`를 호출.
    - `stopAlarm()`: 알림 타이머를 중지.
    - `getIsAlarmRunning()`: 현재 알림이 실행 중인지 여부 반환.
    - `checkAlarms()`:
        - `BossDataManager`의 동적 보스 일정과 `LocalStorageManager`의 고정 알림을 통합하여 각 보스에 대해 5분 전, 1분 전, 정각 알림을 확인하고 트리거.
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
- **고정 알림 처리:**
    - `LocalStorageManager`에서 관리되는 고정 알림의 활성화 상태를 확인하고, 활성화된 고정 알림에 대해서만 알림을 처리합니다。

### 3.12. `src/ui-renderer.js`
- **역할:** 애플리케이션의 UI 요소를 업데이트하고 렌더링합니다. 특히, 각 화면(Dashboard, Boss Management 등)의 콘텐츠를 동적으로 렌더링하고 업데이트하는 책임을 가집니다.
- **주요 기능:**
    - `renderScreen(screenName)`: 지정된 화면을 메인 콘텐츠 영역에 렌더링.
    - `updateHeader(alarmRunning)`: 헤더의 알람 상태 토글 UI 업데이트.
    - `updateSidebar(sidebarCollapsed)`: 사이드바의 접힘/펼쳐짐 상태 업데이트.
    - `updateBossListTextarea(bossList)`: 보스 관리 화면의 텍스트 영역 업데이트.
    - `renderFixedAlarms()`: 알림 설정 화면의 고정 알림 목록을 동적으로 렌더링하며, 각 알림 카드, 편집/삭제 버튼, 새 알림 추가 폼을 포함합니다.
    - `updateFixedAlarmVisuals()`: 고정 알림의 활성화/비활성화 상태 등 시각적 피드백을 업데이트합니다.
    - `updateNextBossDisplay(nextBoss)`: 대시보드 화면의 다음 보스 정보 및 카운트다운 업데이트.
    - `updateLogDisplay(logMessages)`: 알림 로그 화면의 로그 메시지 업데이트. 
    - `renderCustomListManagementModalContent(DOM)`: 커스텀 보스 목록 관리 모달 내 "목록 관리" 탭의 내용을 동적으로 렌더링하며, 각 목록 항목, 편집/삭제 버튼을 포함합니다.
    - `renderHelpContent(tabName, content)`: 도움말 화면의 탭 콘텐츠 렌더링.
    - `updateVersionDisplay(version)`: 릴리즈 노트 화면의 버전 표시를 `loadJsonContent`를 사용하여 JSON 데이터로부터 아코디언 UI로 렌더링하며, 첫 번째 항목은 기본적으로 펼쳐져 있습니다.
    - `updateShareLink(shortUrl)`: 공유 화면의 단축 URL 표시 업데이트.
    - `renderCalculatorScreen(DOM)`: "젠 계산기" 및 "광 계산기" 화면의 UI를 초기화하고 렌더링합니다. 입력 필드를 지우고 보스 출현 시간 표시를 초기 상태로 재설정하며, 광 계산기 관련 UI 요소(스톱워치, 예상 시간, 임시 결과, 저장된 목록)를 초기화하고 숨깁니다. 또한, **젠 계산기 화면의 보스 선택 드롭다운을 향후 보스 목록으로 채우고 '보스 시간 업데이트' 버튼의 초기 상태를 설정하는 기능을 포함하도록 확장되었습니다.**
    - `populateBossSelectionDropdown(DOM)`: **새로운 함수**로, `BossDataManager`에서 다가오는 보스들을 필터링하여 "[HH:MM] 보스이름" 형식으로 젠 계산기의 보스 선택 드롭다운을 채웁니다.
    - `showToast(DOM, message)`: **새로운 함수**로, 사용자에게 3초 동안 표시되었다가 자동으로 사라지는 임시 피드백 메시지를 표시합니다.
    - `renderUpcomingBossList(DOM)`: 대시보드에 다가오는 보스 목록을 렌더링합니다. 크게 표시되는 '다음 보스'와의 중복을 피하기 위해, 목록에서는 다음으로 임박한 보스부터 10개를 표시합니다. 5분 이내의 보스 항목은 이름과 남은 시간에 특정 색상(빨간색/파란색)을 적용하여 시각적으로 강조합니다.
    - `updateLightStopwatchDisplay(DOM, time)`: "광 계산기"의 경과 시간 스톱워치 디스플레이를 업데이트합니다.
    - `updateLightExpectedTimeDisplay(DOM, time, isOverTime)`: "광 계산기"의 "잡힘 예상 시간" 또는 "오버 시간" 디스플레이를 업데이트하고, 상태에 따라 라벨과 색상을 변경합니다.
    - `renderLightTempResults(DOM, gwangTime, afterGwangTime, totalTime)`: "광 계산기"의 최근 계산 결과를 표 형태로 렌더링합니다. 결과가 없을 경우 해당 영역을 숨깁니다.
    - `renderLightSavedList(DOM, records)`: "광 계산기"의 저장된 기록 목록을 표 형태로 렌더링합니다. 기록이 없을 경우 "기록 초기화" 버튼을 비활성화하고 메시지를 표시합니다.
    - `renderBossSchedulerScreen(DOM, remainingTimes)`: "보스 스케줄러" 화면의 UI를 초기화하고 렌더링합니다. 게임 선택 드롭다운, 보스 입력 필드, 액션 버튼 등을 포함하며, 이전에 저장된 남은 시간 값을 사용하여 입력 필드를 채웁니다.
    - `renderBossInputs(DOM, gameName, remainingTimes)`: 선택된 게임에 대한 보스 입력 필드를 동적으로 렌더링합니다.
    - `updateMuteButtonVisuals(DOM)`: 음소거 상태에 따라 대시보드의 음소거 버튼 아이콘과 스타일을 업데이트합니다.
- **UI 업데이트 책임:** `LocalStorageManager`에서 관리되는 데이터를 기반으로 각 화면의 특정 UI 요소들을 동적으로 업데이트하고 렌더링하는 역할을 합니다.
- **커스텀 보스 목록 렌더링:** `CustomListManager`에서 데이터를 가져와 커스텀 보스 목록 관리 모달의 UI를 렌더링하고 업데이트합니다.
- **DOM 초기화 의존성:** 이 모듈의 함수들은 `initApp`에서 초기화된 `DOM` 객체를 인수로 받아 사용함으로써, DOM 요소가 완전히 로드된 후에만 접근하도록 보장합니다.

### 3.13. `src/api-service.js`
- **역할:** 외부 TinyURL API와 통신하여 긴 URL을 짧은 URL로 변환하는 기능을 제공하며, `docs` 폴더의 JSON 파일을 로드하는 기능도 포함합니다.
- **주요 기능:**
    - `getShortUrl(longUrl)`: 주어진 긴 URL을 TinyURL API를 사용하여 단축.
    - `loadJsonContent(filePath)`: 지정된 경로의 JSON 파일 내용을 비동기적으로 로드하고 파싱.
    - API 호출 및 파일 로드 중 발생할 수 있는 오류를 처리하고 `logger.js`를 통해 메시지 출력.
- **외부 API 통합:** TinyURL API(`https://tinyurl.com/api-create.php`)를 사용하여 긴 URL을 짧은 URL로 변환하는 기능을 제공합니다.
- **파일 로드:** `fetch` API를 사용하여 로컬 `docs` 폴더의 파일을 로드합니다.
- **오류 처리:** 네트워크 연결 오류 및 HTTP 응답 실패(404, 500 등)를 `try-catch` 블록으로 처리하고 `console.error`에 기록하며, `log` 함수를 통해 사용자에게 메시지를 전달합니다.

### 3.14. `src/event-handlers.js`
- **역할:** 모든 사용자 인터랙션(버튼 클릭, 토글 변경, 메뉴 선택 등)에 대한 이벤트 리스너를 설정하고 관리합니다.
- **주요 기능:**
    - `initEventHandlers(DOM, globalTooltip)`: `DOM` 요소에 이벤트 리스너를 등록하고, `globalTooltip` 요소를 전달받아 툴팁 기능을 활성화합니다.
    - `showTooltip(content, targetElement, globalTooltip)`: 지정된 `content`를 `globalTooltip`에 표시하고, `targetElement`에 상대적으로 위치를 조정합니다.
    - `hideTooltip(globalTooltip)`: `globalTooltip`을 숨깁니다.
    - **전역 이벤트:** 알람 on/off 토글, 사이드바 토글.
    - **내비게이션 이벤트:** 메뉴 항목 클릭 시 `showScreen`을 호출하여 화면 전환 및 **데스크톱/모바일 내비게이션 활성 상태를 동기화합니다. `showScreen` 함수가 활성 상태 관리에 대한 단일 진실 공급원(Single Source of Truth) 역할을 합니다.**
        - 사이드바가 축소된 상태에서 메뉴 아이템에 마우스를 올리면 `showTooltip`을 호출하여 툴팁을 표시하고, 마우스를 떼면 `hideTooltip`을 호출하여 툴팁을 숨깁니다.
        - **모바일 뷰에서는 하단 탭 바 메뉴 클릭 이벤트도 `showScreen`을 호출합니다.**
    - **화면별 이벤트:**
        - **대시보드:**
            - 음소거 토글: '음소거' 버튼(`muteToggleButton`) 클릭 시, `LocalStorageManager`의 음소거 상태를 변경하고 `ui-renderer.js`의 `updateMuteButtonVisuals`를 호출하여 버튼의 시각적 상태를 업데이트하며, **로그 메시지를 실제 음소거 상태에 맞춰 정확하게 출력합니다.**
        - **보스 관리:**
            - **시간순 정렬:** '시간순 정렬' 버튼 클릭 시, `boss-parser.js`의 `getSortedBossListText`를 호출하여 텍스트 영역의 목록을 정렬하고, 정렬된 텍스트로 텍스트 영역을 업데이트한 후 `parseBossList`를 호출하여 내부 스케줄을 갱신합니다.
            - **실시간 파싱:** 보스 목록 텍스트 영역 변경 시 `parseBossList`를 호출하여 실시간으로 스케줄을 업데이트합니다.
        - **알림 설정:** 고정 알림 토글 변경.
            - 고정 알림 추가, 편집, 삭제, 활성화/비활성화 버튼 클릭 이벤트 처리.
        - **공유:** **공유 화면이 표시될 때(`showScreen` 함수 내부에서) 공유 링크 생성 로직이 실행됩니다. 이는 데스크톱 사이드바 또는 모바일 하단 탭 바를 통해 '공유' 화면에 접근할 때 모두 동일하게 적용됩니다.**
        - **도움말:** `docs/feature_guide.json`에서 콘텐츠를 로드하고 아코디언 형태로 렌더링.
        - **젠 계산기:**
            - 남은 시간 입력 필드(`remainingTimeInput`)의 `input` 이벤트 발생 시 `src/calculator.js`를 통해 보스 출현 시간 계산 및 `bossAppearanceTimeDisplay` 업데이트. 또한, `checkZenCalculatorUpdateButtonState`를 호출하여 '보스 시간 업데이트' 버튼의 활성화 상태를 제어합니다. (입력 필드는 `HH:MM:SS` 또는 `HHMMSS` 형식의 예시 플레이스홀더를 가집니다.)
            - 보스 선택 드롭다운(`bossSelectionDropdown`)의 `change` 이벤트 발생 시 `checkZenCalculatorUpdateButtonState`를 호출하여 '보스 시간 업데이트' 버튼의 활성화 상태를 관리합니다.
            - '보스 시간 업데이트' 버튼(`updateBossTimeButton`) 클릭 시, 선택된 보스의 시간을 `bossListInput` 텍스트 영역에 업데이트하고, `boss-parser.js`를 통해 스케줄을 재파싱하며, `ui-renderer.js:showToast`를 사용하여 성공 메시지를 표시하고, 젠 계산기 UI를 초기화합니다.
        - 광 계산기:
            - '시작' 버튼(`lightStartButton`) 클릭 시 `src/light-calculator.js:startStopwatch()`를 호출하여 스톱워치를 시작하고 관련 버튼 상태를 변경합니다.
            - '광' 버튼(`lightGwangButton`) 클릭 시 `src/light-calculator.js:triggerGwang()`를 호출하여 예상 시간 카운트다운을 시작하고 버튼을 비활성화합니다.
            - '잡힘' 버튼(`lightCaptureButton`) 클릭 시 `src/light-calculator.js:stopStopwatch()`를 호출하고, 사용자 확인 후 `src/light-calculator.js:saveLightCalculation()`을 통해 계산 결과를 저장합니다. 이후 `ui-renderer.js`를 통해 최근 계산 결과 및 저장된 목록을 업데이트하고 계산기를 초기화합니다.
            - '목록' 버튼(`lightListButton`) 클릭 시 `ui-renderer.js:renderLightSavedList()`를 호출하여 광 계산 목록을 표시합니다.
            - '기록 초기화' 버튼(`clearLightRecordsButton`) 클릭 시 사용자 확인 후 `LocalStorageManager.clearLightCalculatorRecords()`를 호출하고 `ui-renderer.renderer.js:renderLightSavedList()`를 통해 UI를 업데이트합니다.
        - 보스 스케줄러:
            - 게임 선택 드롭다운 변경 시 `ui-renderer.js:renderBossInputs()` 호출.
            - 남은 시간 입력 필드(`remaining-time-input`)의 `input` 이벤트 발생 시 `src/calculator.js`를 통해 젠 시간 계산 및 표시.
            - '남은 시간 초기화' 버튼 클릭 시 모든 남은 시간 입력 필드 초기화 (확인 대화 상자 포함).
            - '보스 설정 적용' 버튼 클릭 시:
                - 스케줄러에 입력된 남은 시간을 바탕으로 각 보스의 전체 출현 시간(날짜 포함)을 계산하여 임시 목록을 생성합니다.
                - 특정 보스('오딘' 등)에 대해서는 12시간 뒤의 출현 시간을 자동으로 계산하여 목록에 추가합니다.
                - 이름에 '침공'이 포함된 보스의 출현 시간이 오늘이 아닐 경우, 해당 보스를 목록에서 제외(필터링)합니다.
                - 최종 생성된 보스 목록을 시간순으로 완벽하게 정렬합니다.
                - 정렬된 목록을 `MM.DD` 날짜 구분자를 포함한 텍스트 형식으로 변환하여 '보스 목록' 화면의 텍스트 영역(`DOM.bossListInput`)에 값을 설정하고, `boss-parser.js`를 통해 즉시 파싱합니다.
                - '보스 목록' 화면으로 전환하여 사용자에게 결과를 보여줍니다.
        - **커스텀 보스 목록 관리 모달:**
            - **모달 열기:** '커스텀 목록 관리' 버튼(`manageCustomListsButton`) 클릭 시, 모달(`customBossListModal`)을 열고 기본적으로 '목록 추가' 탭(`customListAddSection`)을 활성화합니다.
            - **주요 버튼 스타일 적용:** '커스텀 목록 관리' 버튼에 프라이머리 버튼 스타일이 적용되어 시각적으로 강조됩니다.
            - **모달 닫기:** '닫기' 버튼(`closeCustomListModal`) 클릭 또는 모달 외부 클릭 (`event-handlers.js`) 시 모달 창이 닫힙니다.
            - **탭 전환:** '목록 추가'(`tabAddCustomList`) 및 '목록 관리'(`tabManageCustomLists`) 탭 버튼 클릭 시, `ui-renderer.js:showCustomListTab`를 호출하여 해당 탭 내용(`customListAddSection`, `customListManageSection`)을 표시하고 활성 탭 버튼의 스타일을 업데이트합니다. '목록 추가' 탭으로 전환 시 입력 필드를 초기화하고 '저장' 버튼의 텍스트를 '저장'으로 설정합니다.
            - **목록 저장/업데이트:** '저장' 또는 '수정' 버튼(`saveCustomListButton`) 클릭 시:
                - `CustomListManager.addCustomList` 또는 `CustomListManager.updateCustomList`를 호출하여 사용자 지정 목록을 추가하거나 업데이트합니다.
                - 이름 중복 시 사용자에게 덮어쓰기 여부를 확인합니다.
                - 유효성 검사 실패 시 경고 메시지를 표시합니다.
                - 성공 시 `ui-renderer.js:showToast`를 통해 메시지를 표시하고, `ui-renderer.js:renderCustomListManagementModalContent`를 호출하여 "목록 관리" 탭을 새로 고칩니다.
                - `ui-renderer.js:renderBossSchedulerScreen`을 호출하여 보스 스케줄러 화면의 게임 선택 드롭다운을 업데이트합니다.
                - 모달을 닫습니다.
            - **목록 항목 관리 (편집, 삭제):** "목록 관리" 탭의 각 목록 항목 내 버튼 클릭 시:
                - **삭제:** '삭제' 버튼 클릭 시 사용자 확인 후 `CustomListManager.deleteCustomList`를 호출하여 목록을 삭제하고, `ui-renderer.js:renderCustomListManagementModalContent` 및 `ui-renderer.js:renderBossSchedulerScreen`을 업데이트합니다。
                - **편집:** '편집' 버튼 클릭 시 '목록 추가' 탭으로 전환하고, 선택된 목록의 이름과 내용을 입력 필드에 미리 채워 편집할 수 있도록 합니다. '저장' 버튼의 텍스트를 '수정'으로 변경하고 `dataset.editTarget` 속성을 설정하여 현재 편집 중인 목록임을 표시합니다. 편집된 내용이 저장될 때 `CustomListManager.updateCustomList`를 호출하여 내용을 업데이트하거나, 이름이 변경되었다면 `CustomListManager.renameCustomList`를 먼저 호출한 뒤 업데이트를 진행합니다。
        - **모바일 '더보기' 버튼 클릭:**
            - **'더보기' 버튼(`moreMenuButton`) 클릭 시**, 기존 사이드바를 활용한 전체 화면 오버레이를 토글합니다. 이때 `#sidebar`에 `.more-menu-open` 클래스를 추가하고, 배경에 `#sidebar-backdrop.active` 클래스를 추가합니다。
        - **광 계산기 초기화:** '계산기' 화면으로 돌아올 때 `LightCalculator`의 내부 상태 및 관련 UI가 초기화됩니다 (시간 00:00, '시작' 버튼만 활성화). 이는 다른 메뉴로 이동했다가 다시 돌아와도 정확한 계산을 시작할 수 있도록 합니다。
            - **주요 버튼 스타일 적용:** '광' 버튼에 프라이머리 버튼 스타일이 적용되어 시각적으로 강조됩니다。
        - **보스 스케줄러 목록 스크롤:** 보스 목록 헤더는 고정되고, 목록 부분만 스크롤되도록 구조화되었습니다。
            - **'X' 닫기 버튼(`moreMenuCloseButton`) 또는 백드롭 클릭 시**, '더보기' 메뉴를 닫습니다.
            - **접근성 강화:** '더보기' 메뉴가 열릴 때, 배경 콘텐츠(`main`, `header`, `footer`)에 `inert` 속성을 적용하여 비활성화하고, 메뉴 내에서 키보드 초점(Focus Trap)이 유지되도록 합니다. `Escape` 키로 메뉴를 닫을 수 있도록 이벤트 리스너를 등록합니다. 메뉴가 닫히면 이 모든 접근성 관련 처리를 원상 복구합니다。
- **새로운 헬퍼 함수:**
    - `checkZenCalculatorUpdateButtonState(DOM)`: 유효한 보스 선택과 계산된 보스 출현 시간을 기반으로 '보스 시간 업데이트' 버튼의 활성화 여부를 결정하는 헬퍼 함수입니다。
- **커스텀 보스 목록 이벤트:** 모달의 열기/닫기, 탭 전환, 목록 추가/업데이트/삭제/이름 변경에 대한 이벤트 리스너를 관리합니다。
- **이벤트 처리 흐름:** `initEventHandlers`는 헤더, 사이드바, 메인 콘텐츠 영역 및 **하단 탭 바** 내의 모든 사용자 인터랙션에 대한 이벤트 리스너를 중앙에서 설정하고 관리합니다。

### 3.15. `src/app.js` (신규 또는 `event-handlers.js`의 `initApp` 확장)
- **역할:** 애플리케이션의 전반적인 초기화, 상태 관리 및 라우팅을 담당하는 핵심 모듈.
- **주요 기능:**
    - `initApp()`: 애플리케이션의 진입점.
        - `dom-elements.js` 초기화.
        - `logger.js` 초기화.
        - `LocalStorageManager` 초기화 및 저장된 상태 로드.
        - URL 파라미터에서 `data` (보스 목록) 및 `fixedData` (고정 알림) 로드 또는 `defaultBossList` 사용.
        - `CustomListManager` 초기화.
        - `boss-parser.js`를 통해 보스 목록 파싱.
        - `event-handlers.js` 초기화 및 이벤트 리스너 등록.
        - `ui-renderer.js`를 통해 초기 화면 렌더링 (예: 대시보드).
        - `ui-renderer.js`를 통해 `LocalStorageManager`의 상태를 기반으로 초기 UI 상태 설정 (예: `DOM.logVisibilityToggle.checked`, `DOM.sidebar.classList`).
        - **뷰포트 너비를 감지하는 `ResizeObserver`를 초기화하고 `body`에 `is-mobile-view` 클래스를 동적으로 토글하는 로직을 추가합니다.**
        - 푸터의 버전 번호를 `window.APP_VERSION` 값으로 동적 설정.
        - `alarm-scheduler.js` 시작 (필요시).
    - **라우팅:** URL 해시 또는 History API를 사용하여 화면 전환을 관리하고, `ui-renderer.js`의 `renderScreen`을 호출하여 해당 화면을 표시.
    - **전역 상태 관리:** `BossDataManager` 및 `LocalStorageManager`와 연동하여 애플리케이션의 전역 상태를 관리하고, 변경 시 `ui-renderer.js`를 통해 UI 업데이트를 트리거.

### 3.16. `src/default-boss-list.js`
- **역할:** 애플리케이션의 기본 보스 목록 데이터를 제공합니다.
- **주요 기능:**
    - 하드코딩된 보스 목록 텍스트를 상수로 내보냅니다.
    - `app.js`에서 URL 파라미터가 없을 때 초기 보스 목록으로 사용됩니다.
- **기본 보스 목록 제공:** URL 파라미터에 보스 목록 데이터가 없을 경우, 애플리케이션 초기 상태로 사용되는 기본 보스 목록 텍스트를 제공합니다.
- **암시적 날짜 처리:** 이 기본 목록이 사용될 경우, `boss-parser.js`는 명시적인 날짜 마커가 없으므로 현재 날짜를 기준으로 보스 일정을 파싱하며, 시간 순서에 따른 날짜 변경(자정 넘김)을 자동으로 처리합니다.

### 3.17. `src/style.css`
- **역할:** 애플리케이션의 모든 시각적 스타일을 정의합니다.
- **주요 기능:**
    - `index.html`에서 `<link>` 태그를 통해 로드되어 UI 요소의 레이아웃, 색상, 폰트 등을 제어합니다.
    - HTML 구조와 분리되어 유지보수성과 가독성을 높입니다.
- **스타일링 구조:** 애플리케이션의 시각적 표현을 담당하며, 헤더, 사이드바, 메인 콘텐츠 영역, 푸터 및 각 화면별 컴포넌트(버튼, 입력 그룹, 로그, 토글 스위치, 고정 알림, 도움말 모달 및 탭 등)에 대한 스타일을 포함합니다.
    - **주요 UI 컴포넌트 스타일:**
    - **커스텀 보스 목록 모달 스타일:**
        - `.modal`, `.modal-header`, `.modal-content`, `.modal-body`, `.close-button`: 모달의 전체적인 구조와 닫기 버튼에 대한 스타일을 정의합니다. `backdrop-filter: blur(3px)`를 통해 모달 배경에 프로스트 효과를 적용합니다.
        - `.modal-tabs`, `.tab-button`, `.tab-button.active`: 모달 내 탭 내비게이션의 레이아웃과 활성 상태 스타일을 정의합니다.
        - `.custom-list-tab-content`: 탭 내용 섹션의 기본 숨김 및 활성 시 표시 스타일을 정의합니다。
        - `.custom-list-manage-item`: "목록 관리" 탭의 각 커스텀 목록 항목에 대한 스타일을 정의합니다。 `display: flex`, `justify-content: space-between`, `align-items: center`를 사용하여 이름과 버튼 그룹이 수평으로 정렬되도록 합니다. 시각적으로는 패딩, 테두리, 배경색, 그림자 등을 포함합니다.
        - `.custom-list-manage-item .list-name`: 커스텀 목록 이름의 폰트 스타일을 정의합니다。
        - `.custom-list-manage-item .button-group`: 커스텀 목록 항목 내 '편집', '삭제' 버튼 그룹에 `display: flex`와 `gap: 8px`를 적용하여 버튼들이 수평으로 나열되고 적절한 간격을 갖도록 합니다。
    - **전체 레이아웃:** Flexbox 또는 Grid를 활용한 반응형 레이아웃.
    - **사이드바:** 접힘/펼쳐짐 상태에 따른 너비 및 콘텐츠 가시성 전환 스타일.
    - **메뉴 항목:** 활성화된 메뉴 항목 시각적 강조.
    - **알람 토글:** 알람 상태에 따른 SVG 아이콘 색상 변경.

## 4. 모듈 간 의존성

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

## 6. 결론


리뉴얼된 "보스 알리미" 애플리케이션은 메뉴 기반의 다중 화면 아키텍처를 통해 사용자 경험과 기능적 모듈화를 크게 향상시켰습니다. `app.js`를 중심으로 한 중앙 집중식 초기화 및 라우팅, 그리고 `ui-renderer.js`를 통한 화면별 렌더링은 코드의 가독성, 유지보수성 및 확장성을 더욱 높여 향후 기능 추가 및 변경에 유연하게 대응할 수 있도록 합니다。 **특히 젠 계산기 업데이트 기능의 추가와 UI/UX 개선을 통해 사용자가 기존 보스의 시간을 더욱 쉽고 정확하게 관리할 수 있도록 하였으며, 버튼 텍스트의 미세한 시각적 정렬 문제에 대한 대응 방안을 모색하여 전반적인 사용자 인터페이스의 완성도를 높였습니다。** 모바일 환경을 위한 하단 탭 바 내비게이션 도입으로 사용자 접근성을 개선했으며, 공유 링크 버그, 푸터 잘림 문제, 음소거 로그 메시지 오류 등을 수정하여 전반적인 안정성을 확보했습니다。