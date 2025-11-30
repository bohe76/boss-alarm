# 디자인 시스템 가이드 (v2 - 최신 UI 반영)

## 1. 서론

이 문서는 "보스 알리미" 웹 애플리케이션의 디자인 일관성을 확보하고, UI 개발 및 유지보수를 효율적으로 수행하기 위한 최신 디자인 시스템 가이드입니다. 이전 버전의 UI 불일치를 해소하고, 통일된 시각적 언어를 구축하는 것을 목표로 현재 구현된 UI/CSS를 기반으로 작성되었습니다.

## 2. 색상 팔레트

애플리케이션의 주요 색상을 정의하고 사용 목적을 명확히 합니다.

### 2.1. 기본 색상

*   **Primary Action (버튼 기본):** `#455A64` (어두운 청록색)
*   **Primary Action Hover:** `#263238`
*   **Secondary Action (버튼 강조):** `#AD1457` (진한 핑크색)
*   **Secondary Action Hover:** `#880E4F`
*   **Danger (알림/경고):** `#ea4335` (빨간색) - 알람 ON, 중요 로그, 임박 보스/시간, 광 계산기 예상 시간
*   **Success (긍정):** `#43AA8B` (초록색) - 남은 시간, 광 계산기 오버 시간
*   **Info (정보 강조):** `#1D3557` (짙은 파란색) - 광 계산기 오버 시간 라벨, 스위치 ON 배경

### 2.2. 중립 색상 (그레이 스케일)

*   **Background Body:** `#f4f7f6` - `body` 배경
*   **Background UI:** `#f8f8f8` - 헤더, 사이드바, 메인 콘텐츠, 카드 내부 배경, 입력 필드 배경
*   **Background Dark:** `#333` - 푸터 배경, 토스트 메시지 배경
*   **Border Light:** `#eee` - 구분선 (dashed), 사이드바 메뉴 호버/액티브 테두리
*   **Border Default:** `#ccc` - 알람 아이콘 비활성, 입력 필드 테두리, 슬라이더 배경
*   **Text Darkest:** `#111` - 헤더 제목, 카드 제목, 스톱워치, 비활성 버튼 텍스트
*   **Text Default:** `#333` - 일반 텍스트, 활성 내비게이션 텍스트
*   **Text Light:** `#666` - 보조 텍스트, 아이콘 (비활성), 음소거 버튼 (muted)
*   **Text Subtle:** `#777` - 라벨 텍스트 (젠/광 계산기)
*   **Text Placeholder:** `#999` - 입력 필드 플레이스홀더
*   **Disabled Background:** `#CFD8DC` - 비활성화된 버튼 배경

### 2.3. 그림자 색상 (Shadow Colors)

*   **Shadow Light:** `rgba(0,0,0,0.1)` - 리스트 아이템 카드, 모달 그림자 (`box-shadow`)
*   **Shadow Medium:** `rgba(0,0,0,0.15)` - 표준 카드 그림자 (`box-shadow`)
*   **Shadow Heavy:** `rgba(0,0,0,0.2)` - 모달 그림자 (`box-shadow`)

## 3. 타이포그래피

일관된 텍스트 스타일을 위해 글꼴, 크기, 두께, 줄 높이를 정의합니다.

