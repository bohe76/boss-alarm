# UI/GUI 개선 및 카드 시스템 통일 (1차) 문서

본 문서는 프로젝트의 전반적인 UI/GUI 개선 및 카드 시스템 통일 작업을 통해 이루어진 변경 사항을 기록합니다.

## 1. 카드 시스템 통일

*   **새로운 카드 스타일 및 크기 클래스 정의:**
    *   `.card-standard` (표준 카드) 및 `.card-list-item` (리스트 아이템 카드) 정의.
    *   `.card-size-standard` (최대 380px), `.card-size-small` (최대 170px), `.card-size-list` (최대 800px) 크기 클래스 정의.
*   **HTML 구조 및 클래스 적용:**
    *   `index.html` 및 `src/ui-renderer.js`에서 기존 카드 관련 HTML 구조 및 클래스를 새로 정의된 클래스 (`.card-standard`, `.card-list-item`, `.card-size-*`)로 변경 및 적용.
*   **CSS 정리:**
    *   `src/style.css`에서 기존 카드 관련 불필요한 CSS 규칙 (`.calculator-card`, `.boss-list-display-container` 등) 제거 및 통합.

## 2. UI/레이아웃 개선 상세

*   **알림 로그 개선:**
    *   `alarm-log.js` 및 `src/style.css` 수정으로 알림 로그의 불릿 표시 문제 해결.
    *   `logger.js`, `src/screens/alarm-log.js`, `src/ui-renderer.js` 수정으로 중요 로그의 색상 표시 문제 해결.
*   **카드 너비 계산 일관성 확보:**
    *   `.card-standard` 클래스에 `box-sizing: border-box;` 추가하여 너비 계산 문제 수정.
*   **'계산기' 화면 레이아웃:**
    *   젠 계산기 및 광 계산기 카드를 반응형으로 배치 (`index.html`, `src/style.css`).
    *   '도움말', '릴리즈 노트', '보스 설정' 화면의 제목 정렬 및 콘텐츠 너비 조정 (`index.html`).
*   **플레이스홀더 스타일:**
    *   플레이스홀더 텍스트 색상을 #999로 변경 (`src/style.css`).
*   **'젠 계산기' 입력/표시 필드:**
    *   '남은 시간' 입력창 및 '보스 출현 시간' 표시 영역의 높이 및 정렬 개선 (`src/style.css`, `index.html` 플레이스홀더 포함).
    *   `.zen-grid-row` 내부 요소들의 `align-items: flex-start;` 제거하여 젠 계산기 내부 요소들의 가로 정렬 문제 해결 (`src/style.css`).