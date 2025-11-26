### **리팩토링 명세서: 보스 알리미 v2.0 아키텍처**

#### **1.0 개요 및 전략적 목표**

**1.1 리팩토링의 본래 목적:**
초기 목표는 **푸시 알림 기능**의 안정적인 구현을 위한 기반을 마련하기 위해, 애플리케이션의 모듈성을 개선하고 순환 종속성을 제거하는 것이었습니다. 기존의 `event-handlers.js`와 `ui-renderer.js` 모듈처럼 긴밀하게 결합된 모놀리식 구조는 새로운 기능을 추가하는 것을 위험하고 어렵게 만들었습니다.

**1.2 이전 리팩토링 실패 분석:**
이전 시도는 계획 및 실행 과정에서의 몇 가지 중대한 오류로 인해 실패했습니다.
*   **핵심 문제 오진:** 순환 종속성을 올바르게 식별했지만, 피상적인 해결책만 제안했습니다. 진짜 문제는 단일 책임 원칙(Single Responsibility Principle)을 근본적으로 위반하여 '갓 객체(God Objects)'를 초래한 것이었습니다.
*   **지나치게 야심 찬 범위:** 점진적이고 검증 가능한 변경 대신, 크고 복잡한 코드 덩어리를 한 번에 옮기는 "빅뱅" 방식의 리팩토링을 시도했습니다. 이는 효율적인 디버깅이 불가능한 연쇄적인 실패를 초래했습니다.
*   **새로운 갓 객체 생성:** 제안된 `Router` 모듈은 또 다른 갓 객체가 될 운명이었고, 이는 초기 아키텍처의 실수를 반복하는 것이었습니다.
*   **기반 정리 부족:** DRY(Don't Repeat Yourself) 원칙을 위반하는, 흩어져 있고 중복된 유틸리티 함수 문제를 해결하지 않았습니다. 이는 필수 선행 작업이었어야 합니다.

**1.3 새로운 전략적 비전:**
목표는 동일합니다: **푸시 알림과 같은 미래 기능을 위해 안정적이고, 모듈화되었으며, 확장 가능한 아키텍처를 구축하는 것.** 하지만, *방법론*은 근본적으로 다를 것입니다. 우리는 각 모듈이 단일하고 명확한 책임을 갖는 현대적인 이벤트 기반 아키CCTURE로 코드베이스를 변환하는 안전하고, 점진적이며, 검증 가능한 프로세스를 채택할 것입니다.

#### **2.0 상세 리팩토링 명세**

이 프로세스는 정확하고 검증 가능한 단계로 나뉩니다. 한 단계 내의 각 단계는 다음 단계로 넘어가기 전에 완료되고 검증되어야 합니다.

---

### **0단계: 기반 다지기 - 유틸리티 통합**

**목표:** 중앙 집중식 유틸리티 라이브러리를 생성하여 코드 중복을 제거합니다. 이는 DRY 원칙을 강제하고 모든 후속 단계를 위한 견고한 기반을 제공합니다.

**명세:**

1.  **파일 생성:**
    *   `src/utils.js`에 새 파일을 생성합니다.

2.  **함수 마이그레이션 및 검증 (하나씩):**
    *   **작업:** 아래 나열된 각 함수에 대해 다음 단계를 수행합니다.
        1.  **소스 파일**에서 함수를 잘라냅니다.
        2.  함수를 `src/utils.js`에 붙여넣고 `export` 키워드를 추가합니다.
        3.  **소스 파일** 상단에 `import { functionName } from './utils.js';` 문을 추가합니다.
        4.  `npm run lint`를 실행하여 구문 오류가 없는지 확인합니다.
        5.  **대상 테스트 수행:** **검증 단계**에 나열된 특정 사용자 작업을 수동으로 실행하여 기능이 손상되지 않았는지 확인합니다.
        6.  지정된 **커밋 메시지**로 커밋합니다.

    *   **함수 1: `formatTime`**
        *   **소스 파일:** `src/light-calculator.js`
        *   **검증 단계:**
            *   계산기 화면으로 이동합니다.
            *   광 계산기 스톱워치를 시작합니다.
            *   스톱워치 디스플레이가 매초 올바르게 업데이트되는지 확인합니다.
            *   "광"을 트리거하고 예상 시간 디스플레이가 업데이트되는지 확인합니다.
        *   **커밋 메시지:** `refactor(utils): formatTime을 utils.js로 이동`

    *   **함수 2: `formatMonthDay`**
        *   **소스 파일:** `src/event-handlers.js` (`initApp` 내부)
        *   **참고:** 현재 익명 화살표 함수입니다. `utils.js`에서 명명된, 내보내기 된 함수로 변환해야 합니다.
        *   **검증 단계:**
            *   브라우저 로컬 스토리지를 지워 기본 보스 목록이 로드되도록 합니다.
            *   URL 매개변수 없이 애플리케이션을 로드합니다.
            *   `bossListInput` 텍스트 영역에 오늘과 내일 날짜(예: `MM.DD`)가 올바르게 앞에 추가되는지 확인합니다.
        *   **커밋 메시지:** `refactor(utils): formatMonthDay를 생성하여 utils.js로 이동`

    *   **(식별된 다른 모든 순수 헬퍼 함수에 대해 반복)**

---

### **1단계: 아키텍처 - 이벤트 기반 분리**

**목표:** 주요 구성 요소 간의 직접적이고 긴밀하게 결합된 함수 호출을 이벤트 기반 시스템으로 교체합니다. 이는 순환 종속성을 제거하고 모듈성을 증진시킵니다.

**명세:**

1.  **이벤트 버스 생성:**
    *   **작업:** `src/event-bus.js`에 새 파일을 생성합니다.
    *   **내용:**
        ```javascript
        // src/event-bus.js
        export const EventBus = {
            events: {},
            on(event, listener) {
                if (!this.events[event]) {
                    this.events[event] = [];
                }
                this.events[event].push(listener);
            },
            emit(event, data) {
                if (this.events[event]) {
                    this.events[event].forEach(listener => listener(data));
                }
            }
        };
        ```
    *   **커밋 메시지:** `feat(core): pub/sub 아키텍처를 위한 중앙 EventBus 생성`

2.  **메인 진입점 리팩토링 (`app.js`):**
    *   **작업:**
        1.  `src/event-handlers.js`를 `src/app.js`로 이름을 바꿉니다.
        2.  `index.html`이 `./app.js`에서 `initApp`을 가져와 실행하도록 수정합니다.
        3.  `app.js`에서 `EventBus`를 가져옵니다.
        4.  이제 `initApp` 함수는 다른 모든 모듈을 초기화하고 `EventBus` 인스턴스를 전달하는 역할을 합니다.
    *   **커밋 메시지:** `refactor(core): event-handlers를 app.js로 이름 변경하고 메인 오케스트레이터로 설정`

---

### **2단계: 화면 및 기능 모듈 추출**

**목표:** 모놀리식 `app.js`(이전 `event-handlers.js`) 및 `ui-renderer.js`를 독립적인 기능 중심 모듈로 분해합니다.

**명세 (한 화면에 대한 예시):**

1.  **모듈: `boss-management.js`**
    *   **작업: 파일 생성:** `src/screens/boss-management.js`를 생성합니다.
    *   **작업: `init` 함수 정의:**
        ```javascript
        // src/screens/boss-management.js
        import { EventBus } from '../event-bus.js';
        import { getSortedBossListText, parseBossList } from '../boss-parser.js';
        
        export function initBossManagementScreen(DOM) {
            // "시간순 정렬" 버튼 이벤트 리스너
            DOM.sortBossListButton.addEventListener('click', () => {
                const sortedText = getSortedBossListText(DOM.bossListInput.value);
                DOM.bossListInput.value = sortedText;
                parseBossList(DOM.bossListInput);
                EventBus.emit('log', { message: "보스 목록이 시간순으로 정렬되었습니다.", isImportant: true });
            });

            // 실시간 파싱을 위한 이벤트 리스너
            DOM.bossListInput.addEventListener('input', () => {
                parseBossList(DOM.bossListInput);
            });
        }
        ```
    *   **작업: 라우터 리팩토링:**
        1.  `router.js`에서 `initBossManagementScreen`을 가져옵니다.
        2.  `Router.navigate`에서 `screenId`가 `boss-management-screen`일 때 `initBossManagementScreen(this.DOM)`을 호출합니다.
    *   **작업: `app.js` 리팩토링:** `app.js`에서 해당 이벤트 리스너 로직을 제거합니다.
    *   **검증:**
        1.  `npm run lint`를 실행합니다.
        2.  "보스 관리" 화면으로 이동합니다.
        3.  텍스트 영역에 입력하는 것이 여전히 작동하고 목록을 파싱하는지 확인합니다.
        4.  "시간순 정렬" 버튼을 클릭하면 목록이 올바르게 정렬되는지 확인합니다.
        5.  화면을 나갔다가 다시 돌아와 리스너가 중복되지 않고 기능이 유지되는지 확인합니다.
    *   **커밋 메시지:** `feat(screens): 보스 관리 로직을 자체 모듈로 추출`

2.  **다른 모든 화면/기능에 대해 반복:**
    *   `share.js`
    *   `calculator.js`
    *   `boss-scheduler.js`
    *   `notifications.js`
    *   `dashboard.js`
    *   ... 등등, 각각에 대해 **생성 -> 이동 -> 리팩토링 -> 검증 -> 커밋** 패턴을 따릅니다.

---

### **3단계: 최종 정리**

**목표:** 모든 레거시 코드를 제거하고 새로운 모듈식 구조를 완성합니다.

**명세:**
1.  **`app.js` 및 `ui-renderer.js` 감사:** 이 파일들을 체계적으로 검토하고 추출 과정 후 더 이상 사용되지 않는 모든 함수, 가져오기 또는 변수를 삭제합니다.
2.  **전체 회귀 테스트:** 애플리케이션의 모든 기능을 완전히 테스트하여 기능 손실이 없는지 확인합니다.
    *   알람 시작/중지 및 알림.
    *   모든 내비게이션 경로.
    *   모든 계산기 기능.
    *   커스텀 목록 관리(CRUD 작업).
    *   보스 스케줄러 상호 작용.
    *   URL 공유.
    *   모바일 뷰 및 "더보기" 메뉴 기능.
3.  **최종 커밋:** `chore: 모듈식 리팩토링 완료 및 죽은 코드 제거`.

이 명세서는 원하는 아키텍처를 달성하기 위한 상세하고 안전하며 검증 가능한 로드맵을 제공합니다. 점진적인 변경과 지속적인 검증을 우선시하여 이전 실패로부터 교훈을 얻습니다.

이 상세 명세서를 검토해 주십시오. **0단계**를 시작하기 전에 승인을 기다리겠습니다.