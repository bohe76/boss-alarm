# 모듈 간 의존성 (v2.0 - 리팩토링 후)

본 아키텍처의 주요 의존성 관계는 **`app.js`가 애플리케이션의 핵심 모듈과 전역 이벤트를 초기화**하며 시작됩니다. 각 화면(`src/screens/*.js`) 모듈은 필요한 서비스와 UI 모듈에 독립적으로 의존하며, **`EventBus`를 통해 서로 통신**하는 구조를 가집니다.

## 1. `src/app.js` (애플리케이션 최상위 오케스트레이터)

- 애플리케이션의 가장 첫 번째 진입점입니다. 핵심 서비스 초기화, 라우터 설정, 초기 데이터 로딩, 전역 이벤트 리스너 등록, 화면 전환 관리, 그리고 대시보드와 같은 동적 콘텐츠의 주기적/반응적 갱신을 담당합니다.

| `app.js`가 의존하는 모듈 | 호출하는 주요 함수 / 목적 |
|---|---|
| `dom-elements.js` | `initDomElements()`: 모든 DOM 요소 참조 초기화 |

| `router.js` | `registerAllRoutes()`, `getRoute()`: 화면 모듈 등록 및 검색 |
| `global-event-listeners.js` | `initGlobalEventListeners()`: 중앙화된 전역 이벤트 리스너 초기화 |
| `data-managers.js` | `LocalStorageManager.*`, `BossDataManager.*`: 데이터 로딩 및 관리 |
| `boss-parser.js` | `parseBossList()`: 보스 목록 텍스트 파싱 (초기 로드 시) |
| `ui-renderer.js` | `renderFixedAlarms()`, `renderAlarmStatusSummary()`, `renderDashboard()`, `updateBossListTextarea()`: UI 초기 렌더링 및 갱신 |
| `event-bus.js` | `EventBus.on('navigate', ...)`: 화면 전환 이벤트 구독 |
| `alarm-scheduler.js` | `getIsAlarmRunning()`, `startAlarm()`: 알람 상태 확인 및 시작 |
| `utils.js` | `formatMonthDay()`: 날짜 포맷팅 (loadInitialData 내부) |
| `default-boss-list.js` | `bossPresets`: 기본 보스 목록 로딩 (loadInitialData 내부) |
| `screens/*.js` | `getScreen()`: 각 화면의 메타 정보 가져오기 |

## 2. `src/global-event-listeners.js` (전역 EventBus 리스너 관리)

- 애플리케이션 생명주기 내내 활성화되어야 하는 핵심적인 전역 `EventBus` 리스너들을 한곳에서 관리합니다. `BossDataManager`의 상태 변경 시 대시보드를 갱신하거나, `logger.js`에서 로그 발생 시 알림 로그 화면을 갱신하는 등의 역할을 수행합니다.

| `global-event-listeners.js`가 의존하는 모듈 | 호출하는 주요 함수 / 목적 |
|---|---|
| `event-bus.js` | `EventBus.on()`: EventBus 구독 |
| `data-managers.js` | `BossDataManager.subscribe()`: 보스 데이터 변경 구독 |
| `ui-renderer.js` | `renderDashboard()`: 대시보드 UI 갱신 |
| `screens/alarm-log.js` | `renderAlarmLog()`: 알림 로그 화면 UI 갱신 |

## 3. `src/screens/*.js` (화면별 UI 및 이벤트 핸들러)

- 각 화면 모듈은 자신의 UI 상호작용에 대한 이벤트 핸들러를 등록하고, 필요한 경우 데이터를 로드하며, `ui-renderer.js`를 통해 UI를 렌더링합니다. `init()` 또는 `onTransition()` 함수를 통해 초기화됩니다.

