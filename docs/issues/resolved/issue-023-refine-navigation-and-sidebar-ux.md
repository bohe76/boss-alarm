---
id: issue-023
title: "네비게이션 시스템 개선 및 PC 사이드바 UX 고도화"
status: "해결됨"
priority: "High"
assignee: "Antigravity"
labels:
  - UI/UX
  - Refactoring
  - Mobile-Friendly
created_date: "2025-12-30"
resolved_date: "2025-12-30"
---

# Issue-023: 네비게이션 시스템 개선 및 PC 사이드바 UX 고도화

## 1. 개요 (Overview)
기존 PC 뷰의 사이드바 확장 방식은 본문 영역을 밀어내는 레이아웃 시프트를 유발하여 시각적 안정성이 떨어졌습니다. 또한 모바일 접근성을 높이기 위해 하단 네비게이션에 주요 기능을 추가할 필요가 있었습니다.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
*   PC에서 사이드바 토글 시 메인 콘텐츠 크기가 변하면서 레이아웃이 출렁이는 현상 발생.
*   햄버거 버튼 클릭이라는 추가 동작이 메뉴 확인에 대한 인지 부하를 높임.
*   모바일 환경에서 '보스 스케줄러'로의 접근이 사이드바 메뉴를 통해서만 가능하여 동선이 길음.

## 3. 제안된 해결 방안 (Proposed Solution)
*   **PC 사이드바**: 호버-확장 오버레이(Hover-to-Expand Overlay) 방식으로 전환. 64px의 아이콘 레일은 유지하되, 마우스 호버 시 메뉴 텍스트 레이어만 본문 위로 떠서 펼쳐지도록 CSS 및 구조 개선.
*   **모바일 네비게이션**: 하단 탭 바에 '보스 스케줄러' 메뉴를 추가하여 총 5개 메뉴 체계로 확장.
*   **상태 관리**: 사이드바의 영속적 상태 저장 로직을 제거하고 실시간 호버 반응형(Stateless)으로 단순화.

## 4. 해결 과정 및 최종 결과
1.  **HTML 수정**: 헤더에서 `#sidebarToggle` 버튼을 제거하고, 모바일 하단 네비게이션에 `boss-scheduler` 링크 추가.
2.  **CSS 고도화 (`layout.css`)**: 
    *   PC에서 사이드바 너비를 64px로 고정하고 `overflow: visible` 설정.
    *   `.sidebar-menu`를 `position: absolute`로 설정하고 호버 시 `width` 애니메이션(0.3s) 적용.
    *   마우스 이탈 시 지연 없는 즉각적 복귀를 위해 `transition: width 0s` 적용.
3.  **JavaScript 리팩토링**:
    *   `app.js`에서 사이드바 토글 이벤트 리스너 및 툴팁 로직 제거 (전체 확장으로 대체).
    *   `data-managers.js`의 `LocalStorageManager`에서 `sidebarExpandedState` 관련 로직 완전 삭제.
    *   `dom-elements.js`에서 제거된 엘리먼트 참조 정리.
4.  **검증**: PC 브라우저에서 레이아웃 시프트 없이 메뉴가 부드럽게 오버레이되는 것을 확인하고, 모바일 탭 바 동작 정합성 확인 완료.
