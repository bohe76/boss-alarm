---
id: issue-030
title: "GitHub Pages 배포 타임아웃 오류 (GitHub 자체 시스템 장애)"
status: "해결됨"
priority: "High"
assignee: "Antigravity"
labels:
  - build
  - deployment
  - infra
created_date: "2026-01-14"
resolved_date: "2026-01-14"
---

# Issue-030: GitHub Pages 배포 타임아웃 오류 (GitHub 자체 시스템 장애)

## 1. 개요 (Overview)
* GitHub Pages 배포 과정 중 `deploy` 단계에서 10분 이상 지연되다가 타임아웃(`Timeout reached, aborting!`)으로 실패하는 현상 발생.
* 이전까지는 정상 작동했으나, 특정 시점부터 갑자기 발생하기 시작함.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
* **현상:** GitHub Actions의 `build` 단계는 20~30초 내에 완료되나, `deploy` 단계에서 장시간 멈춤 현상 발생.
* **원인:** 초기 분석 시 Jekyll 엔진과 한글 파일명 간의 충돌을 의심했으나, 최종적으로 **GitHub 서비스 자체의 일시적인 시스템 장애 및 배포 엔진 지연**으로 확인됨.

## 3. 제안된 해결 방안 (Proposed Solution)
* **시스템 복구 대기:** GitHub 자체 문제이므로 서비스 정상화를 대기함.
* **선제적 배포 최적화:** 장애와 무관하게, 향후 잠재적인 Jekyll 빌드 병목을 원천 차단하기 위해 프로젝트 루트에 `.nojekyll` 파일을 추가하여 정적 파일을 직접 배포하도록 구성.
* **보안 강화 및 파일 정리:** 배포 안정성과 별개로, 보안 키가 포함된 `.env` 파일을 제거하고 미사용 패키지(Supabase, OneSignal)를 정리하여 프로젝트 무결성 확보.
* **규칙 명문화:** `GEMINI.md`에 배포 환경 안정화 및 보안 지침을 영구 반영.

## 4. 해결 과정 및 최종 결과
1. **원인 분석:** 초기에는 `.agent/workflows/` 내 한글 파일명이 Jekyll 엔진과 충돌한다고 판단했으나, GitHub Pages 전체 서비스의 일시적 장애가 겹치며 발생한 해프닝으로 판명됨.
2. **최적화 조치:** 향후 유사한 환경 이슈를 방지하기 위해 `.nojekyll` 파일을 생성하여 배포 효율을 극대화함.
3. **파일 관리 강화:** 한글 파일명이 포함된 `.agent/workflows/` 폴더를 로컬에서만 사용하도록 `.gitignore`를 정비하여 배포 프로세스를 보다 단순화함.
4. **보안 및 클린업:** 노출 위험이 있던 `.env` 파일을 제거하고, 프로젝트 초기 설정 중 남은 불필요한 의존성(Supabase 등)을 모두 제거하여 시스템을 경량화함.
5. **검증:** GitHub 시스템 복구 이후, 최적화된 설정으로 배포가 1분 이내에 완료되는 것을 확인.
6. **지침 업데이트:** `GEMINI.md`에 해당 사례를 바탕으로 한 배포 환경 안정화 정책을 기록.
