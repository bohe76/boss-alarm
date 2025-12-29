---
id: issue-021
title: "로컬 스토리지 관리 및 데이터 매니저 구조 리팩토링"
status: "미해결"
priority: "High"
assignee: "Antigravity"
labels:
  - refactor
  - architecture
  - localstorage
created_date: "2025-12-29"
resolved_date: ""
---

# Issue-021: 로컬 스토리지 관리 및 데이터 매니저 구조 리팩토링

## 1. 개요 (Overview)
* 현재 `src/data-managers.js` 파일 내에 `BossDataManager`와 `LocalStorageManager`가 공존하고 있으며, 이로 인해 대규모 코드 수정 시 모듈 누락이나 결합도 증가 등의 아키텍처적 위험이 확인되었습니다.
* 로컬 스토리지에 저장되는 다양한 상태값(설정, 로그 가시성, 계산기 기록 등)의 관리 방식이 파편화되어 있어 이를 체계화할 필요가 있습니다.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
* **결합도 문제**: 서로 다른 책임을 가진 두 매니저가 한 파일에 있어 관리가 어렵고, 실수로 코드를 삭제할 위험이 큼 (최근 `LocalStorageManager` 누락 사고 발생).
* **데이터 무결성**: 로컬 스토리지 키값이 하드코딩되어 있거나 분산되어 있어 추적이 어려움.
* **유지보수성**: `LocalStorageManager` 내부 로직이 비대해져 코드 가독성이 떨어짐.

## 3. 제안된 해결 방안 (Proposed Solution)
* **파일 분리**: `LocalStorageManager`를 별도의 파일(`src/local-storage-manager.js`)로 분리하여 역할과 책임을 분산.
* **상태 관리 체계화**: 각각의 상태(Settings, Stats, Shared)를 관리하는 작은 서브 매니저나 공통 인터페이스 도입 검토.
* **키 관리 중앙화**: 모든 로컬 스토리지 키를 상수로 관리하여 오타 및 중복 방지.
* **안정성 강화**: 데이터 로드/저장 시 예외 처리를 강화하고 마이그레이션 로직을 상시화.
