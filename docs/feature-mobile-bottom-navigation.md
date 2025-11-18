# 상세 기획서: 모바일 하단 탭 바 네비게이션

## 1. 개요
모바일 환경에서의 사용자 경험(UX)을 극대화하기 위해, 기존의 왼쪽 사이드바를 화면 하단에 고정되는 '하단 탭 바'로 대체한다. 이 문서는 해당 기능의 상세 설계와 구현 계획을 정의한다.

**참고:** 기존의 툴팁 기능은 마우스 오버 시에만 동작하므로, 모바일 환경에는 적용되지 않으며 데스크톱 전용 기능으로 유지된다.

## 2. 대상 화면 및 분기점
- **적용 대상:** 모바일 디바이스
- **CSS 분기점 (Breakpoint):** `768px` 이하의 화면 너비 (`@media (max-width: 768px)`)

## 3. 상세 설계

### 3.1. HTML 구조 변경 (`index.html`)
1.  **하단 탭 바 추가:** `<body>` 태그가 닫히기 직전에, 모바일 전용 하단 탭 바를 위한 새로운 `<nav>` 요소를 추가한다.
    ```html
    <nav id="bottom-nav" class="bottom-nav">...</nav>
    ```
2.  **탭 바 아이템:** 4개의 주요 메뉴와 '더보기' 버튼으로 구성되며, 아이콘과 텍스트 레이블을 포함한다. 웹 접근성을 위해 적절한 `aria-label` 속성을 사용한다.
    ```html
    <a href="#" id="bottom-nav-dashboard" data-screen="dashboard-screen" class="active">
      <svg>...</svg>
      <span>대시보드</span>
    </a>
    ...
    <button id="more-menu-button" aria-expanded="false">
      <svg>...</svg>
      <span>더보기</span>
    </button>
    ```
3.  **'더보기' 메뉴 (사이드바 재사용):** 기존의 `<nav id="sidebar">`를 '더보기' 클릭 시 나타나는 전체 메뉴 오버레이로 재사용한다.
4.  **백드롭 추가:** '더보기' 메뉴가 활성화될 때, 메뉴 뒤의 메인 콘텐츠를 덮는 백드롭 요소 `<div id="sidebar-backdrop">`를 활용한다.

### 3.2. CSS 스타일 변경 (`style.css`)
1.  **미디어 쿼리:** 모든 모바일 전용 스타일은 `@media (max-width: 768px) { ... }` 블록 내에 작성한다.
2.  **기존 사이드바 숨기기:** 모바일에서 `#sidebar`를 기본적으로 숨긴다.
3.  **하단 탭 바 스타일:**
    - `position: fixed`, `bottom: 0`, `width: 100%`, 높은 `z-index`.
    - `display: flex`, `justify-content: space-around`.
    - **활성 상태 스타일:** 현재 활성화된 탭 아이템에 `.active` 클래스를 적용하여 아이콘과 텍스트 색상을 다르게 표시한다.
    - **안전 영역:** iPhone의 홈 인디케이터 등을 고려하여 `padding-bottom`을 추가한다.
4.  **메인 콘텐츠 패딩:** 하단 탭 바가 콘텐츠를 가리지 않도록 `<main>`의 `padding-bottom`을 탭 바의 높이만큼 추가한다.
5.  **'더보기' 메뉴 오버레이 스타일:**
    - 모바일에서 `#sidebar`가 `.more-menu-open` 클래스를 가질 때의 스타일을 정의한다.
    - `position: fixed`, `top: 0`, `z-index` 최상위.
    - **애니메이션:** `opacity`와 `transform` 속성에 `transition`을 적용하여 부드럽게 나타나고 사라지는 효과를 추가한다.
6.  **백드롭 스타일:**
    - `.sidebar-backdrop.active`일 때만 보이도록 처리하며, 반투명한 배경색을 적용한다.

### 3.3. JavaScript 로직 변경
1.  **`dom-elements.js`:**
    - 하단 탭 바 관련 ID를 추가한다: `bottomNav`, `bottomNavDashboard`, `bottomNavBossManagement`, `bottomNavCalculator`, `bottomNavShare`, `moreMenuButton`, `sidebarBackdrop`.
2.  **`event-handlers.js`:**
    - **`initMobileNavHandlers` (신규):** 모바일용 이벤트 핸들러 초기화 함수를 만든다.
    - **하단 탭 클릭 이벤트:** 탭 클릭 시 `showScreen`을 호출하고, 모든 탭에서 `.active` 클래스를 제거한 후 클릭된 탭에만 추가하는 '활성 상태 관리' 로직을 포함한다.
    - **'더보기' 버튼 클릭 이벤트:** '더보기' 버튼 클릭 시 `#sidebar`와 `#sidebar-backdrop`에 `.active` 클래스를 토글하고, 접근성을 위해 `aria-expanded` 속성을 `true`/`false`로 업데이트한다.
    - **백드롭 클릭 이벤트:** 백드롭 클릭 시 '더보기' 메뉴를 닫는다.
3.  **`initApp()`:**
    - 앱 초기화 시, 화면 너비를 확인하여 모바일 뷰일 경우 `initMobileNavHandlers`를 호출하도록 로직을 추가한다.

## 4. 구현 단계
1.  **1단계 (HTML):** `index.html`에 하단 탭 바를 위한 `<nav id="bottom-nav">` 구조를 추가한다.
2.  **2단계 (CSS):** 미디어 쿼리를 사용하여 모바일에서 왼쪽 사이드바를 숨기고, 기본 스타일만 적용된 하단 탭 바가 나타나도록 한다.
3.  **3단계 (JS):** `dom-elements.js`와 `event-handlers.js`를 수정하여 하단 탭 바의 화면 전환 기능이 동작하도록 구현한다.
4.  **4단계 (CSS/JS):** '더보기' 버튼 클릭 시 전체 메뉴 오버레이와 백드롭이 나타나고 사라지는 기능을 구현한다.
5.  **5단계 (CSS):** 하단 탭 바, 아이콘, 텍스트, 전체 메뉴 오버레이, 안전 영역 처리 등 모든 세부 스타일을 다듬는다.
6.  **6단계 (테스트):** 데스크톱과 모바일 뷰를 번갈아 가며 레이아웃이 깨지거나 기능이 오작동하지 않는지 철저히 테스트한다.

## 5. 주요 결정사항
- 하단 탭 바에 고정될 4개의 주요 메뉴는 **대시보드, 보스 설정, 계산기, 공유**로 확정한다.