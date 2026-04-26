---
id: issue-031
title: "젠 계산기 업데이트 시 보스 중복 생성 버그 수정"
status: "해결됨"
priority: "High"
assignee: "Antigravity"
labels:
  - bug
  - calculator
  - SSOT
  - v3-migration
created_date: "2026-01-16"
resolved_date: "2026-04-26"
---

# Issue-031: 젠 계산기 업데이트 시 보스 중복 생성 버그 수정

## 1. 개요 (Overview)
* 젠 계산기(Zen Calculator)에서 특정 보스의 시간을 업데이트할 때, 해당 보스의 일정이 중복되어 나타나는 현상 발생.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
* **현상:** 보스 시간을 업데이트하면 기존 시간대의 보스 인스턴스가 삭제되지 않고 그대로 유지된 채, 새로운 시간대의 인스턴스가 추가로 생성됨.
* **원인:** 
    1. 현재 로직이 전체 스케줄 리스트에서 특정 ID만 변경한 채 리스트 전체를 다시 저장함.
    2. `BossDataManager.setBossSchedule`은 전달받은 리스트의 모든 아이템을 '사용자가 직접 입력한 확정 데이터(Anchor)'로 간주함.
    3. 결과적으로 수정된 인스턴스와 수정되지 않은 과거 인스턴스들이 모두 앵커가 되어 각각 자동 확장을 수행하게 됨.

## 3. 제안된 해결 방안 (Proposed Solution)
* **단일 앵커 원칙 적용:** 
    * 젠 계산기에서 특정 보스 시간을 업데이트할 때, 해당 보스 이름(`bossName`)을 가진 모든 기존 인스턴스를 스케줄에서 제거함.
    * 오직 사용자가 새로 수정한 **단 하나의 인스턴스**만 리스트에 담아 저장함.
    * SSOT 엔진(`_expandAndReconstruct`)이 이 단일 앵커를 기준으로 전체 타임라인을 깨끗하게 재구성하도록 유도함.

---

## 4. 해결 과정 및 최종 결과

### v3.0.3 (2026-04-26) — v3 마이그레이션 누락 케이스 재발견·영구 해결

v2 시점에 Single Anchor Principle로 해결됐던 본 이슈가, v3 4-테이블 DB 마이그레이션 시 `calculator.js`가 v2 호환 코드로 남아 다시 동작 불능 상태였음. 사용자 보고로 발견.

**증상**
- 젠 계산기에서 보스 선택 + 시간 계산 후 "보스 시간 업데이트" 클릭해도 실제 반영 안 됨 (시간표/대시보드/보스 스케쥴러 모두 옛 시간)

**근본 원인 (2개 버그 중첩)**
1. `BossDataManager.setBossSchedule()`이 v3 마이그레이션 시 로직이 축소되어 `scheduledDate` 변경을 처리하지 않고 `alerted_*`/`memo`만 update했음.
2. dropdown value의 schedule ID(string)가 DB enrich 결과의 `id`(number)와 `===` 비교에서 항상 불일치 → 매칭 실패로 setBossSchedule이 호출조차 안 됨.

**v3 호환 해결 (커밋 `9d721c7`)**
- `src/screens/calculator.js`의 `updateBossTimeButton` 핸들러를 v3 DB API 직접 호출로 재작성:
  - `parseInt(targetIdStr, 10)` → `DB.getSchedule(targetId)` 매칭
  - `DB.deleteSchedulesByBossId(bossId)` → `DB.addSchedule({ bossId, scheduledDate, memo, alerted_*: false })`
  - `BossDataManager.expandSchedule(activeGame)` 으로 48h 윈도우 재구성
- 보스 스케쥴러가 `v3_draft_${gameId}` Draft를 우선 로드하므로 DB만 갱신해서는 화면이 안 바뀜 → DB 업데이트 직후 Draft에도 동일 보스의 anchor를 single로 patch (Single Anchor Principle을 **DB와 Draft 양쪽에 일관 적용**).
- 회귀 테스트 149/149 PASS, 사용자 라이브 UI 검증으로 시간표/대시보드/보스 스케쥴러 모두 갱신 확인.

**관련 이슈**: [issue-029](issue-029-sync-v2-fixes-to-v3.md) (v2 → v3 패치 누락 추적)
**릴리즈**: [v3.0.3](https://github.com/bohe76/boss-alarm/releases/tag/v3.0.3) (2026-04-26)
