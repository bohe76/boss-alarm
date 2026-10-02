---
id: issue-039
title: "커스텀 보스의 젠 주기를 수정해도 저장되지 않음"
status: "진행 중"
priority: "High"
assignee: "Claude"
labels:
  - bug
  - scheduler
  - custom-list
created_date: "2026-10-02"
resolved_date: ""
---

# Issue-039: 커스텀 보스의 젠 주기를 수정해도 저장되지 않음

## 1. 개요 (Overview)

커스텀 보스 목록에서 이미 한 번 저장한 보스의 젠 주기를 입력 화면에서 바꾸고 "보스 시간 업데이트"를 눌러도 DB의 주기가 바뀌지 않는다. 시간표의 48시간 확장과 공유 링크(issue-038) 모두 처음 저장한 주기를 계속 쓴다.

## 2. 문제점 또는 요구사항 (Problem or Requirement)

- `BossDataManager.commitDraft`(`src/data-managers.js`)는 Draft의 보스가 DB에 **없을 때만** `DB.upsertBoss`로 주기를 기록한다. 이미 있는 보스는 `if (!boss)` 분기를 타지 않아 주기가 처음 값에 고정된다.
- 입력 화면은 Draft의 주기를 보여 주므로 저장 직후에는 바뀐 것처럼 보이지만, 확장은 DB의 주기로 이뤄진다.
- issue-038 코드 리뷰 중 발견. 리뷰어가 0 → 150분으로 고쳐 다시 저장해도 DB가 0으로 남는 것을 실행으로 확인했다.
- 프리셋 보스의 주기는 프리셋이 정한다(프리셋 인터벌 우선). 프리셋에는 이 수정을 적용하면 안 된다.

## 3. 제안된 해결 방안 (Proposed Solution)

- `commitDraft`에서 이미 있는 보스라도, 게임이 프리셋이 아니고 Draft 항목에 주기 값이 있으며 DB 값과 다르면 `DB.updateBoss`로 주기를 갱신한다.
- 프리셋 여부는 `DB.getGame(gameId)?.type === 'preset'`으로 판별한다(`isPresetNamesMatching`과 같은 기준). 커스텀 목록은 `games` 행이 없다.
- 주기 0은 "주기 없음(확장 안 함)"으로 그대로 저장한다 — 사용자가 주기 입력을 비운 경우다.
- **범위 밖:** 시간을 입력하지 않은 보스의 주기만 바꾼 경우는 여전히 저장되지 않는다. 입력 화면이 시간이 있는 행만 Draft에 넣기 때문이며(`syncInputToText`), 스케줄이 없는 보스는 확장 대상도 아니다. 시간을 입력해 저장하는 시점에 주기도 함께 저장된다.
