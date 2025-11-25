# 모듈 간 의존성 (리팩토링 v4.0 - 상세)

리팩토링 v4.0 아키텍처의 주요 의존성 관계는 **`app.js`가 각 화면 모듈을 초기화**하고, **각 화면 모듈은 필요한 서비스와 UI 모듈에 독립적으로 의존**하며, **`EventBus`를 통해 서로 통신**하는 구조입니다.

## 1. `src/app.js` (최상위 오케스트레이터)

- `app.js`는 애플리케이션의 메인 진입점으로서, 거의 모든 모듈의 `init` 또는 주요 함수를 호출합니다.

| `app.js`가 의존하는 모듈 | 호출하는 주요 함수 | 목적 |
| --- | --- | --- |
| `dom-elements.js` | `initDomElements()` | DOM 요소 참조 객체 생성 |
| `logger.js` | `initLogger()` | 로거 초기화 |
| `data-managers.js` | `LocalStorageManager.init()` | 로컬 스토리지 데이터 로드 |
| `custom-list-manager.js`| `CustomListManager.init()` | 커스텀 목록 데이터 로드 |
| `boss-parser.js` | `parseBossList()` | 초기 보스 목록 파싱 |
| `alarm-scheduler.js` | `startAlarm()`, `stopAlarm()`, `getIsAlarmRunning()` | 알람 제어 |
| `event-bus.js` | `EventBus.on()`, `EventBus.emit()` | 전역 이벤트 시스템 |
| `ui-renderer.js`| `renderFixedAlarms()`, `renderAlarmStatusSummary()` | 초기 UI 렌더링 |
| `screens/*.js` | `init...Screen()` (모든 화면 모듈) | 각 화면의 이벤트 리스너 등록 |

## 2. `src/screens/*.js` (화면 모듈 그룹)

- 각 화면 모듈은 `app.js`의 `initEventHandlers`에 의해 `init...Screen(DOM)` 함수가 한 번만 호출됩니다. 그 후, 필요한 모듈을 직접 `import`하여 독립적으로 동작합니다.

| 화면 모듈 (`screens/*`) | 의존하는 모듈 | 목적 |
| --- | --- | --- |
| **`dashboard.js`** | `ui-renderer.js`, `data-managers.js`, `logger.js`, `event-bus.js` | 대시보드 UI 갱신, 음소거 상태 관리 |
| **`boss-management.js`**| `boss-parser.js`, `logger.js`, `ui-renderer.js` | 보스 목록 정렬 및 실시간 파싱 |
| **`calculator.js`** | `calculator.js` (core), `light-calculator.js`, `data-managers.js`, `boss-parser.js`, `ui-renderer.js`, `utils.js`, `logger.js` | 젠/광 계산기 로직 및 UI 처리 |
| **`boss-scheduler.js`**| `ui-renderer.js`, `calculator.js`, `logger.js`, `boss-parser.js`, `event-bus.js` | 보스 스케줄러 UI 및 로직 처리, 화면 전환 요청 |
| **`notifications.js`**| `data-managers.js`, `ui-renderer.js`, `utils.js`, `logger.js` | 고정 알림 CRUD 로직 처리 |
| **`custom-list.js`** | `ui-renderer.js`, `custom-list-manager.js`, `event-bus.js` | 커스텀 목록 CRUD 로직 처리, 다른 모듈에 갱신 요청 |
| **`share.js`** | `api-service.js`, `data-managers.js`, `logger.js` | URL 단축 및 클립보드 복사 |
| **`help.js`** | `api-service.js` | 도움말 JSON 파일 로드 |
| **`version-info.js`**| `ui-renderer.js` | 버전 정보 렌더링 |
| **`alarm-log.js`**| `logger.js` | 로그 데이터 조회 및 표시 |

## 3. 핵심 로직 및 서비스 모듈

| 서비스 모듈 | 의존하는 모듈 | 목적 |
| --- | --- | --- |
| **`alarm-scheduler.js`** | `logger.js`, `speech.js`, `data-managers.js`, `ui-renderer.js`, `event-bus.js` | 알림 조건 확인, 알림 발생, 대시보드 갱신 요청 |
| **`ui-renderer.js`** | `data-managers.js`, `alarm-scheduler.js`, `logger.js`, `api-service.js`, `custom-list-manager.js`, `boss-scheduler-data.js`, `utils.js` | UI 렌더링에 필요한 각종 데이터 조회 |
| **`custom-list-manager.js`** | `data-managers.js`, `logger.js`, `boss-scheduler-data.js` | 커스텀 목록 영구 저장, 유효성 검사 |
| **`boss-parser.js`** | `logger.js`, `data-managers.js`, `utils.js` | 파싱된 보스 목록을 `BossDataManager`에 저장 |
| **`boss-scheduler-data.js`** | `logger.js`, `custom-list-manager.js` | 기본 보스 목록과 커스텀 목록을 조합 |
| **`speech.js`** | `data-managers.js` | 음소거 상태 확인 |
| **`light-calculator.js`**| `data-managers.js`, `logger.js`, `utils.js` | 광 계산 기록 저장 및 로드 |

## 4. 의존성 흐름도 (요약)

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
       +-----> [event-bus.js] (다른 모듈에 알림/요청)
                  |
                  v
       [app.js] or [다른 screen/*.js] or [alarm-scheduler.js] (이벤트 구독 및 처리)
```

- **상위 -> 하위 단방향 흐름:** `app.js` -> `screens/*.js` -> `(ui-renderer.js | data-managers.js | ...)` 형태의 단방향 의존성 흐름이 지향됩니다.
- **느슨한 결합:** `EventBus`가 모듈 간의 수평적 통신을 담당하여, 모듈 간의 직접적인 import/호출 관계를 최소화합니다.
