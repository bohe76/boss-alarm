---
status: 해결됨
resolved_at: 2025-11-28
created_at: 2025-11-28
priority: high
assigned_to: Gemini
labels:
  - bug
  - testing
  - mocking
  - timezone
  - resolved
---
# 이슈 008: 보스 스케줄러 기능 및 테스트의 지속적인 문제점

## 1. 문제점

보스 스케줄러 기능 (`src/screens/boss-scheduler.js`) 및 관련 테스트(`test/boss-scheduler.test.js`)에 지속적인 문제가 발생하고 있습니다. `BossDataManager`와의 직접적인 병합 로직을 구현하고 KST(한국 표준시) 기반 시간 처리를 적용했음에도 불구하고, 테스트가 여전히 실패하고 UI 렌더링에 문제가 발생하고 있습니다.

주요 문제점은 다음과 같습니다.

### 1.1. 테스트 실패 (`AssertionError: expected '' to deeply equal '...'`)

`test/boss-scheduler.test.js` 내의 다음 테스트들이 `DOM.bossListInput.value`가 예상되는 보스 목록 텍스트 대신 빈 문자열로 나타나기 때문에 실패하고 있습니다.

*   `should correctly process boss times for today and next day and sort them`
*   `should handle special bosses with +12h logic and sort them correctly`
*   `should filter out invasion bosses that are not today`

이는 `updateBossListTextarea(DOM)` 함수가 `BossDataManager`에서 데이터를 가져와 올바른 텍스트를 생성하지 못하고 있음을 시사합니다.

### 1.2. `updateBossListTextarea` 로직 문제 (빈 문자열 출력)

`src/ui-renderer.js`의 `updateBossListTextarea` 함수는 `bossSchedule` 배열을 기반으로 텍스트를 생성하지만, `if (nextItem && nextItem.type === 'boss')`와 같은 조건부 로직으로 인해 `type: 'date'` 항목이 올바르게 렌더링되지 않거나, `bossSchedule`의 구조가 예상과 달라 빈 문자열을 생성하는 것으로 추정됩니다. 콘솔 로그 확인 결과 `BossDataManager`의 `mockBossSchedule`은 올바르게 데이터가 채워져 있으나, 텍스트 영역에는 빈 문자열이 나타납니다.

### 1.3. `BossDataManager` 모의 문제 (가능성)

`test/boss-scheduler.test.js`의 `BossDataManager` 모의가 `vi.mock`의 `importOriginal`을 사용하여 `mockBossSchedule`에 대한 동적 저장 및 검색을 구현했음에도 불구하고, `updateBossListTextarea`가 여전히 빈 데이터를 받고 있는 것으로 보입니다.

### 1.4. 시간대(Timezone) 처리의 복잡성

애플리케이션은 한국 표준시(KST, UTC+9)를 기준으로 모든 계산 및 표시를 수행해야 하지만, `Date` 객체의 로컬/UTC 메서드 사용 및 `JSDOM` 테스트 환경에서의 시간대 동작 불일치로 인해 예상치 못한 결과가 계속 발생하고 있습니다. 테스트 환경(`process.env.TZ = 'UTC';` 설정 여부)과 실제 애플리케이션 코드 간의 시간대 처리 일관성을 확보하는 것이 중요합니다.

### 1.5. 디버깅 과정에서의 환경적 문제 및 반복적인 오류

에이전트(Gemini)는 테스트 환경 설정, Mocking의 복잡성, 그리고 `read_file` 도구의 출력 잘림 현상으로 인해 문제 해결 과정에서 여러 차례 무한 루프에 빠지는 심각한 어려움을 겪었습니다. 특히 `test/boss-scheduler.test.js` 파일의 상태를 정확하게 파악하고 Mocking 관련 오류를 해결하는 데 많은 시간이 소요되었습니다. 이는 문제 해결을 위한 기본 정보 획득 및 적용 단계에서 발생한 반복적인 오류가 주된 원인입니다.

## 2. 현재 상태

*   `fix/boss-scheduler-v2` 브랜치에서 작업 중입니다.
*   `src/screens/boss-scheduler.js`에는 KST 기반 로직과 `BossDataManager`를 직접 업데이트하는 새로운 병합 로직이 적용되어 있습니다.
*   `src/calculator.js` 및 `src/ui-renderer.js`는 KST 기반 로컬 시간 메서드를 사용하도록 확인되었습니다.
*   `test/boss-scheduler.test.js`에는 `process.env.TZ = 'UTC';`가 설정되어 있으며, 모든 모의(EventBus, BossDataManager, UIRenderer)가 최신 버전으로 업데이트되어 있습니다. `mockBossSchedule`은 `beforeEach`에서 현실적인 데이터로 초기화됩니다.

## 3. 예상되는 해결 방안 (다음 단계)

`updateBossListTextarea` 함수가 `bossSchedule`에서 `type: 'date'` 항목을 올바르게 렌더링하지 못하는 문제에 집중하여 해결해야 합니다. `if (nextItem && nextItem.type === 'boss')` 조건이 날짜 표시를 잘못 필터링하는지 확인하고 수정해야 합니다. 또한, KST 기반 예상 테스트 결과와 실제 렌더링되는 결과 간의 정확한 일치를 확인해야 합니다.

## 4. 해결 내용 (2025-11-28)

이슈 006 해결과 함께 본 이슈의 원인인 테스트 환경 및 로직 문제를 모두 해결했습니다.

1.  **테스트 Mocking 수정:**
    *   `ui-renderer.js`를 모킹할 때 `updateBossListTextarea` 함수는 모킹하지 않고 실제 구현을 사용하도록 수정했습니다. 이를 통해 테스트 중에 실제 DOM 업데이트가 발생하고 검증이 가능해졌습니다.
    *   `BossDataManager` 모킹 시 내부 변수(`mockBossSchedule`)를 활용하여 데이터 상태를 정확히 추적하도록 개선했습니다.

2.  **데이터 격리 (Isolation):**
    *   `beforeEach`에서 `mockBossSchedule`을 빈 배열(`[]`)로 초기화하여, 이전 테스트나 기본 데이터가 현재 테스트 케이스에 영향을 주지 않도록 격리했습니다.
    *   각 테스트 케이스에서 필요한 데이터만 `DOM` 생성 시 `data-id` 속성으로 주입하여, 업데이트 로직이 정확히 동작하도록 환경을 구성했습니다.

3.  **로직 수정 검증:**
    *   `boss-scheduler.js`의 ID 기반 업데이트 및 Reconstruction 로직이 수정된 테스트 환경에서 올바르게 동작함을 검증했습니다. (`HH:MM` 포맷팅, 날짜 꼬임 방지, +12h 로직 등)
    *   `boss-parser.test.js` 또한 새로운 파싱 로직(`Smart Merge`, 에러 반환)에 맞춰 전면 수정하고 통과를 확인했습니다.
