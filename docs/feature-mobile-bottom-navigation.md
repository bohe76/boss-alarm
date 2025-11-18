# 상세 기획서: 모바일 하단 탭 바 네비게이션 (v2, 전문가 검토 반영)

## 1. 개요
모바일 환경에서의 사용자 경험(UX)을 극대화하기 위해, 기존의 왼쪽 사이드바를 화면 하단에 고정되는 '하단 탭 바'로 대체한다. 이 문서는 해당 기능의 상세 설계와 구현 계획을 정의한다.

**참고:** 기존의 툴팁 기능은 마우스 오버 시에만 동작하므로, 모바일 환경에는 적용되지 않으며 데스크톱 전용 기능으로 유지된다.

## 2. 대상 화면 및 분기점
- **적용 대상:** 모바일 디바이스
- **CSS 분기점 (Breakpoint):** `768px` 이하의 화면 너비 (`@media (max-width: 768px)`)

## 3. 상세 설계

### 3.1. HTML 구조 변경 (`index.html`)
1.  **하단 탭 바 추가:** `<footer>` 바로 앞에 모바일 전용 하단 탭 바 `<nav id="bottom-nav">`를 추가한다.
2.  **탭 바 아이템:** 4개의 주요 메뉴와 '더보기' 버튼으로 구성한다. 웹 접근성을 위해 `aria-label` 등의 속성을 사용한다.
    ```html
    <a href="#" id="bottom-nav-dashboard" data-screen="dashboard-screen" class="bottom-nav-item active">...</a>
    <button id="more-menu-button" class="bottom-nav-item" aria-expanded="false" aria-controls="sidebar">...</button>
    ```
3.  **'더보기' 메뉴 (사이드바 재사용):** 기존의 `<nav id="sidebar">`를 '더보기' 클릭 시 나타나는 전체 메뉴 오버레이로 재사용한다.
4.  **백드롭 추가:** `<body>` 태그가 닫히기 직전에 백드롭 요소 `<div id="sidebar-backdrop">`를 추가한다.

### 3.2. CSS 스타일 변경 (`style.css`)
1.  **미디어 쿼리:** 모든 모바일 전용 스타일은 `@media (max-width: 768px) { ... }` 블록 내에 작성한다.
2.  **기존 사이드바 숨기기:** 모바일에서 `#sidebar`를 기본적으로 숨긴다.
3.  **하단 탭 바 스타일:**
    - `position: fixed`, `bottom: 0`, `width: 100%`, 높은 `z-index`.
    - 하단 탭 바의 높이를 CSS 변수 `--bottom-nav-height`로 정의한다.
    - **안전 영역(Safe Area):** iPhone 홈 인디케이터 등을 고려하여 `padding-bottom: env(safe-area-inset-bottom);`를 적용한다.
4.  **메인 콘텐츠 패딩:** `<main>`의 `padding-bottom`을 `calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))`으로 설정하여 콘텐츠가 가려지지 않게 한다.
5.  **'더보기' 메뉴 오버레이 스타일:**
    - **상태 클래스 분리:** 모바일의 '더보기' 메뉴 활성화 상태는 `.more-menu-open` 클래스로, 데스크톱의 사이드바 축소 상태는 `.sidebar-collapsed` 클래스로 명확히 분리하여 스타일 충돌을 방지한다.
    - `#sidebar.more-menu-open`일 때 `position: fixed`, 최상위 `z-index` 등 오버레이 스타일을 적용한다.
6.  **백드롭 스타일:** `.sidebar-backdrop.active`일 때만 보이도록 처리한다.

### 3.3. JavaScript 로직 변경

1.  **`dom-elements.js`:**
    - 하단 탭 바 관련 ID를 추가한다: `bottomNav`, `moreMenuButton`, `sidebarBackdrop` 등.

2.  **`app.js` (또는 `view-manager.js`):**
    - **동적 뷰 관리:** `ResizeObserver`를 사용하여 뷰포트 너비 변경을 실시간으로 감지한다. 너비가 `768px`을 넘거나 넘지 않을 때, `body` 태그에 `is-mobile-view` 같은 클래스를 동적으로 추가/제거하여 CSS와 JS가 현재 뷰 상태를 알 수 있게 한다. 이 로직은 불필요한 이벤트 핸들러의 등록/해제 로직을 대체하거나 보완한다.

3.  **`event-handlers.js`:**
    - **`showScreen` (상태 동기화):** 이 함수를 **단일 진실 공급원(Single Source of Truth)**으로 삼는다. 화면 전환 시, 데스크톱 사이드바(` #sidebar a`)와 모바일 하단 탭 바 (`#bottom-nav a`) 양쪽의 `active` 클래스를 모두 업데이트하도록 로직을 수정한다.
    - **모바일 이벤트 핸들러:**
        - **하단 탭 클릭:** `showScreen`을 호출한다.
        - **'더보기' 버튼 클릭:**
            - `#sidebar`에 `.more-menu-open`, `#sidebar-backdrop`에 `.active` 클래스를 토글한다.
            - `aria-expanded` 속성을 업데이트한다.
            - **(접근성) 초점 가두기:** 메뉴가 열리면 초점이 메뉴 내에서만 움직이도록 `focus-trap` 로직을 활성화한다.
            - **(접근성) 배경 콘텐츠 비활성화:** `<main>`, `<header>` 등 메뉴 외의 요소에 `inert` 속성을 추가한다.
            - **(접근성) `Escape` 키 처리:** `Esc` 키를 누르면 메뉴가 닫히도록 이벤트 리스너를 추가한다.
        - **백드롭 클릭:** '더보기' 메뉴를 닫고, 위의 접근성 관련 처리(초점 해제, `inert` 제거 등)를 모두 원상 복구한다.

## 4. 구현 단계 (수정)
1.  **1단계 (HTML):** `index.html`에 하단 탭 바와 백드롭 구조를 추가한다.
2.  **2단계 (JS - DOM):** `dom-elements.js`에 새로운 요소 ID를 추가한다.
3.  **3단계 (CSS):** 미디어 쿼리, CSS 변수, `safe-area-inset`을 사용하여 기본 모바일 레이아웃(사이드바 숨김, 하단 탭 바 표시, 메인 콘텐츠 패딩)을 구현한다.
4.  **4단계 (JS - 뷰포트 감지):** `ResizeObserver`를 사용하여 동적 뷰 상태(`is-mobile-view` 클래스) 관리 로직을 구현한다.
5.  **5단계 (JS - 상태 동기화):** `showScreen` 함수를 수정하여 데스크톱/모바일 메뉴의 활성 상태를 동기화하는 로직을 구현한다.
6.  **6단계 (JS/CSS - '더보기' 기능):** '더보기' 버튼, 백드롭 클릭 이벤트 핸들러 및 관련 CSS(`more-menu-open` 등)를 구현한다.
7.  **7단계 (JS - 접근성):** '더보기' 메뉴가 열렸을 때 초점 가두기, `inert` 속성 적용, `Escape` 키 처리 로직을 구현한다.
8.  **8단계 (테스트):** 데스크톱/모바일 뷰 전환, 기능 동작, 레이아웃 깨짐 여부, 접근성 기능까지 종합적으로 철저히 테스트한다.

## 5. 주요 결정사항
- 하단 탭 바에 고정될 4개의 주요 메뉴는 **대시보드, 보스 설정, 계산기, 공유**로 확정한다.