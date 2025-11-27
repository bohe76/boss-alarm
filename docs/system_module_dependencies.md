# 모듈 간 의존성 (API 명세서 수준)

본 아키텍처의 주요 의존성 관계는 **`app.js`가 `event-handlers.js`의 `initApp` 함수를 호출**하여 시작되며, **`initApp` 함수는 애플리케이션의 핵심 모듈과 전역 이벤트를 초기화**합니다. 각 화면(`screens/*.js`) 모듈은 필요한 서비스와 UI 모듈에 독립적으로 의존하며, **`EventBus`를 통해 서로 통신**하는 구조를 가집니다.

## 1. `src/app.js` (최상위 진입점)

- 애플리케이션의 가장 첫 번째 진입점입니다. `event-handlers.js`의 `initApp` 함수를 `import`하여 호출하는 단일 책임을 가집니다.

| `app.js`가 의존하는 모듈 | 호출하는 주요 함수 |
| --- | --- |
| `event-handlers.js` | `initApp()` |

## 2. `src/event-handlers.js` (애플리케이션 오케스트레이터)

- `initApp` 함수를 통해 애플리케이션의 전반적인 초기화, 전역 이벤트 핸들러 등록, 화면 전환 로직(`showScreen`)을 담당합니다.
- `initEventHandlers` 함수는 '알람 시작/중지', '음소거' 등과 같은 전역 UI 요소의 이벤트 리스너를 등록하고, 각 화면 모듈의 초기화 함수를 호출하여 이벤트 처리를 위임합니다.
- `showScreen` 함수는 메뉴 클릭 등으로 `navigate` 이벤트가 발생했을 때 호출되며, 화면을 전환하고 해당 화면에 필요한 초기화 스크립트를 **지연 실행(lazy execution)**하는 중요한 역할을 합니다.

| `event-handlers.js`가 의존하는 모듈 | 호출하는 주요 함수 / 목적 |
| --- | --- |
| `dom-elements.js` | `initDomElements()`: 모든 DOM 요소 참조 초기화 |
| `logger.js` | `initLogger()`, `log()`: 로거 초기화 및 로그 기록 |
| `data-managers.js` | `LocalStorageManager.*`, `BossDataManager.*`: 데이터 관리자 초기화 및 사용 |
| `custom-list-manager.js`| `CustomListManager.init()`: 커스텀 목록 관리자 초기화 |
| `boss-parser.js` | `parseBossList()`: 보스 목록 파싱 |
| `alarm-scheduler.js` | `startAlarm()`, `stopAlarm()` 등: 알람 스케줄러 제어 |
| `event-bus.js` | `EventBus.on('navigate', ...)`: 화면 전환 이벤트 구독 |
| `global-event-listeners.js` | `initGlobalEventListeners()`: 전역 EventBus 리스너 등록 |
| `screens/*.js` | `init...Screen()`: 각 화면의 이벤트 핸들러 초기화 위임 (아래 표 참조) |

## 3. `src/screens/*.js` (화면별 UI 및 이벤트 핸들러)

- 각 화면 모듈은 자신의 UI 상호작용에 대한 이벤트 핸들러를 등록하는 `init...Screen()` 함수를 `export` 합니다.
- 이 함수들은 `event-handlers.js`의 `initEventHandlers` 또는 `showScreen` 함수에서 호출되어, 각 화면의 로직이 필요한 시점에 초기화됩니다.

