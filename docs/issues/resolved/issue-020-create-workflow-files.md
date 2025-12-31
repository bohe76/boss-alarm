---
id: issue-020
title: "워크플로우 파일 작성"
status: "해결됨"
priority: "Low"
assignee: "Antigravity"
labels:
  - enhancement
  - workflow
  - automation
created_date: "2025-12-29"
resolved_date: "2025-12-31"
---

# Issue-020: 워크플로우 파일 작성

## 1. 개요 (Overview)
* `.agent/workflows/` 폴더에 프로젝트별 워크플로우 파일을 작성하여 반복 작업을 자동화합니다.
* slash-command (`/명령어`) 형태로 사용 가능합니다.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
* 현재 프로젝트에 워크플로우 파일이 없어 반복 작업 시 매번 수동으로 지시해야 함.
* 자주 사용하는 작업들을 워크플로우로 만들어 생산성 향상 필요.

## 3. 제안된 해결 방안 (Proposed Solution)
* **사용자와 의논하여 어떤 워크플로우를 만들지 결정 필요**
* 후보 워크플로우:
  - `/업무준비` - 6개 핵심 문서 학습
  - `/검증` - lint + test 실행
  - `/린트` - 린트 에러 자동 수정
  - `/문서업데이트` - 핵심 문서 업데이트
  - `/커밋` - 변경사항 커밋 자동화
  - `/배포` - 배포 절차 자동화

## 4. 해결 과정 및 최종 결과 (Resolution Process & Final Result)
* **워크플로우 설계:** 핵심 반복 작업 6종(/업무준비, /검증, /린트, /문서업데이트, /커밋, /배포)을 정의함.
* **파일 생성:** `.agent/workflows/` 폴더 내에 각 명령어별 `.md` 파일을 생성하여 실행 로직을 기술함.
* **기능 특징:**
    - `/린트`: `turbo` 모드 수준의 자동 수정을 위해 승인 없이 반복 실행하는 로직 적용.
    - `/배포`: 프로젝트의 버전 관리 원칙(숫자 관리, 접두사 처리 등)을 준수하도록 설계.
* **검증:** 생성된 파일이 프로젝트 도구 체계(Lint, Test)와 호환됨을 확인함.


## 5. 참고 사항
* 워크플로우 파일 위치: `.agent/workflows/`
* 파일명이 slash-command 이름이 됨 (예: `deploy.md` → `/deploy`)
* `// turbo` 주석으로 자동 실행 단계 지정 가능
