---
id: issue-041
title: "스케줄을 행마다 ID 할당·저장해 수천 건 적재가 느림"
status: "미해결"
priority: "Low"
assignee: ""
labels:
  - performance
  - db
  - hardening
created_date: "2026-10-02"
resolved_date: ""
---

# Issue-041: 스케줄을 행마다 ID 할당·저장해 수천 건 적재가 느림

## 1. 개요 (Overview)

`DB.nextId()`는 호출할 때마다 `v3_uid_counter`를 localStorage에서 읽고 다시 쓴다. `DB.replaceSchedulesByGameId`는 ID가 없는 행마다, `DB.addSchedulesBulk`는 모든 행마다 `nextId()`를 부르므로 행 수만큼 localStorage 쓰기가 일어난다. 수천 건을 직접 실은 조작 공유 링크를 열면 부팅이 분 단위로 느려진다.

issue-040 코드 리뷰 대응 중 측정했고, 사용자 결정으로 v3.0.6 범위에서 빼 별도 이슈로 남긴다.

## 2. 문제점 또는 요구사항 (Problem or Requirement)

- **측정** (Chromium, 스케줄 5,000건 × 200자 메모, URL 약 155만 자): 부팅 약 2분. 프로파일상 `loadInitialData` → `DB.replaceSchedulesByGameId` → `nextId` → `save`가 42초(5,000회, 건당 약 8ms).
- **건당 8ms인 이유 (측정에서 추정)**: 주소창에 긴 공유 URL(`#d=…`)이 남아 있는 동안에는 localStorage 쓰기 한 번이 느려지는 것으로 보인다. 해시는 적재가 성공한 뒤에 지운다(실패 시 외부 브라우저에서 다시 시도할 수 있게 남겨 두는 설계). 주소가 짧을 때는 같은 쓰기가 훨씬 빠르다 — 5행짜리 링크가 10,000행으로 확장되는 경우(쓰기 약 1만 회)는 부팅 약 1초였다.
- **영향 범위**: 예외는 나지 않고 상태도 일관된다. 프리셋 링크와 커스텀 목록 링크 모두 같은 경로이며 v3.0.5 배포본에도 있다. 정상적인 공유 링크(수백 건 이하)에서는 체감되지 않는다. 브라우저의 URL 길이 제한(Chromium 약 2MB) 때문에 실을 수 있는 양은 200자 메모 기준 6,000건 안팎으로 추정한다.
- **부수 효과**: 48시간 확장(`_expandAndReconstruct`)은 확장 결과에 ID를 넣지 않고 `replaceSchedulesByGameId`에 넘기므로, 확장할 때마다 전체 행의 ID를 새로 받는다. 정상 사용(수백 행, 짧은 주소)에서는 문제가 되지 않지만 같은 원인이다.

## 3. 제안된 해결 방안 (Proposed Solution)

`src/db.js`는 보호 영역이다(`DB` 싱글톤 전체, `nextId()` 포함). 아래는 제안이며 사용자 승인 뒤 진행한다.

1. **ID 일괄 할당**: `replaceSchedulesByGameId`와 `addSchedulesBulk`에서 카운터를 한 번 읽고, 필요한 만큼 순서대로 배정한 뒤, 한 번만 저장한다. 행 수와 무관하게 카운터 쓰기가 1회가 된다. `nextId()`의 공개 동작(1씩 증가하는 정수, `v3_uid_counter`)은 그대로 둔다.
2. **대안 — 해시를 적재 전에 지우기**: `loadInitialData`에서 DB 쓰기 전에 `history.replaceState`로 해시를 지우고 실패하면 되돌린다. 쓰기 횟수는 그대로이고 "실패 시 해시 보존" 설계를 건드리므로 1번보다 못하다.
3. **검증 계획**: `test/db.test.js`에 일괄 할당 뒤 ID가 유일하고 카운터가 마지막 ID와 같다는 테스트, 저장 실패(용량 초과) 시 카운터와 스케줄의 정합성 테스트를 추가한다. 5,000건 링크의 부팅 시간을 수정 전후로 잰다.

**예상 영향 범위**: 스케줄을 여러 건 쓰는 경로(공유 링크 적재, `commitDraft`, 48시간 확장)가 `replaceSchedulesByGameId`를 지난다. ID 값의 순서가 같아야 하고, 중간에 저장이 실패했을 때 카운터가 앞서 나가거나 뒤처지지 않는지 확인이 필요하다.
