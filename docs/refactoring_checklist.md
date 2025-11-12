# 오딘 보스 알리미 리팩토링 체크리스트

## 리팩토링 제안 (단계별 접근)

본 리팩토링은 점진적으로 진행하는 것이 안전하며, 각 단계마다 기능이 정상 작동하는지 확인해야 합니다.

### 1단계: DOM 요소 및 전역 변수 캡슐화
- [ ] **목표:** 전역 스코프에 선언된 DOM 요소 참조와 상태 변수들을 특정 모듈 또는 클래스 내로 이동시켜 전역 오염을 줄입니다.
  - [x] 모든 `document.getElementById()` 호출을 한 곳으로 모아 초기화 함수를 만듭니다.
    > **참고:** `file://` 프로토콜 환경에서는 `type="module"` 스크립트 로딩 시 CORS 문제로 인해 외부 JS 파일 분리가 어렵습니다. 이 단계에서는 `index.html` 내의 스크립트 블록 안에서 DOM 요소 초기화 함수를 만드는 방식으로 진행합니다. 실제 모듈 분리는 웹 서버 환경에서 가능합니다.
  - [ ] `bossSchedule`, `fixedBossSchedule`, `isAlarmRunning`, `alertTimerId`, `fixedAlarmStates`, `logVisibilityState` 등의 전역 변수들을 관련 로직을 캡슐화하는 객체나 모듈 내부로 이동시킵니다.
  - [ ] `localStorage` 접근 로직(`saveFixedAlarmStates`, `loadFixedAlarmStates`, `saveLogVisibilityState`, `loadLogVisibilityState`)을 별도의 유틸리티 모듈로 분리합니다.

### 2단계: 기능별 모듈 분리
- [ ] **목표:** SRP에 따라 각 기능을 독립적인 JavaScript 파일(모듈)로 분리합니다.
  - [ ] **`dom-elements.js`:** 모든 DOM 요소 참조를 관리하는 모듈.
  - [ ] **`logger.js`:** `log` 함수와 `logContainer` 관련 로직을 캡슐화.
  - [ ] **`speech-synth.js`:** `speak` 함수와 `window.speechSynthesis` 관련 로직을 캡슐화.
  - [ ] **`boss-parser.js`:** `parseBossList` 함수와 보스 목록 파싱 및 날짜 계산 로직을 캡슐화. `bossSchedule` 상태를 관리.
  - [ ] **`alarm-scheduler.js`:** `checkAlarms` 함수와 `setInterval` 타이머 관리, 알림 로직(5분 전, 1분 전, 정각)을 캡슐화. `bossSchedule`과 `fixedBossSchedule`을 인자로 받아 처리.
  - [ ] **`ui-renderer.js`:** `updateBossListTextarea`, `renderFixedAlarms`, `updateFixedAlarmVisuals`, `nextBossDisplay` 업데이트 등 UI 렌더링 및 업데이트 로직을 캡슐화.
  - [ ] **`api-service.js`:** `getShortUrl` 함수와 TinyURL API 호출 로직을 캡슐화.
  - [ ] **`event-handlers.js`:** `startButton`, `shareButton`, `copyButton`, `globalFixedAlarmToggle`, `logVisibilityToggle` 등 모든 이벤트 리스너를 관리. 각 이벤트 핸들러는 위에서 분리된 모듈의 함수들을 호출하도록 변경.

### 3단계: 의존성 주입 및 이벤트 기반 통신
- [ ] **목표:** 모듈 간의 직접적인 의존성을 줄이고, 유연성을 높입니다.
  - [ ] 모듈들이 서로의 전역 변수에 직접 접근하는 대신, 필요한 데이터를 함수 인자로 전달받도록 변경합니다 (의존성 주입).
  - [ ] 복잡한 상태 변경이나 모듈 간의 통신이 필요한 경우, 커스텀 이벤트(CustomEvent)를 활용한 이벤트 기반 통신 패턴을 고려합니다. (예: `boss-parser`가 `bossSchedule`을 업데이트하면 `ui-renderer`가 이를 감지하여 UI를 업데이트)

### 4단계: 오류 처리 개선
- [ ] **목표:** 애플리케이션 전반에 걸쳐 일관되고 견고한 오류 처리 메커니즘을 구축합니다.
  - [ ] API 호출(`getShortUrl`) 외에도 `parseBossList` 등에서 발생할 수 있는 잠재적 오류(예: 잘못된 입력 형식)에 대한 예외 처리를 강화합니다.
  - [ ] 사용자에게 오류를 명확하게 알리는 UI 피드백 메커니즘을 구현합니다.
