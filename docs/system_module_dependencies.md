# 모듈 간 의존성 (API 명세서 수준)

리팩토링 v4.0 아키텍처의 주요 의존성 관계는 **`app.js`가 각 화면 모듈을 초기화**하고, **각 화면 모듈은 필요한 서비스와 UI 모듈에 독립적으로 의존**하며, **`EventBus`를 통해 서로 통신**하는 구조입니다.

## 1. `src/app.js` (최상위 오케스트레이터)

- `app.js`는 애플리케이션의 메인 진입점으로서, 거의 모든 모듈의 `init` 또는 주요 함수를 호출하여 의존성을 주입하고 전체 애플리케이션을 동작시킵니다.

| `app.js`가 의존하는 모듈 | 호출하는 주요 함수 / 구독하는 이벤트 |
| --- | --- |
| `dom-elements.js` | `initDomElements()` |
| `logger.js` | `initLogger()`, `log()` |
| `data-managers.js` | `LocalStorageManager.init()`, `LocalStorageManager.setSidebarExpandedState()`, `LocalStorageManager.getIsAlarmRunning()` 등 |
| `custom-list-manager.js`| `CustomListManager.init()` |
| `boss-parser.js` | `parseBossList()` |
| `alarm-scheduler.js` | `startAlarm()`, `stopAlarm()`, `getIsAlarmRunning()` |
| `event-bus.js` | `EventBus.on('navigate', ...)` (구독), `EventBus.emit(...)` (발행) |
| `ui-renderer.js`| `renderFixedAlarms()`, `renderAlarmStatusSummary()` |
| `screens/*.js` | `init...Screen()` (모든 화면 모듈의 초기화 함수) |

## 2. `src/screens/*.js` (화면 모듈 그룹)

- 각 화면 모듈은 `app.js`에 의해 초기화된 후, 필요한 모듈을 직접 `import`하여 독립적으로 동작합니다.

| 화면 모듈 | 의존하는 모듈 | 호출하는 함수 / 발행하는 이벤트 |
| --- | --- | --- |
| **`dashboard.js`** | `ui-renderer.js` <br> `data-managers.js` <br> `logger.js` <br> `event-bus.js` | `renderDashboard()`, `updateMuteButtonVisuals()` <br> `LocalStorageManager.get/setMuteState()` <br> `log()` <br> `EventBus.on('refresh-dashboard', ...)` |
| **`boss-management.js`**| `boss-parser.js` <br> `logger.js` <br> `ui-renderer.js` | `getSortedBossListText()`, `parseBossList()` <br> `log()` <br> `renderDashboard()` |
| **`calculator.js`** | `calculator.js`(core) <br> `light-calculator.js` <br> `data-managers.js` <br> `ui-renderer.js` | `calculateBossAppearanceTime()` <br> `LightCalculator.*` <br> `BossDataManager.get/set...` <br> 다수의 UI 함수 (`showToast`, `populate...Dropdown` 등) |
| **`boss-scheduler.js`**| `ui-renderer.js` <br> `calculator.js` <br> `logger.js` <br> `boss-parser.js` <br> `event-bus.js` | `renderBossInputs()`, `renderDashboard()` <br> `calculateBossAppearanceTime()` <br> `log()` <br> `parseBossList()` <br> `EventBus.emit('navigate', ...)` |

| **`custom-list.js`** | `ui-renderer.js` <br> `custom-list-manager.js` <br> `event-bus.js` | `showCustomListTab()`, `render...ModalContent()`, `showToast()` <br> `CustomListManager.*` <br> `EventBus.emit('rerender-boss-scheduler')` |
| **`share.js`** | `api-service.js` <br> `data-managers.js` <br> `logger.js` | `getShortUrl()` <br> `LocalStorageManager.exportFixedAlarms()` <br> `log()` |
| **`help.js`** | `api-service.js` | `loadJsonContent()` |
| **`version-info.js`**| `ui-renderer.js` | `renderVersionInfo()` |
| **`alarm-log.js`**| `logger.js` | `getLogs()` |

## 3. 핵심 로직 및 서비스 모듈

| 서비스 모듈 | 의존하는 모듈 | 목적 |
| --- | --- | --- |
| **`alarm-scheduler.js`** | `logger.js`, `speech.js`, `data-managers.js`, `ui-renderer.js`, `event-bus.js` | 알림 조건 확인, 알림 발생(`log`, `speak`), 대시보드 갱신 요청(`emit`) |
| **`ui-renderer.js`** | `data-managers.js`, `alarm-scheduler.js`, `logger.js`, `api-service.js`, `custom-list-manager.js`, `boss-scheduler-data.js`, `utils.js` | UI 렌더링에 필요한 각종 데이터 조회 (`get...` 함수들) |
| **`custom-list-manager.js`** | `data-managers.js`, `logger.js`, `boss-scheduler-data.js` | 커스텀 목록 영구 저장, 유효성 검사 시 미리 정의된 게임 이름 조회 |
| **`boss-parser.js`** | `logger.js`, `data-managers.js`, `utils.js` | 파싱된 보스 목록을 `BossDataManager`에 저장, 고유 ID 생성 |
| **`boss-scheduler-data.js`** | `logger.js`, `custom-list-manager.js` | 기본 보스 목록과 커스텀 목록을 조합하여 전체 게임/목록 제공 |
| **`speech.js`** | `data-managers.js` | 음소거 상태(`getMuteState`) 확인 |
| **`light-calculator.js`**| `data-managers.js`, `logger.js`, `utils.js` | 광 계산 기록 저장 및 로드 |

## 4. 의존성 흐름도 (EventBus 중심)

```
[UI 이벤트 (e.g., 클릭)]
       |
       v
[screens/*.js] (이벤트 핸들러)
       |
       +-----> [ui-renderer.js] (UI 즉시 업데이트)
       |
       +-----> [data-managers.js] (상태 변경)
       |
       +-----> [EventBus] --(발행)--> (다른 모듈에 알림/요청)
                                          |
                                          v (구독)
       [app.js] or [다른 screen/*.js] or [alarm-scheduler.js] (이벤트에 따른 동작 수행)
```
- **상위 -> 하위 단방향 흐름:** `app.js` -> `screens/*.js` -> `(ui-renderer.js | data-managers.js | ...)` 형태의 단방향 의존성 흐름이 지향됩니다.
- **느슨한 결합:** `EventBus`가 모듈 간의 수평적 통신을 담당하여, 모듈 간의 직접적인 import/호출 관계를 최소화합니다.
