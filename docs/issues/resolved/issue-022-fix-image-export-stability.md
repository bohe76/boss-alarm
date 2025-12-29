---
id: issue-022
title: "내보내기(Export) 모달 이미지 캡처 오류 및 안정성 개선"
status: "해결됨"
priority: "High"
assignee: "Antigravity"
labels:
  - bug
  - ui/ux
  - enhancement
created_date: "2025-12-30"
resolved_date: "2025-12-30"
---

# Issue-022: 내보내기(Export) 모달 이미지 캡처 오류 및 안정성 개선

## 1. 개요 (Overview)
* 보스 시간표 내보내기 기능 중 '이미지 저장' 시 캡처할 영역을 찾지 못하는 오류(`boss-list-table` ID 누락 등)를 해결하고, 전반적인 내보내기 안정성을 강화합니다.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
* **캡처 오류**: '표 형태' 내보내기 시 캡처 대상 엘리먼트의 ID가 렌더링되지 않아 이미지를 저장할 수 없는 현상 발생.
* **실시간 프리뷰 부재**: 모달에서 옵션을 변경해도 배경의 시간표 UI가 즉시 업데이트되지 않아 사용자가 결과를 미리 확인하기 어려움.
* **자동 새로고침 간섭**: 1초마다 실행되는 자동 새로고침 로직이 모달의 프리뷰 상태를 원래의 메인 설정으로 덮어씌워 화면이 깜빡이는 현상(Flickering) 발생.
* **연타 방지 미흡**: 이미지 생성 시 버튼을 여러 번 누르면 중복 다운로드가 발생하는 UX 문제.

## 3. 제안된 해결 방안 (Proposed Solution)
* **ID 보강**: `ui-renderer.js`의 표 형태 렌더링 로직에 `boss-list-table` ID를 확실하게 부여.
* **실시간 프리뷰 엔진**: 모달 옵션 변경 시 `syncTimetablePreview`를 통해 배경 UI를 즉시 동기화.
* **상태 백업 및 복원**: 모달 오픈 시 현재 화면 상태를 백업하고, 닫을 때(또는 내보내기 성공 시) 완벽하게 복구.
* **새로고침 가드**: 모달이 열려 있는 동안은 자동 새로고침을 일시 중지.
* **더블 클릭 방지**: 작업 중 버튼 비활성화 및 "이미지 생성중..." 상태 메시지 표시.

## 4. 해결 과정 및 최종 결과 (Final Result)
1.  **`ui-renderer.js` 수정**: 표 모드 렌더링 시 전체를 감싸는 컨테이너에 ID를 부여하고, 보스가 없을 때도 구조가 유지되도록 예외 처리 보강.
2.  **`timetable.js` 리팩토링**:
    *   `syncTimetablePreview`와 설정 키를 최상위 스코프로 이동하여 참조 오류(`ReferenceError`) 해결.
    *   모달 오픈 시 `async/await`를 사용하여 화면 전환 후 프리뷰가 완료될 때까지 대기.
    *   `startAutoRefresh` 로직에 모달 오픈 여부 체크 가드 추가.
    *   다운로드 성공 `alert` 확인 직후에 복원 로직이 실행되도록 순서 조정.
3.  **버튼 하이재킹 방지**: `exportExecuteBtn` 클릭 시 `disabled=true` 및 텍스트 변경 로직을 `try...finally` 블록으로 구현하여 안전성 확보.
4.  **검증**: `npm run lint` 및 `npm test`를 통해 코드 정합성 및 기존 기능 회귀 테스트 통과.
