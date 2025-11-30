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
    *   **레이아웃 정렬 개선:** `.zen-grid-row`에 `justify-content: center;`를 추가하여 내부 입력 그룹들을 카드 중앙에 배치하고, 내부 그룹(`.input-group` 등)에 `align-items: center;`를 추가하여 라벨과 요소를 중앙 정렬함 (`src/style.css`).
*   **'광 계산기' 화면의 하단 여백 최적화 및 동적 조정 (`src/style.css`, `src/screens/calculator.js`, `src/ui-renderer.js`):**
    *   '광 계산 목록'(`div#lightSavedList`)의 가시성 상태에 따라 '최근 계산 결과'(`div#lightTempResults`)의 상단 여백을 동적으로 조절하여 카드 하단의 불필요한 공간 최소화.
    *   `DOM.lightListButton` 클릭 시 '광 계산 목록'의 가시성 토글 기능 추가.
*   **'광 계산기' 화면 - '광 계산 목록' 제목 형식 개선:**
    *   '광 계산 목록' 제목을 `<h4>`에서 `<h3>`로 변경하고, `.card-header` 형식을 적용하여 UI 카드 제목 가이드라인에 일치시킵니다. (`src/ui-renderer.js`, `src/style.css`)
*   **'광 계산기' 구조 및 스타일 전면 개편 (젠 계산기와 통일):**
    *   **구조 변경 (`index.html`):** 상단(경과 시간/예상 시간, `.zen-grid-row` 적용), 중단(컨트롤 버튼), 하단(목록 버튼, 우측 정렬)으로 재구성.
    *   **스타일 통일 (`src/style.css`):**
        *   `.zen-grid-row` 및 주요 컨테이너들의 `gap`을 12px로 통일.
        *   입력/표시 창의 너비(`--zen-input-width`)를 164px로 조정하고, 광 계산기 디스플레이 스타일을 젠 계산기와 픽셀 단위까지 일치시킴.
        *   `.zen-grid-row` 마진(30px), 라벨 마진(12px) 조정.
        *   광 계산기 버튼 너비(104px) 통일 및 레이아웃 마진 미세 조정.
*   **'최근 계산 결과' 및 '광 계산 목록' UI 통일:**
    *   **스타일 통일 (`src/style.css`):** '최근 계산 결과'(`div#lightTempResults`)의 불필요한 카드 스타일(배경, 테두리)을 제거하고, 테이블 스타일(`.light-saved-table`)을 공유하여 '광 계산 목록'과 시각적으로 일치시킴.
    *   **계층 구조 개선 (`src/ui-renderer.js`, `src/style.css`):**
        *   '최근 계산 결과'와 '광 계산 목록'의 제목을 `<h3>`에서 `<h4>`로 변경하고, `.card-header h4` 스타일(`font-size: 1.0em`)을 정의.
        *   '목록 초기화' 버튼을 제목 아래 별도의 행(`.light-list-action`)으로 분리하여 우측 정렬.
    *   **여백 조정:** `.light-saved-list`의 `margin-top`을 24px로, 테이블의 `margin-top`을 12px로 조정하여 간격 최적화.
*   **'보스 스케줄러' 화면 레이아웃 개선:**
    *   전체 콘텐츠를 중앙 정렬하기 위해 `.boss-scheduler-layout` 컨테이너 추가 및 Flexbox 스타일 적용 (`index.html`, `src/style.css`).
    *   주요 버튼(`manage-custom-lists-button`, `clearAllRemainingTimesButton`, `moveToBossSettingsButton`)과 드롭다운(`gameSelect`)의 너비를 **184px**로 통일 (`src/style.css`).
    *   버튼 그룹 및 컨트롤 섹션을 중앙 정렬로 변경 (`justify-content: center`).
*   **'공유' 화면 레이아웃 개선:**
    *   제목(`h2`)을 제외한 본문 콘텐츠(`p`, `#shareMessage`)를 `.share-content-layout`으로 감싸 중앙 정렬 및 텍스트 중앙 정렬 적용 (`index.html`, `src/style.css`).
*   **'대시보드' 화면 반응형 레이아웃 재구성:**
    *   PC (넓은 화면)와 모바일 (좁은 화면)에 따라 다른 레이아웃 적용.
    *   `index.html`에 `.dashboard-flexible-layout`, `.dashboard-column-left`, `.dashboard-column-right` 구조 추가.
    *   `src/style.css`에 Flexbox와 미디어 쿼리(`min-width: 769px`)를 사용하여 다음 규칙 구현:
        *   **PC:** 두 개의 컬럼(`.dashboard-column-left`, `.dashboard-column-right`)이 가로로 배치되며 각각 너비를 고정하고, 그 안에 카드들이 수직으로 쌓임.
        *   **모바일:** 모든 컬럼과 카드들이 수직으로 쌓임.
        *   '알림 상태'와 '소리 설정' 카드는 `.dashboard-small-cards-row`로 묶여 **항상 가로 배치** (공간 부족 시 줄바꿈) 되도록 유지.
        *   대시보드 제목을 제외한 모든 카드 및 그룹은 중앙 정렬.
    *   **간격 시스템 통일:** 모든 `.card-standard`의 `margin-bottom`을 `0`으로 설정하여 Flex `gap` 속성과의 중복 마진 문제를 해결.
    *   `.dashboard-layout`, `.dashboard-column-left`, `.dashboard-column-right`, `.dashboard-small-cards-row` 등 모든 대시보드 Flex 컨테이너의 `gap`을 `16px`로 통일하여 카드 및 그룹 사이의 세로/가로 간격을 일관되게 유지.
    *   **`card-size-small` 너비 조정:** `.card-size-small`의 `max-width`를 `182px`로 조정하여 `.dashboard-small-cards-row` 내에서 두 카드가 `gap: 16px`와 함께 `376px` 너비에 정확히 배치되도록 최적화.
    *   **'알림 상태' / '소리 설정' 카드 내부 정렬 개선:** `status-content` 및 `mute-control-content`에 `flex-direction: column`을 추가하여 내부 콘텐츠의 수직/가로 중앙 정렬을 보장.
