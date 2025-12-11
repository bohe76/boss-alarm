# 디자인 시스템 가이드 (v2.1 - CSS 리팩토링 및 최신 UI 반영)

## 1. 서론

이 문서는 "보스 알리미" 웹 애플리케이션의 디자인 일관성을 확보하고, UI 개발 및 유지보수를 효율적으로 수행하기 위한 최신 디자인 시스템 가이드입니다. v2.1에서는 **CSS 모듈화(파일 분리)** 및 **보스 설정 화면의 새로운 뷰 모드(카드 UI)**를 반영하였습니다.

### 1.1. CSS 구조 (New)
스타일시트는 유지보수성을 위해 다음과 같이 기능별로 분리되어 관리됩니다.
*   **`style.css`**: 메인 진입점, CSS 변수(`:root`), 기본 리셋, 유틸리티 클래스 정의.
*   **`layout.css`**: 헤더, 푸터, 사이드바, 네비게이션, 전체 레이아웃 구조 정의.
*   **`components.css`**: 버튼, 카드, 모달, 입력 필드 등 재사용 가능한 컴포넌트 스타일 정의.
*   **`screens.css`**: 대시보드, 보스 관리 등 각 화면별 전용 스타일 정의.

## 2. 색상 팔레트

애플리케이션의 주요 색상을 정의하고 사용 목적을 명확히 합니다. 모든 색상은 `style.css`의 `:root` 변수로 관리하는 것을 권장합니다.

### 2.1. 기본 색상

*   **Primary Action (버튼 기본):** `#455A64` (어두운 청록색)
*   **Primary Action Hover:** `#263238`
*   **Secondary Action (버튼 강조/활성):** `#AD1457` (진한 핑크색 - `var(--primary-color)`)
*   **Secondary Action Dark:** `#880E4F` (`var(--primary-dark)`) - 호버, 슬라이더 배경
*   **Danger (알림/경고):** `#ea4335` (빨간색) - 알람 ON, 중요 로그, 임박 보스 남은 시간
*   **Success (긍정):** `#43AA8B` (초록색) - 남은 시간, 광 계산기 오버 시간
*   **Info (정보 강조):** `#1D3557` (짙은 파란색) - 광 계산기 오버 시간 라벨, 스위치 ON 배경, 헤더 텍스트
*   **Boss Highlight:** `#1E88E5` (밝은 파란색) - 다음 보스 이름, 임박 보스 이름

### 2.2. 중립 색상 (그레이 스케일)

*   **Background Body:** `#f4f7f6` - `body` 배경
*   **Background UI:** `#f8f8f8` - 헤더, 사이드바, 메인 콘텐츠, 카드 내부 배경
*   **Border Light:** `#eee` - 리스트 아이템 구분선
*   **Border Default:** `#ccc` - 입력 필드 테두리, 슬라이더 트랙
*   **Text Darkest:** `#111` - 헤더 제목, 카드 제목
*   **Text Default:** `#333` - 일반 텍스트
*   **Text Light:** `#666` - 보조 텍스트, 비활성 아이콘
*   **Text Placeholder:** `#999` - 입력 필드 플레이스홀더

## 3. 타이포그래피

*   **Font Family:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...`
*   **Font Sizes:**
    *   `h1`: `1.8em`
    *   `h2`: `1.5em`
    *   `h3`: `1.1em` (카드 제목)
    *   `body`: `1em`
    *   `large-display`: `2em` (시간 표시)
*   **Font Weights:**
    *   `normal`: `400`
    *   `bold`: `700`

## 4. 간격 시스템 (Spacing System - 4px Grid)

*   **기본 간격 단위:** `4px`
*   **주요 사용 간격:** `8px`, `12px`, `16px`, `20px`
*   **원칙:** 컨테이너의 `gap` 속성을 우선 사용하고, 불가능할 경우 `margin-bottom`을 사용하여 요소 간격을 확보합니다.

## 5. 컴포넌트 가이드라인

### 5.1. 버튼 (`.button`)

*   **기본 스타일:** `display: flex`, `padding: 8px 16px`, `border-radius: 4px`, `background-color: #455A64`.
*   **Primary Button (`.primary-button`):** `background-color: #AD1457` (강조).
*   **Toggle Button (`.toggle-button`):** `border-radius: 48px`, 활성 시 `#FF8F00`.
*   **Action Chip (`.action-chip`):** 아이콘이 포함된 둥근 버튼 (보스 설정 모드 전환용).

### 5.2. 카드 (`.card-standard`)

*   **스타일:** `background-color: #fff`, `padding: 20px`, `border-radius: 8px`, `box-shadow: 0 4px 8px rgba(0,0,0,0.15)`.
*   **헤더 (`.card-header`):** 제목(`h3`)과 우측 컨트롤(버튼 등)을 양쪽 정렬.

### 5.3. 리스트 아이템 (`.list-item`)

*   **기본 스타일:**
    *   `padding`: `12px 0`
    *   `border-top`: `1px solid #ccc` (인접한 형제 요소 `+` 선택자로 적용)
*   **Dense 수식어 (`.list-item--dense`):**
    *   `padding`: `6px 0` (더 좁은 간격)
    *   `border-top`: `1px dashed #ccc` (점선 구분선)
    *   **사용처:** 로그, 대시보드 목록, **보스 설정 뷰 모드 리스트**.

### 5.4. 보스 설정 뷰 모드 (New)

*   **구조:** `날짜 헤더`를 가진 카드(`card-standard`) 내부에 `리스트 아이템`들이 나열되는 형태.
*   **리스트 아이템 스타일:**
    *   `list-item` + `list-item--dense` 클래스 조합 사용.
    *   **시간:** `font-weight: bold` (굵게).
    *   **이름:** `margin-left: 16px` (시간과 넉넉한 간격).

### 5.5. 슬라이더 (`.volume-slider`)

*   **트랙:** `height: 8px`, `border-radius: 5px`, 그라디언트 배경 (`var(--primary-dark)`).
*   **핸들 (Thumb):** 원형, `background: var(--primary-color)` (#AD1457).

### 5.6. 모달 (`.modal`)

*   **스타일:** 화면 중앙 정렬, 반투명 배경(`backdrop-filter`), `border-radius: 12px`, `box-shadow` 적용.
*   **탭 UI:** 모달 내부에서 화면 전환을 위한 탭 버튼(`tab-button`) 제공.

## 6. 레이아웃 시스템

### 6.1. 대시보드 레이아웃

*   **모바일:** 수직 컬럼 스택 (`flex-direction: column`).
*   **데스크탑 (769px+):** 2컬럼 가로 배치 (`flex-direction: row`), 중앙 정렬.
*   **간격:** `gap: 16px` (모든 카드 및 컬럼 사이).

### 6.2. 모바일 내비게이션

*   **Bottom Nav:** 화면 하단 고정, `height: 60px`.
*   **More Menu:** '더보기' 버튼 클릭 시 우측에서 슬라이드되거나 전체 화면 오버레이로 표시되는 메뉴 (기존 사이드바 재활용).