| 화면 모듈 | 의존하는 모듈 | 호출하는 함수 / 발행하는 이벤트 |
| --- | --- | --- |
| **`dashboard.js`** | `ui-renderer.js` <br> `data-managers.js` <br> `logger.js` | `updateMuteButtonVisuals()` <br> `LocalStorageManager.get/setMuteState()` <br> `log()` |
| **`boss-management.js`**| `boss-parser.js` <br> `logger.js` <br> `ui-renderer.js` | `getSortedBossListText()`, `parseBossList()` <br> `log()` <br> `renderDashboard()` |
| **`calculator.js`** | `calculator.js`(core) <br> `light-calculator.js` <br> `data-managers.js` <br> `ui-renderer.js` <br> `utils.js` <br> `logger.js` <br> `boss-parser.js` | `calculateBossAppearanceTime()`, `LightCalculator.*`, `BossDataManager.get/set...`, 다수의 UI 렌더링 함수 |
| **`boss-scheduler.js`**| `ui-renderer.js` <br> `calculator.js` <br> `logger.js` <br> `boss-parser.js` <br> `event-bus.js` | `renderBossInputs()`, `renderDashboard()`, `calculateBossAppearanceTime()`, `log()`, `parseBossList()`, `EventBus.emit('navigate', ...)` |
| **`custom-list.js`** | `ui-renderer.js` <br> `custom-list-manager.js` <br> `event-bus.js` | `showCustomListTab()`, `render...ModalContent()`, `showToast()`, `CustomListManager.*`, `EventBus.emit('rerender-boss-scheduler')` |
| **`notifications.js`** | `data-managers.js` <br> `ui-renderer.js` <br> `utils.js` <br> `logger.js` | `LocalStorageManager.*`, `renderFixedAlarms()`, `updateFixedAlarmVisuals()`, `validateFixedAlarmTime()` |
| **`share.js`** | `api-service.js` <br> `data-managers.js` <br> `logger.js` | `getShortUrl()` <br> `LocalStorageManager.exportFixedAlarms()` <br> `log()` |
| **`help.js`** | `api-service.js` | `loadJsonContent()` |
| **`version-info.js`**| `ui-renderer.js` | `renderVersionInfo()` |
| **`alarm-log.js`**| `logger.js` | `getLogs()` |

## 3.1. `src/global-event-listeners.js` (전역 EventBus 리스너 관리)

| 모듈 | 의존하는 모듈 | 목적 |
| --- | --- | --- |
| **`global-event-listeners.js`** | `event-bus.js` <br> `ui-renderer.js` <br> `screens/alarm-log.js` | 전역 EventBus 리스너 등록 |

## 4. 핵심 로직 및 서비스 모듈

| 서비스 모듈 | 의존하는 모듈 | 목적 |
| --- | --- | --- |
| **`alarm-scheduler.js`** | `logger.js`, `speech.js`, `data-managers.js`, `event-bus.js` | 알림 조건 확인, 알림 발생(`log`, `speak`), 대시보드 갱신 요청(`emit`) |
| **`ui-renderer.js`** | `data-managers.js`, `alarm-scheduler.js` (for `getIsAlarmRunning`), `logger.js`, `api-service.js`, `custom-list-manager.js`, `boss-scheduler-data.js`, `utils.js` | UI 렌더링에 필요한 각종 데이터 조회 및 효율적인 DOM 조작 |
| **`custom-list-manager.js`** | `data-managers.js`, `logger.js`, `boss-scheduler-data.js` | 커스텀 목록 영구 저장, 유효성 검사 시 미리 정의된 게임 이름 조회 |
| **`boss-parser.js`** | `logger.js`, `data-managers.js`, `utils.js` | 파싱된 보스 목록을 `BossDataManager`에 저장, 고유 ID 생성 |
| **`boss-scheduler-data.js`** | `logger.js`, `custom-list-manager.js` | 기본 보스 목록과 커스텀 목록을 조합하여 전체 게임/목록 제공 |
| **`speech.js`** | `data-managers.js` | 음소거 상태(`getMuteState`) 확인 |
| **`light-calculator.js`**| `data-managers.js`, `logger.js`, `utils.js` | 광 계산 기록 저장 및 로드 |

## 5. 의존성 흐름도 (EventBus 중심)

```
[UI 이벤트 (e.g., 클릭)]
       |
       v (initApp 또는 showScreen을 통해)
[screens/*.js] (이벤트 핸들러)
       |
       +-----> [ui-renderer.js] (UI 즉시 업데이트)
       |
       +-----> [data-managers.js] (상태 변경)
       |
       +-----> [EventBus] --(발행)--> [global-event-listeners.js] (전역 리스너 처리)
                                          |
                                          v (구독)
       [event-handlers.js] or [다른 screen/*.js] or [alarm-scheduler.js] (이벤트에 따른 동작 수행)
```
- **상위 -> 하위 단방향 흐름:** `event-handlers.js` (`initApp`) -> `global-event-listeners.js` -> `screens/*.js` -> `(ui-renderer.js | data-managers.js | ...)` 형태의 단방향 의존성 흐름이 지향됩니다.
- **느슨한 결합:** `EventBus`가 모듈 간의 수평적 통신을 담당하여, 모듈 간의 직접적인 import/호출 관계를 최소화합니다.
