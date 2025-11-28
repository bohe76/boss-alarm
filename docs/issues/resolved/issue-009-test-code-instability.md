**이슈 009: 테스트 코드의 불안정성 및 복잡성 문제 해결 (프런트엔드 메타데이터 관점)**

**상태:** 해결됨

**문제점:**
현재 `fix/boss-scheduler-update-issue` 브랜치에서 `src/screens/boss-scheduler.js`의 기능 변경 및 버그 수정을 진행하며 테스트 코드(`test/boss-scheduler.test.js`, 분리된 테스트 파일 포함)를 업데이트하는 과정에서 심각한 문제가 발생하고 있습니다. 이는 단순한 테스트 실패를 넘어, 프런트엔드 애플리케이션의 메타데이터(예: DOM 구조, 이벤트 리스너, Dataset) 관리 및 테스트 방식의 근본적인 어려움을 드러냈습니다.

1.  **Vitest Mocking의 복잡성:**
    *   `src/screens/boss-scheduler.js`는 `EventBus`, `BossDataManager`, `UIRenderer`, `calculator` 등 다양한 외부 모듈에 의존하고 있습니다.
    *   `Vitest`의 Mocking 메커니즘(`vi.mock`, `vi.spyOn`)을 사용하여 이러한 의존성을 제어하려 할 때, Mocking의 스코프, 비동기 로딩, 실제 모듈과의 상호작용 방식 등 복잡성으로 인해 예상치 못한 동작이 발생했습니다.
    *   특히, `calculateBossAppearanceTime`과 같은 함수를 모킹할 때, `initBossSchedulerScreen` 내부의 이벤트 핸들러가 모킹된 함수 대신 실제 원본 함수를 호출하거나, Mocking이 해제되는 현상이 관찰되어 테스트의 예측 가능성을 저해했습니다.

2.  **JSDOM 환경에서의 DOM 이벤트 및 동적 상태 관리 문제:**
    *   **Meta-data로서의 DOM:** 프런트엔드 코드에서 DOM은 단순한 UI 요소가 아니라, 사용자 인터랙션의 상태(예: `input.value`), 데이터(`input.dataset.calculatedDate`), 이벤트 리스너 등의 **메타데이터를 담는 핵심 컨테이너**입니다.
    *   `DOM.bossInputsContainer.innerHTML = `...``과 같은 방식으로 HTML을 동적으로 설정하는 것은 JSDOM 환경에서 **DOM의 초기화 시점과 이벤트 리스너 등록 시점** 간의 미묘한 타이밍 문제를 야기했습니다.
    *   `input.dispatchEvent(new Event('input', { bubbles: true }));`와 같은 **DOM 이벤트 발생**이 JSDOM 환경에서 일관되게 동작하지 않는 문제가 있었습니다. 이로 인해 `input.dataset.calculatedDate`와 같은 속성이 예상대로 설정되지 않아, `handleApplyBossSettings` 함수 내의 `hasValidInput` 검증 로직이 의도치 않게 `false`가 되어 테스트가 실패했습니다.
    *   이는 JSDOM이 실제 브라우저의 이벤트 루프나 렌더링 파이프라인을 완벽하게 에뮬레이트하지 못하기 때문에 발생하는 문제입니다.

3.  **Replace 도구의 제약 (개발 효율성 저해):**
    *   테스트 코드 파일의 길이와 Mocking 설정, DOM 조작 로직의 복잡성으로 인해 `replace` 도구의 `old_string` 매칭이 매우 까다로워 수정 작업이 반복적으로 중단되는 문제가 발생하여 에이전트의 개발 효율성을 심각하게 저해했습니다.

**영향:**
*   프런트엔드 컴포넌트의 핵심 로직(예: 사용자 입력 처리, 데이터 변환, 상태 업데이트)에 대한 단위 테스트의 신뢰성 확보가 어려웠습니다.
*   버그 수정 및 기능 추가 시 회귀 테스트(Regression Test)가 불가능하여 코드 품질 저하로 이어질 수 있었습니다.
*   에이전트가 테스트 코드 수정 작업에 대한 신뢰성을 잃는 상황까지 발생했습니다.

**해결 방법:**

1.  **테스트 파일 분리 및 Mocking 전략 개선:**
    *   긴 단일 테스트 파일을 `init`, `apply`, `ui` 세 가지 역할로 분리하여 각 테스트의 관심사를 명확히 하고 가독성을 높였습니다.
    *   모든 Mocking은 `vi.mock`으로 모듈 자체를 Mocking하고, `vi.spyOn(module, 'function')` 방식으로 특정 함수 호출을 스파이 또는 스텁 처리하여 Mocking 전략의 일관성을 확보했습니다.
    *   특히 `EventBus` Mocking은 `listeners` 객체를 Mocking 스코프 내에서 관리하고 `emit`이 `on`에 등록된 콜백 함수들을 실제로 실행하도록 구현하여 실제 이벤트 흐름을 정확하게 모방했습니다.

2.  **JSDOM 환경에서 DOM 상태 직접 제어 및 일관된 초기화:**
    *   각 테스트 케이스의 `beforeEach`에서 `DOM` 객체를 생성하고, `DOM.bossInputsContainer.innerHTML` 및 `DOM.bossListInput`과 같이 `src` 코드에서 참조하는 모든 필수 DOM 요소를 **테스트에 필요한 최소한의 구조로 미리 설정**했습니다.
    *   `input.dataset.calculatedDate`와 같은 중요 메타데이터는 `input.dispatchEvent`를 통해 `calculateBossAppearanceTimeSpy`의 반환값을 사용하여 정확히 설정되도록 했습니다. 이로써 JSDOM의 이벤트 시스템 비일관성 문제를 회피하고 테스트 안정성을 높였습니다.

3.  **JSON 데이터 하드 코딩을 통한 의존성 격리:**
    *   `src/default-boss-list.js`와 같이 외부 JSON 데이터를 가져오는 모듈을 Mocking할 때, 테스트 코드 내에서 해당 JSON 데이터를 **하드 코딩된 JavaScript 객체 리터럴**로 제공했습니다.
    *   (`vi.mock('../src/default-boss-list.js', () => ({ DEFAULT_BOSS_LIST_KOR: [...] }));`)
    *   이를 통해 비동기적인 파일 로딩 의존성을 제거하고, 테스트의 독립성, 속도, 예측 가능성을 향상시켰습니다.

**결과:**
위 해결 방법들을 적용한 결과, 모든 테스트 케이스가 성공적으로 통과하여 `BossSchedulerScreen` 관련 로직의 안정성과 정확성을 확보했습니다.

---