*   **'알림 설정' 화면 개선:**
    *   고정 알림 목록 아이템(`fixed-alarm-item`)에서 시간 표시(`alarm.time`)를 볼드체로 변경하고, **폰트 크기를 `2.0em`으로 조정** (`src/ui-renderer.js`).
    *   고정 알림 목록 아이템(`fixed-alarm-item`)에서 시간 표시(`alarm.time`)와 이름(`alarm.name`) 사이에 **`&nbsp;&nbsp;` 엔티티를 사용하여 공백 2개를 명시** (`src/ui-renderer.js`).
    *   새 고정 알림 추가 섹션(`.add-fixed-alarm-section`)에 `margin-top: 20px` 추가하여 상단 요소와의 간격 확보.
    *   메뉴 텍스트 "알림 설정"을 "설정"으로 변경 (`index.html`).
*   **로그 메시지 개선:**
    *   `custom-list-manager.js`에서 `[CustomListManager]` 접두사를 제거.
    *   `boss-scheduler-data.js`에서 보스 목록 로드 성공 시 로그 메시지에서 `data/boss_lists.json` 파일 경로를 제거하여 간결하게 표시.
*   **'알림 로그' 화면 개선:**
    *   리스트 아이템(`.log-entry`) 하단 라인을 점선(`1px dashed #ccc`)으로 변경.
    *   알림 로그 화면(`alarm-log-screen`)에서도 리스트 아이템 내부의 시간(`<strong>` 태그) 색상을 `#111`로 변경.
*   **'보스 설정' 화면 개선:**
    *   안내 메시지 두 줄을 `p` 태그 내에 `br` 태그를 사용하여 줄바꿈하는 형태로 변경하여, 의미론적 구조를 유지하면서 시각적 간결성 확보.
*   **'다가오는 보스' 화면 개선:**
    *   `다가오는 보스` 리스트 아이템(`upcomingBossListContent ul li`)에 알림 로그(`.log-entry`)와 유사한 스타일(패딩, 점선 하단 라인, 폰트 크기 등)을 적용. 마지막 아이템의 하단 라인 표시 버그 수정.
*   **'대시보드' 화면 개선:**
    *   '다음 보스', '다가오는 보스', '알림 로그'에서 `[hh:mm:ss]` 부분의 폰트 색상을 `#111`로 변경하여 강조. (`알림 로그`는 `<strong>` 태그를 타겟팅). (단, `boss-details-highlight`의 다른 텍스트는 `#ea4335` 유지)
*   **리스트 첫 항목 상단 테두리 추가:**
    *   대시보드의 '다가오는 보스' 및 '최근 알림 로그' 목록과 '알림 로그' 화면의 리스트(`li:first-child`)에 `border-top: 1px dashed #ccc` 스타일을 추가하여 시각적 일관성 및 가독성을 개선.
*   **'탭 메뉴 아이콘' 교체:**
    *   사이드바 및 하단 내비게이션의 모든 메뉴 아이콘을 Heroicons 아웃라인 버전으로 교체 완료.
    *   `src/style.css`에서 `.menu-icon`의 `fill`을 `none`으로, `stroke`를 `currentColor`로 변경하여 아웃라인 스타일 지원.
    *   **하단 내비게이션 아이콘:** 모든 하단 내비게이션 아이콘의 SVG 태그에서 `fill` 속성을 제거하여 Heroicons 아웃라인 스타일이 올바르게 적용되도록 수정. (`#more-menu-button` 아이콘은 기존 유지).
    *   `src/style.css`에서 `.menu-icon`의 `fill` 속성에 `!important`를 추가하여 아웃라인 스타일 강제.
*   **하단 네비게이션 활성 아이콘 개선:**
    *   `src/style.css`를 수정하여, 활성화된 하단 네비게이션 메뉴 아이콘(`.bottom-nav-item.active .menu-icon`)에 `transform: scale(1.3)`을 적용하여 시각적 강조 효과를 추가.
    *   기본 아이콘(`.bottom-nav-item .menu-icon`)에 `transition` 속성을 추가하여 크기 변경이 부드러운 애니메이션으로 표시되도록 개선.

*   **헤더 알람 아이콘 개선:**
    *   `index.html`에서 알람 아이콘 SVG의 `fill="currentColor"` 속성을 제거하여 CSS를 통한 제어가 가능하도록 수정.
    *   `src/style.css`의 `.alarm-icon` 클래스에 `stroke: currentColor;`와 `fill: none;`을 추가하여 윤곽선 아이콘이 올바르게 렌더링되도록 개선.
    *   `src/style.css`의 `.alarm-icon` 클래스에 `stroke-width: 2.5;`를 추가하여 아이콘 선의 굵기를 강조.
    *   `src/style.css`의 `.alarm-icon` 클래스 `width`와 `height`를 `40px`로 조정하여 아이콘 크기를 최적화.

*   **헤더 알람 아이콘 애니메이션 추가:**
    *   알람이 ON 상태일 때, 헤더의 알람 아이콘에 무한 색조 회전(`hue-rotate`) 애니메이션을 추가하여 시각적 피드백을 강화했습니다. (`src/style.css`)
    *   `hue-rotate-animation`이라는 이름의 `@keyframes`를 정의하고, `.alarm-toggle-button.alarm-on .alarm-icon`에 2초 동안 무한 반복되는 `linear` 애니메이션으로 적용했습니다.