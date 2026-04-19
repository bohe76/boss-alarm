---
id: issue-034
title: "APP_VERSION/업데이트 공지 v2.17.7.1 잔존 — v3.0 반영 누락"
status: "진행 중"
priority: "High"
assignee: "Claude"
labels:
  - bug
  - release
  - v3.0
created_date: "2026-04-19"
resolved_date: ""
---

# Issue-034: APP_VERSION/업데이트 공지 v2.17.7.1 잔존 — v3.0 반영 누락

## 1. 개요 (Overview)

`feature/v3.0` 브랜치에서 코드/엔진은 v3 로 재작성됐으나, UI 노출용 버전 문자열과 업데이트 공지가 여전히 v2.17.7.1 상태. 푸터·모달·문의 URL 전부 구버전으로 보이며, 사용자 관점에서는 "v2 패치"로 오인될 수 있다.

## 2. 문제점 (Problem)

* **버전 상수:** `index.html:745` `window.APP_VERSION = "2.17.7.1"` — v3 엔진과 불일치
* **업데이트 공지:** `src/data/update-notice.json` 이 v2.17.7.1 의 "36시간 이상 보스 자동 갱신 버그" 관련 내용을 그대로 표시
* **파생 노출:**
  * 푸터 `v2.17.7.1`
  * 모달 헤더 `v2.17.7.1 업데이트 안내`
  * 문의하기 링크 `?appVersion=v2.17.7.1`
* **관련:**
  * `data/version_history.json` 최신 엔트리는 v2.17.7 — v3.0 릴리즈 노트 엔트리가 없음
  * CLAUDE.md "APP_VERSION: 숫자로만 관리 (예: 3.0.0), 'v' 접두사는 UI에서만 처리"

## 3. 제안된 해결 방안 (Proposed Solution)

1. **`index.html:745`** `window.APP_VERSION = "3.0.0"` 로 변경
2. **`src/data/update-notice.json`** v3.0 메이저 릴리즈에 맞는 내용으로 재작성 (또는 빈 공지 구조로 초기화)
3. **`data/version_history.json`** 맨 앞에 v3.0.0 엔트리 추가 — v3 하이라이트(4-테이블 DB, 폼 입력 전용, 48h 자동 확장 등)
4. **`docs/unreleased_changes.md`** 의 최신 내역을 `version_history.json` 에 병합 후 초기화

## 4. 검증 절차 (Verification)

1. 앱 로드 시 푸터 `v3.0.0` 표시 확인
2. 업데이트 공지 모달이 v3 내용 또는 비노출 상태인지 확인
3. 문의하기 링크 `appVersion=v3.0.0` 파라미터 포함 확인
4. 릴리즈 노트 화면에서 v3.0.0 엔트리 최상단 노출

## 5. 관련 파일

* `index.html`
* `src/data/update-notice.json`
* `data/version_history.json`
* `docs/unreleased_changes.md`