*   **Font Family:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;`
*   **Line Height:**
    *   `body`: `1.6`
    *   `content`: `1.5` (로그 항목, 리스트 아이템 등)
    *   `button`: `1.2em`
*   **Font Sizes:**
    *   `h1`: `1.8em`
    *   `h2`: `1.5em`
    *   `h3`: `1.1em`
    *   `h4`: `1.0em` (광 계산기 목록 제목)
    *   `body-md`: `1em` (기본 텍스트, 버튼 텍스트, 로그 항목)
    *   `body-sm`: `0.9em` (푸터, 작은 버튼 텍스트, 보조 텍스트)
    *   `large-display`: `2em` (젠/광 계산기 시간 표시)
*   **Font Weights:**
    *   `normal`: `400`
    *   `bold`: `700`

## 4. 간격 시스템 (Spacing System - 4px Grid)

일관된 레이아웃을 위해 **4px 기반의 간격 시스템**을 사용합니다. 모든 `gap` 및 `margin`, `padding` 값은 4의 배수를 따릅니다.

*   **기본 간격 단위:** `4px`
*   **주요 사용 간격:** `8px`, `12px`, `16px`, `20px`, `24px`, `30px`, `40px`

## 5. 테두리 반경 시스템 (Border Radius System)

UI 요소의 둥근 정도를 통일하기 위한 시스템을 정의합니다.

*   `radius-sm`: `4px` - 작은 요소 (예: 입력 필드, 툴팁, 버튼)
*   `radius-md`: `8px` - 대부분의 카드, 텍스트 영역
*   `radius-lg`: `12px` - 모달
*   `radius-full`: `50%` - 원형 요소 (예: 토글 스위치 핸들, 음소거 버튼)

## 6. 그림자 시스템 (Shadow System)

요소의 깊이감을 표현하기 위한 그림자 스타일을 정의합니다.

*   `shadow-sm`: `0 2px 4px rgba(0,0,0,0.1)` - 리스트 아이템 카드
*   `shadow-md`: `0 4px 8px rgba(0,0,0,0.15)` - 표준 카드 (계산기, 대시보드 카드 등)
*   `shadow-lg`: `0 8px 16px rgba(0,0,0,0.2)` - 모달

## 7. 컴포넌트 가이드라인

### 7.1. 버튼

*   **기본 스타일 (`.button`):**
    *   `display`: `flex`, `justify-content`: `center`, `align-items`: `center`
    *   `padding`: `8px 16px` (상하 `8px`, 좌우 `16px`)
    *   `border`: `none`, `border-radius`: `4px`
    *   `font-size`: `1em`, `line-height`: `1.2em`
    *   `background-color`: `Primary Action` (`#455A64`), `color`: `white`
    *   `hover`: `background-color: Primary Action Hover` (`#263238`)
*   **Primary Button (`.primary-button`):**
    *   `background-color`: `Secondary Action` (`#AD1457`), `hover`: `background-color: Secondary Action Hover` (`#880E4F`)
*   **Disabled State (`:disabled`):**
    *   `background-color`: `Disabled Background` (`#CFD8DC`), `color`: `Text Darkest` (`#111`), `cursor`: `default`, `opacity`: `0.6`
*   **아이콘 버튼 (원형 - 대시보드 음소거 버튼):**
    *   `width`: `36px`, `height`: `36px`
    *   `border`: `2px solid` (`color` 상속), `border-radius`: `50%`
    *   `color (default)`: `Danger` (`#ea4335`) (ON), `color (muted)`: `Text Light` (`#666`) (OFF)
*   **특정 버튼 너비:**
    *   보스 스케줄러 컨트롤 버튼 (`#manage-custom-lists-button`, `#clearAllRemainingTimesButton`, `#moveToBossSettingsButton`): `184px`
    *   광 계산기 버튼 (`.light-buttons button`): `104px`

### 7.2. 카드

*   **기본 카드 (`.card-standard`):**
    *   `background-color`: `#fff`, `padding`: `20px`, `border-radius`: `8px`
    *   `box-shadow`: `Shadow Medium` (`0 4px 8px rgba(0,0,0,0.15)`)
    *   `margin-bottom`: `0` (Flex `gap` 시스템으로 대체)
    *   `box-sizing`: `border-box`
*   **리스트 아이템 카드 (`.card-list-item`):**
    *   `background-color`: `#fff`, `padding`: `16px`, `border-radius`: `8px`
    *   `box-shadow`: `Shadow Light` (`0 2px 4px rgba(0,0,0,0.1)`)
    *   `margin-bottom`: `10px`
*   **카드 크기 클래스:**
    *   `card-size-standard`: `max-width: 380px`, `width: 100%`, `margin-bottom: 0`
    *   `card-size-small`: `max-width: 182px`, `width: 100%` (알림 상태, 소리 설정 카드)
    *   `card-size-list`: `max-width: 800px`, `width: 100%`, `margin: 0 auto`

### 7.2.1. 카드 헤더 (`.card-header`)

