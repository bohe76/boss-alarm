---
id: issue-029
title: "v2 패치 내역의 V3 엔진 동기화 및 지식 이식 전략 수립"
status: "미해결"
priority: "High"
assignee: "에이전트"
labels:
  - refactor
  - v3-migration
  - lts-sync
created_date: "2026-01-10"
resolved_date: ""
---

# Issue-029: v2 패치 내역의 V3 엔진 동기화 및 지식 이식 전략 수립

## 1. 개요 (Overview)
* 서비스 중인 v2(LTS) 브랜치(`main`)에서 발생한 긴급 패치 및 버그 수정 사항을 차세대 V3 엔진 브랜치에 안전하게 이식하기 위한 관리 이슈입니다.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
* **아키텍처 단절**: v2는 이름 기반, V3는 UID 기반 데이터 관리 방식을 사용하므로 직접적인 `git merge`가 불가능하며, 병합 시 V3 아키텍처가 훼손될 위험이 큼.
* **지식 유실 방지**: v2.17.3에서 해결된 '중복 방지', '지능형 회귀', '목록 삭제 폴백' 등의 중요 안정화 로직이 V3 엔진에 누락되지 않아야 함.
* **행동 지침 불일치**: 에이전트의 핵심 행동 강령(`GEMINI.md`)과 워크플로우 파일들이 브랜치별로 파편화되어 업무 효율이 저하될 우려가 있음.

## 3. 제안된 해결 방안 (Proposed Solution)
* **선별적 재구현 (Manual Porting)**: v2의 수정 사항을 단순 복사가 아닌, V3 엔진의 아키텍처(Draft, SSOT, UID)에 최적화된 코드로 재구현함.
* **메타 문서 동기화**: `GEMINI.md`의 행동 강령(핵심 문서 리스트 등)과 `.agent/workflows/` 디렉토리를 수동으로 동기화하여 에이전트의 일관성을 확보함.
* **이슈 기반 추적**: 향후 `main` 브랜치에서 패치가 발생할 때마다 본 이슈 혹은 하위 이슈를 통해 V3 이식 여부를 반드시 체크함.

---
## 4. 해결 과정 및 최종 결과

### v3.0.3 (2026-04-26) — 젠 계산기 핸들러 v3 마이그레이션 누락 발견·이식

- `src/screens/calculator.js`의 보스 시간 업데이트 핸들러가 v3 4-테이블 DB 마이그레이션 시 v2 호환 코드(string ID 매칭, `setBossSchedule()` 우회 시간 변경)로 남아 동작 불능이던 케이스를 사용자 보고로 발견.
- v3 DB API 직접 호출(`DB.getSchedule` → `deleteSchedulesByBossId` → `addSchedule` → `expandSchedule`)로 재작성. Single Anchor Principle을 **DB와 Draft 양쪽에 일관 적용**하여 보스 스케쥴러 화면 동기화 누락도 함께 해결.
- 상세는 [issue-031](issue-031-zen-calculator-duplicate-boss-bug.md) 참조.
- 본 이슈는 향후 추가 누락 케이스가 발견될 때마다 재활용 (status 유지: 미해결).
