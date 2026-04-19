---
id: issue-035
title: "최초 접속 알림 안내를 alert() 대신 배너/토스트로 교체"
status: "보류 (Won't Fix)"
priority: "Medium"
assignee: "Claude"
labels:
  - ux
  - accessibility
  - v3.0
  - wontfix
created_date: "2026-04-19"
resolved_date: ""
---

> **결정 (2026-04-19):** 릴리즈 범위에서 제외. 기존 alert 동작 유지. 향후 배너 UI 설계가 확정되면 재개 예정.



# Issue-035: 최초 접속 알림 안내를 alert() 대신 배너/토스트로 교체

## 1. 개요 (Overview)

앱 최초 접속 시 브라우저 기본 `alert()` 다이얼로그로 "알림 기능 활성화 안내" 를 띄우고 있어 UX·접근성·E2E 자동화 모두에 부담을 준다. 배너/토스트 UI 로 교체하여 블로킹 다이얼로그 사용을 회피한다.

## 2. 문제점 (Problem)

* **현상:** 첫 로드 시 `alert("알림 기능은 브라우저 정책에 따라 최초 접속 시 자동으로 비활성화됩니다...")` 가 페이지 렌더를 블로킹
* **문제:**
  * 접근성: alert 은 모달이며 스크린리더/키보드 포커스를 페이지에서 강제 이탈시킨다
  * 모바일: 브라우저 주소창 하단에 추가 UI가 덮여 사용자 체감 UX 저하
  * E2E: `bohe-e2e-testing-tool-guide` 경고대로 모달 다이얼로그는 자동화 세션을 중단시키며, 이번 스모크 테스트에서도 3회 연속 `handle_dialog` 필요

## 3. 제안된 해결 방안 (Proposed Solution)

* 상단 또는 푸터 인접 영역에 노란색 인포 배너(dismissible) 추가
* "닫기" 버튼 클릭 시 `v3_settings.initialAlarmNoticeDismissed = true` 저장하여 재노출 방지
* 스타일은 기존 `update-notice` 모달의 경량 배너 변형 재활용 가능
* 필요 시 toast 라이브러리 대신 순수 CSS/JS 구현

## 4. 검증 절차 (Verification)

1. 첫 접속 시 `alert` 미노출, 상단 배너만 표시
2. 배너 "닫기" 후 새로고침에도 재노출 안 됨 (localStorage 반영)
3. Playwright MCP 스모크 테스트가 `handle_dialog` 없이 진행 가능
4. 배너에 `role="status"` 또는 `aria-live="polite"` 부여하여 접근성 충족

## 5. 관련 파일

* `index.html` 또는 `src/app.js` (alert 호출부)
* `src/ui-renderer.js` / 새 배너 컴포넌트
* `src/data-managers.js::LocalStorageManager` (플래그 저장)