| 화면 모듈 | 의존하는 모듈 | 호출하는 함수 / 발행하는 이벤트 |
|---|---|---|
| **`alarm-log.js`** | `logger.js`, `data-managers.js`, `ui-renderer.js` | `getLogs()`, `renderAlarmLog()` (조건부 렌더링), `LocalStorageManager.get/set()` |
| **`boss-management.js`**| `boss-parser.js`, `ui-renderer.js`, `data-managers.js`, `logger.js` | `parseBossList()`(결과 반환), `updateBossListTextarea()`, `BossDataManager.setBossSchedule()`, `log()` |
| **`calculator.js`** | `calculator.js`, `light-calculator.js`, `data-managers.js`, `ui-renderer.js`, `utils.js`, `logger.js` | `initCalculatorScreen()`, `handleCalculatorScreenTransition()`, `calculateAppearanceTimeFromMinutes()`, `LightCalculator.*`, `LocalStorageManager.*`, `BossDataManager.*`, `showToast()`, `log()` |
| **`boss-scheduler.js`**| `ui-renderer.js`, `calculator.js`, `logger.js`, `event-bus.js`, `data-managers.js`, `utils.js` | `renderBossSchedulerScreen()`, `handleApplyBossSettings()`, `calculateBossAppearanceTime()`, `log()`, `EventBus.emit()`, `BossDataManager.setBossSchedule()`, `generateUniqueId()`, `padNumber()` |
| **`custom-list.js`** | `ui-renderer.js`, `custom-list-manager.js`, `event-bus.js` | `showCustomListTab()`, `renderCustomListManagementModalContent()`, `showToast()`, `CustomListManager.*`, `EventBus.emit('rerender-boss-scheduler')` |
| **`dashboard.js`** | `ui-renderer.js`, `data-managers.js`, `logger.js`, `event-bus.js` | `updateMuteButtonVisuals()`, `renderRecentAlarmLog()`, `LocalStorageManager.get/setMuteState()`, `log()`, `EventBus.on('log-updated', ...)` (최근 로그 표시용) |
| **`help.js`** | `api-service.js`, `ui-renderer.js` | `loadJsonContent()` (from `data/` folder), `renderHelpScreen()`, `renderFaqScreen()` |
| **`notifications.js`** | `data-managers.js`, `ui-renderer.js`, `utils.js`, `logger.js` | `LocalStorageManager.*`, `renderFixedAlarms()`, `updateFixedAlarmVisuals()`, `validateFixedAlarmTime()`, `normalizeTimeFormat()`, `log()` |
| **`share.js`** | `api-service.js`, `logger.js` | `getShortUrl()`, `log()` |
| **`version-info.js`**| `api-service.js`, `ui-renderer.js` | `loadJsonContent()`, `renderVersionInfo()` |

## 4. 핵심 로직 및 서비스 모듈 (간접 의존성 포함)

| 모듈 | 주요 의존성 (간접적일 수 있음) | 목적 |
| --- | --- | --- |
| **`alarm-scheduler.js`** | `logger.js`, `speech.js`, `data-managers.js`, `ui-renderer.js` | 알림 조건 확인, 알림 발생(`log`, `speak`), 데이터 관리자 상태 업데이트, UI 갱신 |
| **`ui-renderer.js`** | `data-managers.js`, `alarm-scheduler.js`, `logger.js`, `custom-list-manager.js`, `boss-scheduler-data.js`, `utils.js` | UI 렌더링에 필요한 각종 데이터 조회 및 효율적인 DOM 조작 |
| **`BossDataManager`** | `LocalStorageManager.js` | `getUpcomingBosses` 함수 내에서 고정 알림 데이터를 가져오기 위해 사용됩니다. |
| **`custom-list-manager.js`** | `data-managers.js`, `logger.js`, `boss-scheduler-data.js` | 커스텀 목록 영구 저장, 유효성 검사, 미리 정의된 게임 이름 조회 |
| **`boss-parser.js`** | `logger.js`, `data-managers.js`, `utils.js` | 보스 목록 텍스트 파싱, 기존 데이터 병합, `BossDataManager` 상태 변경, 로깅 |
| **`global-event-listeners.js`** | `event-bus.js`, `data-managers.js`, `ui-renderer.js`, `screens/alarm-log.js` | 전역 EventBus 리스너를 정의하고, `BossDataManager`의 데이터 변경 및 `log-updated` 이벤트에 반응합니다. |
| **`boss-scheduler-data.js`** | `logger.js`, `custom-list-manager.js` | 기본 보스 목록 로딩, 커스텀 목록과 조합하여 게임/목록 제공 |
| **`speech.js`** | `data-managers.js` | 음소거 상태(`getMuteState`) 확인 |
| **`light-calculator.js`**| `data-managers.js`, `logger.js` | 광 계산 기록 저장 및 로드 |
| **`calculator.js`** | 없음 | 시간 계산 로직 제공 |
| **`logger.js`** | `event-bus.js` | `EventBus.emit()`을 통해 로그 업데이트 이벤트 발행 |
| **`router.js`** | 없음 | 화면 라우팅 시스템 제공 |
| **`event-bus.js`** | 없음 | 모듈 간 이벤트 통신 제공 |
| **`services.js`** | `logger.js`, `boss-scheduler-data.js`, `data-managers.js`, `custom-list-manager.js` | 핵심 애플리케이션 서비스 초기화 및 외부 리소스 로드 |
| **`utils.js`** | `logger.js` | 유효성 검사 시 로깅 |
| **`default-boss-list.js`** | 없음 | 기본 보스 데이터 제공 |