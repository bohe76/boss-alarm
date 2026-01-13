---
id: issue-030
title: "GitHub Pages 배포 타임아웃 오류 (Jekyll 엔진 충돌)"
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

# Issue-030: GitHub Pages 배포 타임아웃 오류 (Jekyll 엔진 충돌)

## 1. 개요 (Overview)
* GitHub Pages 배포 과정 중 `deploy` 단계에서 10분 이상 지연되다가 타임아웃(`Timeout reached, aborting!`)으로 실패하는 현상 발생.
* 이전까지는 정상 작동했으나, 특정 시점부터 갑자기 발생하기 시작함.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
* **현상:** GitHub Actions의 `build` 단계는 20~30초 내에 완료되나, `deploy` 단계에서 장시간 멈춤 현상 발생.
* **원인:** GitHub Pages의 기본 정적 사이트 빌더인 Jekyll 엔진이 프로젝트 내 특정 구조나 파일명(특히 워크플로우 관련 한글 파일명)을 처리하는 과정에서 병목 발생.
* **보안 취약점:** 분석 중 `.env` 파일과 같이 보안 키가 포함된 파일이 Git에 포함되어 배포 대상에 스캔되는 문제 발견.

## 3. 제안된 해결 방안 (Proposed Solution)
* **Jekyll 엔진 비활성화:** 프로젝트 루트에 `.nojekyll` 파일을 추가하여 GitHub Pages가 Jekyll 빌드 과정을 생략하고 정적 파일을 직접 배포하게 함. (한글 파일명 및 특수 폴더 처리 이슈 회피)
* **보안 강화 및 파일 정리:** Git 추적에서 `.env` 파일을 제거하고, 미사용 외부 서비스(Supabase, OneSignal) 관련 로직 및 파일을 정리하여 배포 산출물 크기 최적화.
* **규칙 명문화:** `GEMINI.md`에 배포 환경 안정화 지침 추가.

## 4. 해결 과정 및 최종 결과
1. **원인 분석:** 최근 커밋에서 추가된 `.agent/workflows/` 내 한글 파일명(`배포준비.md` 등)이 Jekyll 엔진과 충돌하여 무한 루프 또는 극심한 지연을 유발함을 확인.
2. **배포 환경 안정화:** 루트에 `.nojekyll` 파일을 생성하여 Jekyll 빌드를 건너뛰도록 설정.
3. **보안 조치:** 실수로 추적 중이던 `.env` 파일을 `git rm --cached`로 제거하고 `.gitignore`에 등록.
4. **불필요 리소스 정리:** Supabase, OneSignal 등 현재 프로젝트에서 사용하지 않는 외부 서비스 관련 코드와 환경 변수를 모두 삭제하여 사이트 경량화.
5. **검증:** 조치 후 배포가 약 1분 내외로 정상 완료됨을 확인.
6. **지침 업데이트:** `GEMINI.md`에 해당 내용을 기록하여 향후 재발 방지.
