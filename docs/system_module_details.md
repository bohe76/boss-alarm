# 모듈별 상세 설명 (리팩토링 v4.0)

## 1. 핵심 아키텍처

리팩토링 v4.0을 통해 애플리케이션은 **중앙 오케스트레이터(`app.js`)**와 **독립적인 화면 모듈(`screens/*.js`)** 구조로 재구성되었습니다.

### 1.1. `src/app.js`
- **역할:** 애플리케이션의 **최상위 오케스트레이터**.
- **주요 기능:**
    - `initApp()`: 애플리케이션의 메인 진입점. 모든 모듈(`dom-elements`, `logger`, `data-managers`, `custom-list-manager` 및 모든 `screens` 모듈)을 초기화.
    - **전역 이벤트 처리:** 사이드바 토글, 상단/하단 내비게이션 메뉴 클릭 등 전체 애플리케이션에 영향을 미치는 이벤트를 처리.
    - **화면 전환 관리:** `showScreen(DOM, screenId)` 함수를 통해 화면을 전환. 이 함수는 화면의 가시성을 제어하고, 각 화면 모듈이 자신의 콘텐츠를 렌더링하도록 이벤트를 발생시키는 역할을 함. (예: `EventBus.emit('show-boss-scheduler-screen')`)
    - **이벤트 버스 리스너 등록:** `EventBus.on('navigate', ...)`와 같이, 화면 모듈로부터 오는 화면 전환 요청을 수신하여 처리.

### 1.2. `src/event-bus.js`
- **역할:** 모듈 간의 직접적인 종속성을 제거하기 위한 **중앙 이벤트 발행/구독(Pub/Sub) 시스템**.
- **주요 기능:**
    - `EventBus.on(event, listener)`: 특정 이벤트를 구독.
    - `EventBus.emit(event, data)`: 특정 이벤트를 발행하여, 이를 구독하는 모든 리스너를 실행.
    - 예시: `boss-scheduler.js`가 `EventBus.emit('navigate', 'boss-management-screen')`을 호출하면, `app.js`의 리스너가 이를 받아 `showScreen` 함수를 실행.

---

## 2. 화면 모듈 (`src/screens/*.js`)

각 화면의 UI 이벤트 핸들러와 뷰(View) 관련 로직을 캡슐화하는 독립적인 모듈 그룹입니다.

### 2.1. `dashboard.js`
- **역할:** 대시보드 화면의 모든 로직을 담당.
- **주요 기능:**
    - 음소거 버튼 이벤트 리스너.
    - `EventBus`의 `refresh-dashboard` 이벤트를 구독하여, `renderDashboard` (from `ui-renderer.js`)를 호출함으로써 '다음 보스', '다가오는 보스 목록' 등 대시보드 UI를 주기적으로 갱신.

### 2.2. `boss-management.js`
- **역할:** 보스 관리 화면의 로직을 담당.
- **주요 기능:**
    - '시간순 정렬' 버튼 이벤트 리스너.
    - 보스 목록 텍스트 영역의 `input` 이벤트를 감지하여 실시간으로 보스 목록을 파싱.

### 2.3. `calculator.js`
- **역할:** 계산기 화면('젠 계산기', '광 계산기')의 모든 로직을 담당.
- **주요 기능:**
    - 젠 계산기: 남은 시간 입력에 따른 보스 출현 시간 실시간 계산 및 '보스 시간 업데이트' 기능.
    - 광 계산기: '시작', '광', '잡힘' 버튼 이벤트 처리 및 결과 저장.

### 2.4. `boss-scheduler.js`
- **역할:** 보스 스케줄러 화면의 로직을 담당.
- **주요 기능:**
    - 게임 선택 드롭다운, 남은 시간 입력, '설정 적용' 버튼 이벤트 처리.
    - 화면 표시(`show-boss-scheduler-screen`), 재렌더링(`rerender-boss-scheduler`) 이벤트를 `EventBus`에서 구독.
    - 화면 전환이 필요할 때 `EventBus.emit('navigate', ...)` 호출.

### 2.5. `notifications.js`
- **역할:** 알림 설정 화면의 로직을 담당.
- **주요 기능:**
    - 고정 알림 목록의 '편집', '삭제', '활성화 토글' 이벤트 처리.

### 2.6. `custom-list.js`
- **역할:** 커스텀 보스 목록 관리 모달의 모든 로직을 담당.
- **주요 기능:**
    - 모달 열기/닫기, 탭 전환, 목록 추가/수정/삭제 이벤트 처리.

### 2.7. `share.js`, `help.js`, `version-info.js`, `alarm-log.js`
- **역할:** 각각의 단일 기능 화면('공유', '도움말', '릴리즈 노트', '알림 로그')의 초기화 로직을 담당.
- **주요 기능:** 화면이 표시될 때 해당 화면에 필요한 콘텐츠를 로드하거나 렌더링.

---

## 3. 핵심 로직 및 유틸리티 모듈

### 3.1. `src/ui-renderer.js`
- **역할:** UI 컴포넌트 렌더링 담당.
- **주요 기능:** 각 화면 모듈의 요청에 따라 실제 DOM을 생성하고 업데이트. (예: `renderDashboard`, `renderFixedAlarms`, `populateBossSelectionDropdown`)

### 3.2. `src/alarm-scheduler.js`
- **역할:** 보스 알림 타이머 관리 및 알림 트리거.
- **주요 기능:**
    - `startAlarm`, `stopAlarm`: 알람 루프(`setInterval`)를 시작/중지.
    - `checkAlarms`: 매초 실행되며 알람 조건을 확인하고 알림(음성/로그)을 발생시킴.
    - `EventBus.emit('refresh-dashboard', ...)`: 매초 대시보드 갱신을 요청.

### 3.3. `src/data-managers.js`
- **역할:** 데이터 관리.
- **주요 기능:**
    - `BossDataManager`: 동적 보스 일정 데이터 관리.
    - `LocalStorageManager`: `localStorage`에 저장되는 모든 설정(고정 알림, 음소거, 사이드바 상태 등) 관리.

### 3.4. `src/boss-parser.js`
- **역할:** 사용자 입력을 파싱하여 보스 일정 생성.
- **주요 기능:**
    - `parseBossList`: 텍스트 영역의 문자열을 파싱하여 유효한 보스 일정 배열을 생성하고 `BossDataManager`에 저장.
    - `getSortedBossListText`: 텍스트 영역의 내용을 시간순으로 정렬.

### 3.5. `src/utils.js`
- **역할:** 재사용 가능한 순수 헬퍼 함수 라이브러리.
- **주요 기능:** 시간 포맷팅(`formatTime`), 유효성 검사(`validateFixedAlarmTime`), 고유 ID 생성(`generateUniqueId`) 등.

### 3.6. 기타 모듈
- **`dom-elements.js`**: DOM 요소 참조 캡슐화.
- **`logger.js`**: 로그 UI 관리.
- **`speech.js`**: 음성 알림 관리.
- **`api-service.js`**: 외부 API(TinyURL) 통신.
- **`boss-scheduler-data.js`**: `data/boss_lists.json` 파일 로드 및 관리.
- **`calculator.js`**, **`light-calculator.js`**: 각각 젠 계산기, 광 계산기의 핵심 계산 로직.
- **`default-boss-list.js`**: 기본 보스 목록 데이터.
