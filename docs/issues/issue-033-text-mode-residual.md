---
id: issue-033
title: "텍스트 모드 제거 미완료 — UI/파서/호출처 전부 잔존"
status: "진행 중"
priority: "High"
assignee: "Claude"
labels:
  - bug
  - cleanup
  - v3.0
created_date: "2026-04-19"
resolved_date: ""
---

# Issue-033: 텍스트 모드 제거 미완료 — UI/파서/호출처 전부 잔존

## 1. 개요 (Overview)

`CLAUDE.md` 및 세션 인수인계 문서에는 "v3: 텍스트 모드 제거됨, 폼 기반 입력 전용"이라 명시되어 있으나 실제 코드/HTML 에는 텍스트 모드 UI·파서·호출 로직이 모두 살아 있다. 사용자가 "텍스트 모드" 탭을 클릭하면 실제로 입력 영역이 표시되어 v3 계약과 배치되는 동작이 노출된다.

## 2. 문제점 (Problem)

* **UI 잔존:**
  * `index.html:606` `<button id="tab-scheduler-text" class="tab-button">텍스트 모드</button>`
  * `scheduler-text-mode-section` 영역 + `schedulerBossListInput` textarea 존재
  * 브라우저에서 클릭 시 탭 활성 클래스 정상 토글, 섹션 표시/숨김도 정상 동작 (= 데드코드 아님)

* **파서 및 호출처 잔존:**
  * `src/boss-parser.js` 파일 자체 존재 + `parseBossList` export
  * `src/app.js:3, 292` — import 및 호출
  * `src/screens/boss-scheduler.js:3, 258, 336` — import 및 호출
  * `src/dom-elements.js:117` `schedulerTextModeSection` DOM 참조

* **스모크 테스트 재현 증거:**
  * 텍스트 모드 버튼 클릭 → `tab-scheduler-text` 에 `active` 클래스 부여, `display: block`
  * textarea 에 `"04.19"` 같은 잔재 값 자동 삽입 관찰됨 (별도 파싱 오류 가능성)

* **파급 영향:**
  * 사용자가 v3에서 의도치 않게 텍스트 모드로 진입 시 검증되지 않은 경로로 작동
  * 문서·코드 간 SSOT 불일치 → 향후 개발자 혼선
  * 텍스트 모드 ↔ 간편 모드 전환 시 confirm 다이얼로그가 그대로 떠서 E2E 검증 방해

## 3. 제안된 해결 방안 (Proposed Solution)

**1단계 — UI 삭제:**
* `index.html` 에서 탭 토글(`.modal-tabs`)·`scheduler-text-mode-section` 제거, 남은 `scheduler-smart-input-section` 은 단일 컨테이너로 평탄화
* `styles.css` 에서 `tab-button`·`scheduler-tab-content` 클래스 사용처 확인 후 영향 없는 선에서 제거

**2단계 — 코드 제거:**
* `src/boss-parser.js` 파일 삭제
* `src/app.js`·`src/screens/boss-scheduler.js` 에서 `parseBossList` import/호출 전부 제거
* 관련 헬퍼(`syncTextToInput`, `syncInputToText`)가 간편 모드에서만 쓰이는지 감사 후 단순화
* `src/dom-elements.js::schedulerTextModeSection`·`schedulerBossListInput` 등 제거

**3단계 — 데이터 파일:**
* `data/feature_guide.json`, `data/faq_guide.json` 의 텍스트 모드 설명 섹션 제거 또는 v3 전용 설명으로 재작성

## 4. 검증 절차 (Verification)

1. 보스 스케줄러 화면에 "텍스트 모드" 탭/버튼 미노출 확인
2. `grep -r "parseBossList" src/` 결과 0건
3. `grep -r "scheduler-text-mode-section\|schedulerBossListInput" .` 결과 0건
4. 기존 122 테스트 green 유지
5. 텍스트 모드 제거 후 간편 입력 단일 화면에서 모든 입력 시나리오 수동 확인

## 5. 관련 파일

* `index.html`
* `src/boss-parser.js` (삭제 대상)
* `src/app.js`
* `src/screens/boss-scheduler.js`
* `src/dom-elements.js`
* `data/feature_guide.json`, `data/faq_guide.json`
