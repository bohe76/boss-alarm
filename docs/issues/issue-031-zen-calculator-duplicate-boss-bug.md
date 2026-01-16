---
id: issue-031
title: "젠 계산기 업데이트 시 보스 중복 생성 버그 수정"
status: "진행 중"
priority: "High"
assignee: "Antigravity"
labels:
  - bug
  - calculator
  - SSOT
created_date: "2026-01-16"
resolved_date: ""
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
