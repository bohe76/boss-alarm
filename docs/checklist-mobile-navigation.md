# 체크리스트: 모바일 하단 탭 바 구현

## 1단계: HTML 구조 설정
- [ ] `index.html`: `<body>` 하단에 하단 탭 바를 위한 `<nav id="bottom-nav">` 요소 추가
- [ ] `index.html`: `bottom-nav` 내부에 4개의 주요 메뉴(`대시보드`, `보스 설정`, `계산기`, `공유`)를 위한 `<a>` 태그 4개 추가 (ID, `data-screen` 속성 포함)
- [ ] `index.html`: `bottom-nav` 내부에 '더보기'를 위한 `<button id="more-menu-button">` 추가
- [ ] `index.html`: '더보기' 메뉴의 배경 역할을 할 `<div id="sidebar-backdrop">` 요소 추가

## 2단계: CSS 기본 골격 구현
- [ ] `style.css`: 모바일 화면용 미디어 쿼리 블록 (`@media (max-width: 768px)`) 추가
- [ ] `style.css`: 미디어 쿼리 내부에 기존 왼쪽 사이드바(`#sidebar`)를 숨기는 (`display: none`) 규칙 추가
- [ ] `style.css`: 미디어 쿼리 내부에 하단 탭 바(`#bottom-nav`)를 화면 하단에 고정시키는 기본 스타일(position, z-index 등) 추가
- [ ] `style.css`: 미디어 쿼리 내부에 메인 콘텐츠 영역(`<main>`)에 하단 탭 바 높이만큼 `padding-bottom`을 추가하여 콘텐츠가 가려지지 않도록 조치

## 3단계: JavaScript 핵심 기능 구현 (탭 바)
- [ ] `dom-elements.js`: 하단 탭 바, 탭 바의 각 버튼, '더보기' 버튼, 백드롭 등 새로운 DOM 요소들의 ID 추가
- [ ] `event-handlers.js`: 모바일 전용 이벤트 핸들러를 초기화할 `initMobileNavHandlers` 함수 생성
- [ ] `event-handlers.js`: `initApp` 함수 내부에 화면 너비를 감지하여 `initMobileNavHandlers`를 호출하는 로직 추가
- [ ] `event-handlers.js`: 4개의 주요 메뉴 탭을 클릭했을 때, `showScreen` 함수를 호출하여 화면이 올바르게 전환되도록 이벤트 리스너 추가
- [ ] `event-handlers.js`: 탭 클릭 시, 이전에 활성화된 탭의 `.active` 클래스는 제거하고, 현재 클릭한 탭에만 `.active` 클래스를 추가하는 '활성 상태 관리' 로직 구현

## 4단계: JavaScript '더보기' 메뉴 기능 구현
- [ ] `event-handlers.js`: '더보기' 버튼 클릭 시, `#sidebar`와 `#sidebar-backdrop`에 `.active` 클래스를 토글(toggle)하는 이벤트 리스너 추가
- [ ] `event-handlers.js`: '더보기' 버튼의 `aria-expanded` 속성 값을 메뉴 상태에 따라 `true`/`false`로 변경하는 로직 추가
- [ ] `style.css`: 미디어 쿼리 내부에, `#sidebar`가 `.active` 클래스를 가질 때 전체 화면 오버레이로 보이도록 스타일 재정의
- [ ] `style.css`: `#sidebar-backdrop`이 `.active` 클래스를 가질 때만 보이도록 스타일 추가
- [ ] `event-handlers.js`: 백드롭(`#sidebar-backdrop`) 클릭 시 '더보기' 메뉴가 닫히도록 이벤트 리스너 추가
- [ ] `event-handlers.js`: '더보기' 메뉴 안의 항목을 클릭했을 때도 메뉴가 닫히도록 로직 추가

## 5단계: CSS 상세 스타일링 및 애니메이션
- [ ] `style.css`: 하단 탭 바의 활성(`active`) 상태 아이콘/텍스트 색상을 명확하게 구분되도록 스타일 추가
- [ ] `style.css`: '더보기' 메뉴가 부드럽게 나타나고 사라지도록 `transition`을 이용한 애니메이션 효과 추가
- [ ] `style.css`: 하단 탭 바가 iPhone 홈 인디케이터 등과 겹치지 않도록 `env(safe-area-inset-bottom)`을 이용한 '안전 영역' 패딩 적용
- [ ] `style.css`: 하단 탭 바, 아이콘, 텍스트, '더보기' 메뉴 등의 최종 디자인 다듬기

## 6단계: 최종 테스트
- [ ] 데스크톱 환경에서 기존 레이아웃과 기능이 문제없이 동작하는지 확인
- [ ] 모바일 환경에서 하단 탭 바가 올바르게 표시되고 왼쪽 사이드바는 숨겨지는지 확인
- [ ] 모바일에서 탭 바를 통한 화면 전환이 정상적으로 동작하는지 확인
- [ ] 모바일에서 '더보기' 메뉴가 열고 닫히는 기능과 애니메이션이 정상적인지 확인
- [ ] 브라우저 창 크기를 조절하며 데스크톱/모바일 뷰 전환 시 레이아웃이 깨지지 않는지 확인
