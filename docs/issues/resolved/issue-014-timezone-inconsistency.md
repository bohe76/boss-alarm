---
id: issue-014
title: "테스트 실패: BossDataManager 정렬 로직 및 시간 Mocking 일관성 문제 (시간대 처리 통합)"
status: "해결됨"
priority: "High"
assignee: ""
labels:
  - bug
  - testing
  - timezone
  - refactoring
created_date: "2025-12-06"
resolved_date: "2025-12-06"
---

# Issue-014: 테스트 실패: BossDataManager 정렬 로직 및 시간 Mocking 일관성 문제 (시간대 처리 통합)

## 1. 개요 (Overview)
* `boss-sorting-logic.test.js` 파일 내의 테스트(`should handle fixed alarms correctly alongside dynamic bosses`, `should correctly handle "tomorrow" logic for fixed alarms`)가 지속적으로 실패하고 있습니다.
* 근본적인 원인은 `calculateNextOccurrence` 함수, `BossDataManager`의 `getUpcomingBosses` 로직, 그리고 관련 테스트 코드(`test/boss-sorting-logic.test.js`) 간의 시간대(UTC vs Local) 처리 방식이 일관되지 않기 때문입니다. 이는 앱의 시간 관련 핵심 로직의 안정성을 저해하고, 테스트의 신뢰도를 떨어뜨립니다.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
*   **`test/boss-sorting-logic.test.js` 테스트 실패:**
    *   `should handle fixed alarms correctly alongside dynamic bosses` 테스트에서 `Fixed Boss`가 `Dynamic Boss`보다 뒤에 정렬되는 오류 발생.
    *   `should correctly handle "tomorrow" logic for fixed alarms` 테스트에서 `오늘 23:00` 알람이 `내일 21:00` 알람보다 뒤에 정렬되는 오류 발생.
*   **시간대 처리 불일치 원인:**
    *   **앱의 의도:** 사용자 로컬 시간대 기준으로 알람을 처리해야 합니다. (`new Date(year, month, day, hour, minute, second)`와 `setHours()` 사용 패턴 기반)
    *   **`vi.setSystemTime` (테스트 Mocking):** Mocking된 시스템 시간을 `new Date()` 호출 시 로컬 시간대 기준 `Date` 객체를 인자로 전달했음에도 불구하고, `vi.setSystemTime`은 이를 UTC로 변환하여 설정함. (예: `2023-12-03 22:00` 로컬이 `2023-12-03T13:00:00Z`로 Mocking)
    *   **`calculateNextOccurrence` 함수 (`src/utils.js`):** `getUpcomingBosses`에 의해 전달된 `baseDate`가 로컬 타임존의 영향을 받아 Mocking된 UTC 시간 기준으로도 잘못된 시간(예: `22:00Z`가 `13:00Z`로 변질)으로 해석되는 문제를 해결하기 위해 UTC 메서드(`setUTCHours`, `getUTCDay`)로 수정했으나, 이는 앱의 본래 로컬 시간대 의도와 충돌.
    *   **`BossDataManager.getUpcomingBosses` (`src/data-managers.js`):** `new Date(currentTimestamp)` 호출 시 로컬 타임존의 영향을 받아 Mocking된 시간을 잘못 해석하고, `calculateNextOccurrence`에 전달되는 `baseDate`가 일관되지 않아 올바른 `timestamp` 계산이 어려움.

## 3. 제안된 해결 방안 (Proposed Solution)
애플리케이션의 본래 의도인 **'사용자의 로컬 시간대 기준으로 모든 알람을 처리한다'**는 전략을 일관되게 적용하여 문제를 해결하고, 테스트의 신뢰성을 확보합니다.

1.  **`calculateNextOccurrence` 함수 수정 (`src/utils.js`):**
    *   현재 UTC 기준으로 동작하는 함수를 **로컬 시간대 기준으로 동작**하도록 재수정합니다. `setUTCHours` 대신 `setHours`, `getUTCDay` 대신 `getDay` 등 로컬 시간대 관련 메서드를 사용하며, `new Date(year, month, day, hour, minute, second)` 생성자를 활용합니다.