*   **기본 스타일:**
    *   `display`: `flex`, `justify-content`: `space-between`, `align-items`: `center`
    *   `padding-bottom`: `16px`, `margin-bottom`: `20px` (제목과 콘텐츠 분리)
    *   `h3`: `margin: 0`, `h4`: `margin: 0`, `font-size: 1.0em`, `color: #333`

### 7.3. 입력 필드 및 드롭다운

*   **기본 스타일 (`input[type="text"]`, `textarea`, `select`):**
    *   `padding`: `8px`
    *   `border`: `1px solid Border Default` (`#ccc`)
    *   `border-radius`: `4px`
    *   `font-size`: `1em`
*   **플레이스홀더 텍스트:** `color: Text Placeholder` (`#999`)
*   **젠 계산기 입력 (`#remainingTimeInput`):**
    *   `width`: `var(--zen-input-width, 164px)`, `height`: `46px`
    *   `padding`: `33px 16px` (매우 큰 상하 패딩)
    *   `font-size`: `2em`, `font-weight`: `700`
*   **젠 계산기 드롭다운 (`#bossSelectionDropdown`):**
    *   `height`: `var(--zen-input-height, 40px)`
    *   `padding`: `8px 30px 8px 8px` (커스텀 화살표 공간 확보)

## 8. 레이아웃 시스템 (Flexbox 기반)

### 8.1. 대시보드 레이아웃 (`.dashboard-layout` - 반응형)

*   **기본 (모바일 우선):**
    *   `display: flex; flex-direction: column; align-items: center;` (모든 요소를 수직으로 쌓고 중앙 정렬)
    *   `gap: 16px;` (모든 Flex 아이템 사이 간격 16px)
    *   `width: 100%; max-width: 800px; margin: 0 auto;` (전체 레이아웃 너비 제한 및 중앙 정렬)
*   **PC (`@media (min-width: 769px)`):**
    *   `flex-direction: row; justify-content: center; align-items: flex-start;` (두 컬럼을 가로로 배치, 상단 정렬)
    *   `gap: 16px;` (컬럼 사이 간격 16px)

### 8.2. 대시보드 컬럼 (`.dashboard-column-left`, `.dashboard-column-right`)

*   **기본 (모바일):**
    *   `display: flex; flex-direction: column; align-items: center;` (내부 카드 수직으로 쌓고 중앙 정렬)
    *   `gap: 16px;` (내부 카드 사이 간격 16px)
    *   `width: 100%; max-width: 380px;` (개별 카드의 최대 너비에 맞춤)
*   **PC (`@media (min-width: 769px)`):**
    *   `width: 380px; min-width: 380px; max-width: 380px;` (컬럼 너비 고정)

### 8.3. 작은 카드 그룹 (`.dashboard-small-cards-row`)

*   **항상:**
    *   `display: flex; flex-direction: row; flex-wrap: wrap;` (항상 가로 배치, 공간 부족 시 줄바꿈)
    *   `justify-content: center;` (내부 작은 카드들을 가로로 중앙 정렬)
    *   `gap: 16px;` (작은 카드 사이 간격 16px)
    *   `width: 100%; max-width: 376px;` (두 개의 `182px` 카드 + `16px` 간격 = 376px)

## 9. 아이콘

*   **기본 색상:** `Text Light` (`#666`)
*   **활성/강조 색상:** `Text Darkest` (`#111`)
*   **크기:** `menu-icon` `30px`, `sidebar-toggle-icon` `48px`, `alarm-icon` `56px`

## 10. 툴팁

*   **기본 스타일:**
    *   `background-color`: `#555`, `color`: `white`
    *   `padding`: `4px 8px`
    *   `border-radius`: `4px`, `z-index`: `1000`

## 11. 모달

*   **기본 스타일:**
    *   `background-color`: `Background UI` (`#f8f8f8`)
    *   `border-radius`: `12px`
    *   `box-shadow`: `Shadow Heavy` (`0 8px 16px rgba(0,0,0,0.2)`)
    *   `close-button`: `Text Default` (`#333`)

## 12. 알림 로그 (`.log-entry`)

*   `padding`: `4px 0`
*   `border-bottom`: `1px dashed #ccc`
*   `font-size`: `1.0em`
*   `font-family`: 시스템 폰트
*   `important`: `color: Danger` (`#ea4335`)