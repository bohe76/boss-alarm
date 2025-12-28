---
id: issue-019
title: "보스 스케줄러 입력 모드 정상 동작 하지 않음"
status: "미해결"
priority: "High"
assignee: ""
labels:
  - bug
  - scheduler
  - input-mode
created_date: "2025-12-29"
resolved_date: ""
---

# Issue-019: 보스 스케줄러 입력 모드 정상 동작 하지 않음

## 1. 개요 (Overview)
* 보스 스케줄러의 **입력 모드**가 정상적으로 동작하지 않고 있습니다.
* 텍스트 모드는 정상 동작 확인됨.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
* 입력 모드에서 보스 입력 폼이 Draft 데이터와 올바르게 동기화되지 않는 문제가 있음.
* 기존에 렌더링 로직이 변경되면서 발생한 사이드 이펙트로 추정됨.
* 정확한 원인 파악 및 로직 수정이 필요함.

## 3. 제안된 해결 방안 (Proposed Solution)
* **사용자와 로직에 대해 의논 필요**
* 입력 모드의 정확한 동작 방식(SSOT 바탕 출력, 사용자 입력 시 Draft 업데이트 등)을 사용자와 함께 정의한 후 수정 진행.
* `renderBossInputs` 함수의 데이터 소스(프리셋 vs Draft) 및 동기화 로직 재검토 필요.

## 4. 참고 사항
* 관련 파일:
  - `src/screens/boss-scheduler.js`
  - `src/ui-renderer.js` (`renderBossInputs` 함수)
* 텍스트 모드는 2025-12-29 커밋에서 정상 동작 확인됨.
