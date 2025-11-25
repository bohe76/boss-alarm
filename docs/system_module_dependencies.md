# 모듈 간 의존성 (리팩토링 v4.0)

리팩토링 v4.0 아키텍처의 주요 의존성 관계는 다음과 같습니다. 가장 큰 특징은 화면별 로직을 담당하는 `screens/*.js` 모듈들이 더 이상 `app.js`에 직접 의존하지 않고, `EventBus`를 통해 통신한다는 점입니다.

## 1. 최상위 오케스트레이터

### `src/app.js`
- `app.js`는 애플리케이션의 메인 진입점으로서, 거의 모든 모듈을 **직접 또는 간접적으로 호출**하고 초기화합니다.
- **주요 의존성:**
    - `dom-elements.js`: 모든 DOM 요소 참조를 가져옴.
    - `logger.js`: 로거 초기화.
    - `data-managers.js`: `LocalStorageManager` 초기화.
    - `boss-parser.js`: 초기 보스 목록 파싱.
    - `alarm-scheduler.js`: 알람 시작/중지 기능.
    - `event-bus.js`: 전역 이벤트 버스.
    - `src/screens/*.js` (모든 화면 모듈): 각 화면의 `init...Screen()` 함수를 호출하여 이벤트 리스너를 등록.

## 2. 화면 모듈 그룹

### `src/screens/*.js`
- 각 화면 모듈은 **독립적으로** 필요한 모듈을 가져와 사용하며, 다른 모듈과의 통신이 필요할 경우 `EventBus`를 사용합니다.
- **공통 의존성:**
    - `ui-renderer.js`: 자신의 화면을 그리거나 업데이트하기 위해.
    - `data-managers.js`: 상태를 조회하거나 변경하기 위해.
    - `event-bus.js`: 다른 모듈(주로 `app.js`)에 화면 전환 등을 요청하기 위해.
    - `utils.js`: 필요한 유틸리티 함수 사용.
- **예시 (`boss-scheduler.js`):**
    - `ui-renderer.js` (게임별 보스 입력 필드 렌더링)
    - `calculator.js` (젠 시간 계산)
    - `logger.js` (로그 기록)
    - `event-bus.js` ('보스 설정 적용' 시 화면 전환 요청)

## 3. 핵심 로직 모듈

### `src/alarm-scheduler.js`
- `logger.js`, `speech.js`: 알림(로그/음성) 발생.
- `data-managers.js`: 보스 목록 및 고정 알림 데이터를 가져와 알람 조건 확인.
- `ui-renderer.js`: `renderAlarmStatusSummary`를 호출하여 알람 상태 UI 업데이트.
- `event-bus.js`: `refresh-dashboard` 이벤트를 매초 발생시켜 대시보드 UI 갱신 요청.

### `src/ui-renderer.js`
- **다수 모듈에 의존**: UI를 그리는 데 필요한 데이터를 얻기 위해 여러 모듈에 의존합니다.
- **주요 의존성:**
    - `data-managers.js`
    - `alarm-scheduler.js`
    - `logger.js`
    - `custom-list-manager.js`
    - `boss-scheduler-data.js`
    - `utils.js`

### `src/custom-list-manager.js`
- `data-managers.js`: `LocalStorageManager`를 통해 커스텀 목록을 영구 저장.
- `logger.js`: 로그 기록.
- `boss-scheduler-data.js`: 미리 정의된 게임 이름과 중복되는 것을 방지하기 위해.

## 4. 의존성 흐름 요약

```
[UI 이벤트 (e.g., 클릭)]
       |
       v
[src/screens/*.js] (이벤트 핸들러)
       |
       +-----> [ui-renderer.js] (UI 즉시 업데이트)
       |
       +-----> [data-managers.js] (상태 변경)
       |
       +-----> [EventBus] (다른 모듈에 알림/요청)
                  |
                  v
       [src/app.js] or [다른 screen 모듈] (이벤트 구독 및 처리)
```

- **단방향 데이터 흐름:** 사용자 입력은 `screens` 모듈에서 시작되어 `data-managers`의 상태를 변경하고, 변경된 상태는 `ui-renderer`를 통해 다시 UI에 반영됩니다.
- **결합도 감소:** `EventBus`의 도입으로 `screens` 모듈들은 서로 또는 `app.js`를 직접 알 필요 없이 상호작용할 수 있게 되어 유지보수성과 확장성이 향상되었습니다.