**이슈 009: 테스트 코드의 불안정성 및 복잡성 문제 해결 (프런트엔드 메타데이터 관점)**

**문제점:**
현재 `fix/boss-scheduler-update-issue` 브랜치에서 `src/screens/boss-scheduler.js`의 기능 변경 및 버그 수정을 진행하며 테스트 코드(`test/boss-scheduler.test.js`, 분리된 테스트 파일 포함)를 업데이트하는 과정에서 심각한 문제가 발생하고 있습니다. 이는 단순한 테스트 실패를 넘어, 프런트엔드 애플리케이션의 메타데이터(예: DOM 구조, 이벤트 리스너, Dataset) 관리 및 테스트 방식의 근본적인 어려움을 드러냅니다.

1.  **Vitest Mocking의 복잡성:**
    *   `src/screens/boss-scheduler.js`는 `EventBus`, `BossDataManager`, `UIRenderer`, `calculator` 등 다양한 외부 모듈에 의존하고 있습니다.
    *   `Vitest`의 Mocking 메커니즘(`vi.mock`, `vi.spyOn`)을 사용하여 이러한 의존성을 제어하려 할 때, Mocking의 스코프, 비동기 로딩, 실제 모듈과의 상호작용 방식 등 복잡성으로 인해 예상치 못한 동작이 발생하고 있습니다.
    *   특히, `calculateBossAppearanceTime`과 같은 함수를 모킹할 때, `initBossSchedulerScreen` 내부의 이벤트 핸들러가 모킹된 함수 대신 실제 원본 함수를 호출하거나, Mocking이 해제되는 현상이 관찰되어 테스트의 예측 가능성을 저해합니다.

2.  **JSDOM 환경에서의 DOM 이벤트 및 동적 상태 관리 문제:**
    *   **Meta-data로서의 DOM:** 프런트엔드 코드에서 DOM은 단순한 UI 요소가 아니라, 사용자 인터랙션의 상태(예: `input.value`), 데이터(`input.dataset.calculatedDate`), 이벤트 리스너 등의 **메타데이터를 담는 핵심 컨테이너**입니다.
    *   `DOM.bossInputsContainer.innerHTML = `...``와 같은 방식으로 HTML을 동적으로 설정하는 것은 JSDOM 환경에서 **DOM의 초기화 시점과 이벤트 리스너 등록 시점** 간의 미묘한 타이밍 문제를 야기합니다.
    *   `input.dispatchEvent(new Event('input', { bubbles: true }));`와 같은 **DOM 이벤트 발생**이 JSDOM 환경에서 일관되게 동작하지 않는 문제가 있습니다. 이로 인해 `input.dataset.calculatedDate`와 같은 속성이 예상대로 설정되지 않아, `handleApplyBossSettings` 함수 내의 `hasValidInput` 검증 로직이 의도치 않게 `false`가 되어 테스트가 실패합니다.
    *   이는 JSDOM이 실제 브라우저의 이벤트 루프나 렌더링 파이프라인을 완벽하게 에뮬레이트하지 못하기 때문에 발생하는 문제입니다.

3.  **Replace 도구의 제약 (개발 효율성 저해):**
    *   현재 테스트 코드 파일은 내용이 길고 Mocking 설정이 복잡하며, `beforeEach`와 `it` 블록 내에서 동적으로 DOM을 생성하고 조작하는 로직을 포함하고 있습니다.
    *   이러한 복잡한 구조와 더불어 Mocking 설정 등으로 인해 `replace` 도구의 `old_string` 매칭이 매우 까다롭습니다. 작은 공백, 줄 바꿈, 변수 이름 등의 차이로도 매칭에 실패하여 수정 작업이 반복적으로 중단되는 문제가 발생하고 있습니다.
    *   결과적으로, 복잡한 프런트엔드 테스트 코드의 경우 `replace` 도구를 통한 점진적인 수정이 사실상 불가능한 상황이며, 이는 에이전트의 개발 효율성을 심각하게 저해합니다.

**영향:**
*   프런트엔드 컴포넌트의 핵심 로직(예: 사용자 입력 처리, 데이터 변환, 상태 업데이트)에 대한 단위 테스트의 신뢰성을 확보하기 어렵습니다.
*   버그 수정 및 기능 추가 시 회귀 테스트(Regression Test)가 불가능하여 코드 품질 저하로 이어질 수 있습니다.
*   에이전트가 테스트 코드 수정 작업에 대한 신뢰성을 잃고 있으며, 이는 향후 프런트엔드 프로젝트에서 에이전트의 역할을 제한할 수 있습니다.

**해결 방안 제안:**
1.  **테스트 코드 재설계 (수동 권장):** 현재 에이전트의 능력으로는 복잡한 `Vitest` Mocking 및 JSDOM 환경에서의 미묘한 문제를 `replace` 도구를 통해 안정적으로 해결하기 어렵습니다. 따라서 프런트엔드 테스트 코드의 경우, 개발자가 수동으로 재설계하고 작성하는 것이 현재로서는 더 효율적일 수 있습니다.
2.  **Mocking 전략 단순화 및 명확화:**
    *   `src/screens/boss-scheduler.js`의 `initBossSchedulerScreen`과 `handleApplyBossSettings` 함수가 받는 `DOM` 객체를 테스트에서 **최대한 실제 환경과 유사하게** Mocking하거나 생성합니다.
    *   Mocking 시, `vi.spyOn(module, 'function')` 방식을 일관되게 사용하고, 필요하다면 `beforeEach`에서 `mockClear`를 호출하여 Mock 상태를 초기화합니다.
3.  **DOM 상태 직접 제어:** JSDOM의 이벤트 시스템을 통한 `dataset` 설정에 의존하기보다, 테스트 케이스 내에서 `input.dataset.calculatedDate = "..."`와 같이 **DOM의 상태(메타데이터)를 직접 설정**하는 방식으로 테스트의 안정성을 높입니다.
4.  **JSON 데이터 하드 코딩을 통한 의존성 격리:**
    *   `src/default-boss-list.js`와 같이 외부 JSON 데이터를 가져오는 모듈을 Mocking할 때, 테스트 코드 내에서 해당 JSON 데이터를 **하드 코딩된 JavaScript 객체 리터럴**로 제공합니다.
    *   예: `vi.mock('../src/default-boss-list.js', () => ({ DEFAULT_BOSS_LIST_KOR: [{ id: 'boss1', name: '하드코딩보스', time: '01:00:00', ... }] }));`
    *   이를 통해 비동기적인 파일 로딩 의존성을 제거하고, 테스트의 독립성과 속도, 예측 가능성을 더욱 향상시킬 수 있습니다.
5.  **테스트 러너 환경 검토:** JSDOM 대신 실제 브라우저 환경에서 테스트를 실행할 수 있는 다른 테스트 러너(예: Playwright)의 도입도 장기적으로 고려해 볼 수 있습니다.