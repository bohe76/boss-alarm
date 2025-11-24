# ※ 작업 원칙 ※
본 체크리스트의 각 작업(Task)은 커밋 단위로 진행됩니다. 하나의 작업을 완료하고, 관련된 모든 기능이 정상 동작하는지 스스로 검증합니다. 검증이 완료되면 사용자에게 "작업 완료"를 알리고 최종 검증을 요청합니다. 사용자의 승인이 확인되면, 커밋 메시지를 제안하고 컨펌을 받아 커밋을 실행합니다. 그 후, 사용자가 다음 단계 진행을 지시하면 다시 스스로 커밋 전까지 작업을 하고, 검증 하고, 다시 커밋 전에 작업 완료를 알립니다.
그 후, 체크리스트에서 해당 항목에 [x] 표시를 하여 완료되었음을 명시합니다.

---

# 리팩토링 체크리스트 v2.0

이 체크리스트는 `refactoring_plan_v2.md`를 세분화되고 검증 가능한 단계로 나눕니다.

---

### **0단계: 기반 다지기 - 유틸리티 통합**

- [ ] **작업 0.1: `src/utils.js` 파일 생성**
    - [ ] `src/utils.js`에 비어있는 새 파일을 생성합니다.
    - [ ] **커밋:** `feat(utils): Create empty utils.js module`

- [ ] **작업 0.2: `formatTime` 마이그레이션**
    - [ ] `src/light-calculator.js`에서 `formatTime` 함수를 잘라냅니다.
    - [ ] `src/utils.js`에 `formatTime`을 붙여넣고 `export`합니다.
    - [ ] `src/light-calculator.js`에 `import { formatTime } from './utils.js';`를 추가합니다.
    - [ ] **검증:**
        - [ ] `npm run lint`를 실행합니다.
        - [ ] 광 계산기의 스톱워치 및 "광" 시간 표시를 테스트합니다.
    - [ ] **커밋:** `refactor(utils): Move formatTime to utils.js`

- [ ] **작업 0.3: `formatMonthDay` 마이그레이션**
    - [ ] `src/utils.js`에 `formatMonthDay`라는 새로운 `export` 함수를 생성합니다.
    - [ ] `src/event-handlers.js`의 `initApp`에 있던 날짜 포맷팅 로직(익명 화살표 함수)을 `formatMonthDay`로 이동합니다.
    - [ ] `src/event-handlers.js`에 `import { formatMonthDay } from './utils.js';`를 추가합니다.
    - [ ] 기존 익명 함수 호출을 가져온 `formatMonthDay` 호출로 교체합니다.
    - [ ] **검증:**
        - [ ] `npm run lint`를 실행합니다.
        - [ ] URL 데이터가 없을 때 기본 보스 목록이 날짜 접두사와 함께 올바르게 로드되는지 테스트합니다.
    - [ ] **커밋:** `refactor(utils): Create and move formatMonthDay to utils.js`

---

### **1단계: 아키텍처 - 이벤트 기반 분리**

- [ ] **작업 1.1: `EventBus` 모듈 생성**
    - [ ] `src/event-bus.js`에 지정된 `on` 및 `emit` 메소드를 포함하여 생성합니다.
    - [ ] **커밋:** `feat(core): Create central EventBus for pub/sub architecture`

- [ ] **작업 1.2: `app.js`를 메인 오케스트레이터로 설정**
    - [ ] `src/event-handlers.js`를 `src/app.js`로 이름을 변경합니다.
    - [ ] `index.html`의 스크립트 태그가 `src/app.js`를 가리키도록 업데이트합니다.
    - [ ] `src/app.js`에서 `EventBus`를 가져옵니다.
    - [ ] **검증:**
        - [ ] `npm run lint`를 실행합니다.
        - [ ] 애플리케이션을 로드하고 브라우저 콘솔에서 파일 이름 변경과 관련된 오류가 없는지 확인합니다.
    - [ ] **커밋:** `refactor(core): Rename event-handlers to app.js and establish as main orchestrator`

---

### **2단계: 화면 및 기능 모듈 추출**

*(각 화면에 대해 반복되는 일련의 작업)*

- [ ] **작업 2.1: `share-screen` 로직 추출**
    - [ ] `src/screens/share.js`를 생성합니다.
    - [ ] `share.js`에 `initShareScreen(DOM)` 함수를 생성합니다.
    - [ ] `app.js` (및 해당하는 경우 `ui-renderer.js`)에서 TinyURL API 호출 및 관련 UI 업데이트 로직을 `initShareScreen`으로 이동합니다.
    - [ ] 내비게이션 시 `initShareScreen`을 가져와서 호출하도록 `router.js`를 업데이트합니다.
    - [ ] `app.js`에서 마이그레이션된 로직을 제거합니다.
    - [ ] **검증:** 공유 화면 기능을 테스트하고 회귀가 없는지 확인합니다.
    - [ ] **커밋:** `feat(screens): Extract Share screen logic into its own module`

- [ ] **작업 2.2: `help-screen` 로직 추출**
    - [ ] (동일한 생성 -> 이동 -> 리팩토링 -> 검증 -> 커밋 패턴을 따릅니다)

- [ ] **작업 2.3: `version-info-screen` 로직 추출**
    - [ ] (동일한 패턴을 따릅니다)

- [ ] **작업 2.4: `notification-settings-screen` 로직 추출**
    - [ ] (동일한 패턴을 따릅니다)

- [ ] **작업 2.5: `boss-management-screen` 로직 추출**
    - [ ] (동일한 패턴을 따릅니다)

- [ ] **작업 2.6: `calculator-screen` 로직 추출**
    - [ ] (동일한 패턴을 따릅니다)

- [ ] **작업 2.7: `boss-scheduler-screen` 로직 추출**
    - [ ] (동일한 패턴을 따릅니다)

- [ ] **작업 2.8: `dashboard-screen` 로직 추출**
    - [ ] (동일한 패턴을 따릅니다)

---

### **3단계: 최종 정리**

- [ ] **작업 3.1: 죽은 코드 감사 및 제거**
    - [ ] `app.js`와 `ui-renderer.js`에서 사용되지 않는 함수, 변수 또는 가져오기를 검토합니다.
    - [ ] 식별된 모든 죽은 코드를 삭제합니다.

- [ ] **작업 3.2: 전체 회귀 테스트**
    - [ ] 알람 시작/중지 및 알림.
    - [ ] 모든 사이드바 및 하단 바 내비게이션 링크.
    - [ ] 젠 계산기 기능.
    - [ ] 광 계산기 기능 (시작, 광, 잡힘, 목록, 초기화).
    - [ ] 커스텀 보스 목록 (추가, 편집, 삭제, 덮어쓰기).
    - [ ] 보스 스케줄러 (게임 선택, 시간 입력, 설정 적용).
    - [ ] URL 공유 생성 및 복사.
    - [ ] 도움말 및 버전 정보 표시.
    - [ ] 모바일 뷰 토글 및 "더보기" 메뉴 기능 (`inert` 및 포커스 트랩 포함).

- [ ] **작업 3.3: 최종 커밋**
    - [ ] **커밋:** `chore: Finalize modular refactoring and remove dead code`
