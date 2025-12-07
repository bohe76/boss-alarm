---
id: issue-014
title: "Document PiP (Picture-in-Picture) 위젯 도입"
status: "해결됨" # 미해결 | 진행 중 | 해결됨
priority: "High" # High | Medium | Low
assignee: "Agent"
labels:
  - "feature"
  - "pip"
created_date: "2025-12-07"
resolved_date: "2025-12-07"
---

# Issue-014: Document PiP (Picture-in-Picture) 위젯 도입

## 1. 개요 (Overview)
* 최신 브라우저의 Document Picture-in-Picture API를 활용하여, 대시보드의 '다음 보스' 정보를 별도의 소형 오버레이 창(위젯)에 표시하는 기능을 구현합니다. 이 위젯은 게임 등 다른 화면을 보면서도 다음 보스 정보를 항상 확인할 수 있도록 돕습니다.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
* 사용자가 게임 플레이 중에도 다음 보스 정보를 실시간으로 확인하고 싶어 하나, 현재는 메인 애플리케이션 화면을 열어야만 가능합니다. 이를 해결하기 위해 게임 화면 위에 항상 떠 있는 미니 위젯 형태로 핵심 정보를 제공해야 합니다.

## 3. 제안된 해결 방안 (Proposed Solution)
Document Picture-in-Picture API를 활용하여 대시보드의 '다음 보스' 정보를 담은 미니 브라우저 창을 제공합니다. 이 위젯은 보스 이름과 남은 시간을 표시하며, 메인 대시보드와 실시간으로 동기화됩니다. 사용자가 PiP 창의 크기를 수동으로 조절한 경우 해당 크기가 기억되며, 최초 실행 시에는 240x100px의 초기 크기로 열립니다.

## 4. 해결 과정 및 최종 결과

Document Picture-in-Picture (PiP) 위젯 도입 기능을 다음과 같은 단계로 구현하고 검증했습니다.

**0단계: UI/UX 구현**
*   **0.1. PiP 토글 버튼 UI 구현**: `index.html`의 '다음 보스' 카드 헤더에 PiP 토글 버튼을 추가하고 `src/styles/style.css`에 스타일을 정의했습니다. 아이콘 크기는 24px, 스트로크 너비는 1.2로 설정되었습니다.
*   **0.2. PiP 창을 위한 콘텐츠 HTML 파일 생성**: `src/pip-content.html` 파일을 생성하여 PiP 창에 표시될 보스 이름과 남은 시간을 위한 구조 및 스타일을 정의했습니다.

**1단계: 핵심 PiP 기능 구현**
*   **1.1. PiP 기능 관리자 (`pip-manager.js`) 생성**: PiP 창의 상태를 관리하고 열고 닫는 로직을 담당하는 모듈을 생성했습니다.
*   **1.2. PiP 창 열기/닫기 로직 구현**: `pip-manager.js`의 `togglePipWindow()` 함수에 `documentPictureInPicture.requestWindow()` 호출 로직을 구현했습니다. `pip-content.html`의 내용을 로드하여 삽입하고, `pagehide` 이벤트 리스너를 통해 창 닫힘 이벤트를 처리했습니다.
*   **1.3. 이벤트 리스너 연결 및 API 지원 확인**: `src/app.js`에서 Document PiP API 지원 여부를 확인하여 버튼 표시를 제어하고, `initEventHandlers`에 버튼 클릭 이벤트 리스너를 연결했습니다.

**2단계: 데이터 및 콘텐츠 동기화**
*   **2.1. PiP 콘텐츠 업데이트 로직 구현**: `pip-manager.js`의 `updatePipContent()` 함수를 구현하여 `BossDataManager`의 '다음 보스' 정보를 가져와 PiP 창의 `#pip-boss-name`, `#pip-remaining-time` 요소에 업데이트하도록 했습니다. `src/ui-renderer.js`의 `updateNextBossDisplay()` 함수에서 `isPipWindowOpen()` 확인 후 `updatePipContent()`를 호출하여 메인 화면과 PiP 창의 동기화를 보장했습니다.
*   **2.2. PiP 창 닫힘 이벤트 처리**: `pip-manager.js`에 `pagehide` 이벤트 리스너를 등록하여 사용자가 PiP 창을 수동으로 닫을 경우 내부 상태를 재설정하도록 했습니다.

**3단계: 통합 테스트**
*   **3.1. 시나리오 테스트**: 다음 시나리오를 통해 기능의 정상 동작을 확인했습니다.
    *   PiP 토글 버튼으로 위젯 열기/닫기
    *   메인 화면과 PiP 위젯의 '다음 보스' 정보 동기화
    *   PiP 위젯의 닫기 버튼 또는 메인 토글 버튼으로 닫기 후 재열기
    *   다른 화면 이동 후 대시보드 복귀 시 PiP 창 유지 및 동기화
    *   PiP 창의 초기 크기 240x100px 확인 및 사용자의 수동 크기 조정 기억 여부 확인

**추가 개선 사항 및 피드백 반영:**
*   사용자 피드백에 따라 SVG 아이콘 크기(24px) 및 스트로크 너비(1.2)를 조정했습니다.
*   PiP 창의 간결성 및 소형화를 위해 보스 출현 시간(검정 시간)을 제거하고, 보스 이름과 남은 시간만 표시하도록 UI를 수정했습니다.
*   PiP 창의 최초 실행 크기가 가로 240px, 세로 100px로 설정되도록 조정했습니다. 브라우저가 사용자의 수동 크기 조정을 기억하는 동작 방식이 요구사항에 부합함을 확인했습니다.

---