2.  **`BossDataManager.getUpcomingBosses` 함수 수정 (`src/data-managers.js`):**
    *   `currentTimestamp`, `nowAsDate` 생성 및 모든 `Date` 객체 생성 및 비교가 **로컬 시간대를 기준으로 일관되게** 이루어지도록 수정합니다. `new Date(Date.now())`는 `new Date()`와 동일하며 로컬 시간을 반환함을 활용합니다.
3.  **테스트 환경 및 케이스 수정 (`test/boss-sorting-logic.test.js`, `test/utils.test.js`):**
    *   `vi.setSystemTime` 호출 시, Mocking하고자 하는 시간을 **로컬 시간대의 `Date` 객체**로 정확히 명시합니다 (예: `new Date(2023, 11, 3, 22, 0, 0)`).
    *   테스트 케이스 내의 모든 `Date` 객체 생성(`dynamicBossDate`, `todayBossDate`, `tomorrowBossDate` 등)과 `expect`의 비교 값도 **로컬 시간대를 기준으로 일관되게** 변경합니다. `toISOString()` 대신 `toLocaleISOString()`과 같은 로컬 시간대 기반의 문자열을 비교하거나, `Date` 객체 자체 비교를 활용합니다.

## 4. 해결 과정 및 최종 결과

### 4.1. 문제 진단 및 원인 분석
`vi.setSystemTime`으로 Mocking된 UTC 시간(`2023-12-03T22:00:00Z`)이 애플리케이션 내 `new Date(currentTimestamp)` 호출 시 로컬 타임존의 영향을 받아 잘못된 로컬 시간으로 해석되는 문제점을 확인했습니다. 이는 `calculateNextOccurrence` 함수, `BossDataManager.getUpcomingBosses` 로직, 그리고 `test/boss-sorting-logic.test.js` 테스트 코드 간의 시간대 처리 불일치(UTC vs Local)가 근본적인 원인이었습니다. 이 불일치로 인해 테스트 실패가 발생했습니다.

### 4.2. 해결 방안 적용 및 결과
애플리케이션의 모든 시간 처리 로직과 테스트를 **'사용자의 로컬 시간대' 기준으로 일관되게 통합**하는 전략을 적용하여 문제를 해결했습니다.

1.  **`calculateNextOccurrence` 함수 수정 (`src/utils.js`):**
    *   UTC 기준으로 동작하던 로직을 로컬 시간대 기준으로 재수정했습니다. (`nextDate.setDate`, `nextDate.setHours`, `nextDate.getDay` 등 로컬 시간대 관련 메서드 사용)
2.  **`BossDataManager.getUpcomingBosses` 함수 수정 (`src/data-managers.js`):**
    *   `currentTimestamp`, `nowAsDate` 생성 및 모든 `Date` 객체 생성 및 비교가 로컬 시간대를 기준으로 일관되게 이루어지도록 수정했습니다. `new Date(Date.now())`는 `new Date()`와 동일하며 로컬 시간을 반환함을 활용했습니다.
3.  **테스트 환경 및 케이스 수정 (`test/utils.test.js`, `test/boss-sorting-logic.test.js`):**
    *   `vi.setSystemTime` 호출 시, Mocking하고자 하는 시간을 로컬 시간대의 `Date` 객체(`new Date(2023, 11, 3, 22, 0, 0)`)로 명시했습니다.
    *   테스트 케이스 내의 모든 `Date` 객체 생성(`dynamicBossDate`, `todayBossDate`, `tomorrowBossDate` 등)과 `expect`의 비교 값도 로컬 시간대를 기준으로 일관되게 변경했습니다.

### 4.3. 검증
위 수정 사항 적용 후, 모든 유닛 테스트(`Vitest`)를 재실행했습니다.

*   `test/utils.test.js`의 `calculateNextOccurrence` 관련 37개 테스트를 포함한 모든 유닛 테스트가 **성공적으로 통과**했습니다.
*   `test/boss-sorting-logic.test.js`의 기존 실패 테스트 2개도 모두 **통과**했습니다.

이를 통해 시간대 처리 불일치 문제가 해결되었고, 알람 계산 및 정렬 로직의 정확성과 테스트의 신뢰성이 확보되었음을 확인했습니다.