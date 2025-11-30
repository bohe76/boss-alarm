# 디자인 시스템 가이드

## 1. 서론

이 문서는 "보스 알리미" 웹 애플리케이션의 디자인 일관성을 확보하고, 향후 UI 개발 및 유지보수를 효율적으로 수행하기 위한 디자인 시스템 가이드입니다. 현재 애플리케이션의 UI 요소에서 발견되는 불일치를 해소하고, 통일된 시각적 언어를 구축하는 것을 목표로 합니다.

## 2. 색상 팔레트

애플리케이션의 주요 색상을 정의하고 사용 목적을 명확히 합니다.

### 2.1. 기본 색상

*   **Primary (액션/강조):** `#007aff` (파란색) - 주요 버튼, 활성 상태, 강조 요소
*   **Secondary (보조 액션/정보):** `#ff9800` (주황색) - 보조 버튼 (예: 광 버튼), 경고
*   **Success (성공/긍정):** `#28a745` (녹색) - (현재 사용되지 않지만, 필요시 추가)
*   **Danger (위험/부정):** `#d90007` (빨간색) - 알람 ON 상태, 중요 로그, 삭제 버튼
*   **Warning (경고):** `#ffc107` (노란색) - (현재 사용되지 않지만, 필요시 추가)
*   **Info (정보):** `#17a2b8` (청록색) - (현재 사용되지 않지만, 필요시 추가)

### 2.2. 중립 색상 (그레이 스케일)

*   **Background Light:** `#f8f8f8` - 헤더, 사이드바, 메인 콘텐츠 영역 배경, 카드 내부 배경
*   **Background Default:** `#f4f7f6` - `body` 배경
*   **Border/Divider Light:** `#eee` - 얇은 구분선, 카드 내부 테두리
*   **Border/Divider Default:** `#ccc` - 일반적인 테두리 (입력 필드, 카드 제목 하단 등)
*   **Text Light:** `#666` - 보조 텍스트, 아이콘
*   **Text Default:** `#333` - 일반 텍스트, 제목
*   **Text Dark:** `#111` - 가장 어두운 텍스트, 강조 제목
*   **Disabled:** `#cccccc` - 비활성화된 요소 배경

## 3. 타이포그래피

일관된 텍스트 스타일을 위해 글꼴, 크기, 두께, 줄 높이를 정의합니다.

*   **Font Family:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;`
*   **Line Height:**
    *   `body`: `1.6`
    *   `content`: `1.5` (로그 항목, 리스트 아이템 등)
*   **Font Sizes:**
    *   `h1`: `1.8em`
    *   `h2`: `1.5em` (제안)
    *   `h3`: `1.1em`
    *   `body-lg`: `1.1em` (예: 소제목)
    *   `body-md`: `1em` (기본 텍스트, 버튼 텍스트, 로그 항목)
    *   `body-sm`: `0.9em` (푸터, 작은 버튼 텍스트, 보조 텍스트)
*   **Font Weights:**
    *   `normal`: `400`
    *   `bold`: `700`

## 4. 간격 시스템 (Spacing System)

일관된 레이아웃을 위해 4px 기반의 간격 시스템을 사용합니다.

*   `spacing-xxs`: `4px`
*   `spacing-xs`: `8px`
*   `spacing-sm`: `12px`
*   `spacing-md`: `16px`
*   `spacing-lg`: `20px`
*   `spacing-xl`: `24px`
*   `spacing-xxl`: `32px`

## 5. 테두리 반경 시스템 (Border Radius System)

UI 요소의 둥근 정도를 통일하기 위한 시스템을 정의합니다.

*   `radius-sm`: `4px` - 작은 요소 (예: 입력 필드, 툴팁)
*   `radius-md`: `8px` - 대부분의 카드, 버튼, 텍스트 영역
*   `radius-lg`: `12px` - 모달, 강조된 카드
*   `radius-full`: `50%` - 원형 요소 (예: 토글 스위치 핸들)

## 6. 그림자 시스템 (Shadow System)

요소의 깊이감을 표현하기 위한 그림자 스타일을 정의합니다.

*   `shadow-sm`: `0 2px 4px rgba(0,0,0,0.1)` - 대부분의 카드, 작은 요소
*   `shadow-md`: `0 4px 8px rgba(0,0,0,0.15)` - 강조된 카드 (예: 계산기 카드)
*   `shadow-lg`: `0 8px 16px rgba(0,0,0,0.2)` - 모달, 드롭다운 메뉴 (현재 모달에만 사용)

## 7. 컴포넌트 가이드라인

### 7.1. 버튼

*   **기본 스타일:**
    *   `display`: `flex`
    *   `justify-content`: `center`
    *   `align-items`: `center`
    *   `padding`: `spacing-xs` (`8px`) 상하, `spacing-md` (`16px`) 좌우
    *   `border-radius`: `radius-md` (`8px`)
    *   `font-size`: `body-md` (`1em`)
    *   `cursor`: `pointer`
    *   `transition`: `background-color 0.2s ease`
    *   **텍스트 수직 정렬:** `display: flex`와 `align-items: center`를 사용해도 글꼴 렌더링 특성상 텍스트가 시각적으로 완벽하게 중앙에 위치하지 않을 수 있습니다. 이 경우, `line-height` 또는 `padding-top`/`padding-bottom`의 미세 조정을 통해 시각적 중앙 정렬을 달성합니다. (예: `line-height: 1.2em;` 또는 `padding: 7px 8px 8px 8px;`)*   **Primary Button:**
    *   `background-color`: `Primary` (`#007aff`)
    *   `color`: `white`
    *   `hover`: `darken(Primary, 10%)` (예: `#0056b3`)
*   **Secondary Button:**
    *   `background-color`: `Secondary` (`#ff9800`)
    *   `color`: `white`
    *   `hover`: `darken(Secondary, 10%)` (예: `#e68900`)
*   **Default Button (Action Button):**
    *   `background-color`: `Background Light` (`#f0f0f0`)
    *   `color`: `Text Default` (`#333`)
    *   `hover`: `darken(Background Light, 5%)` (예: `#e0e0e0`)
*   **Small Button:**
    *   `padding`: `spacing-xxs` (`4px`) 상하, `spacing-md` (`16px`) 좌우
    *   `font-size`: `body-sm` (`0.9em`)
    *   `border-radius`: `radius-sm` (`4px`) (제안)
    *   **적용 대상:** '추가', '편집', '삭제', '시간순 정렬', '목록', '기록 초기화' 등 작은 크기의 액션 버튼
*   **Danger Button:**
    *   `background-color`: `Danger` (`#d90007`)
    *   `color`: `white`
    *   `hover`: `darken(Danger, 10%)` (예: `#b30006`)
*   **Icon Button (원형):**
    *   `width`: `36px`
    *   `height`: `36px`
    *   `border`: `2px solid` (색상은 `color` 속성 상속)
    *   `border-radius`: `radius-full` (`50%`)
    *   `display`: `flex`, `align-items`: `center`, `justify-content`: `center`
    *   `color (default)`: `Danger` (`#d90007`)
    *   `color (muted)`: `Text Light` (`#666`)
    *   **적용 대상:** 대시보드의 '음소거 버튼'
*   **Disabled State:**
    *   `background-color`: `Disabled` (`#cccccc`)
    *   `color`: `Text Light` (`#666`) (제안)
    *   `cursor`: `default`
    *   `opacity`: `0.5`

### 7.2. 카드

*   **기본 스타일:**
    *   `background-color`: `white`
    *   `padding`: `spacing-lg` (`20px`)
    *   `border-radius`: `radius-md` (`8px`)
    *   `box-shadow`: `shadow-sm` (`0 2px 4px rgba(0,0,0,0.1)`)
*   **강조된 카드 (예: 계산기 카드):**
    *   `padding`: `spacing-lg` (`20px`)
    *   `border-radius`: `radius-md` (`8px`)
    *   `box-shadow`: `shadow-md` (`0 4px 8px rgba(0,0,0,0.15)`)

### 7.2.1. 카드 헤더 (제목 + 액션 버튼)

카드 상단에 제목과 함께 버튼 등의 액션 요소를 배치할 때 사용하는 패턴입니다.

*   **HTML 구조:**
    ```html
    <div class="light-calculator-header"> <!-- 실제 클래스명 사용 -->
        <h3>카드 제목</h3>
        <button>액션</button>
    </div>
    ```
*   **CSS 스타일:**
    *   `.light-calculator-header`
        *   `display`: `flex`
        *   `justify-content`: `space-between`
        *   `align-items`: `center`
        *   `border-bottom`: `1px solid Border/Divider Default` (`#ccc`)
        *   `padding-bottom`: `spacing-xs` (`8px`)
        *   `margin-bottom`: `spacing-lg` (`20px`)
    *   `.light-calculator-header h3`
        *   `border-bottom`: `none`
        *   `padding-bottom`: `0`
        *   `margin-bottom`: `0`

### 7.3. 입력 필드

*   **기본 스타일:**
    *   `padding`: `spacing-xs` (`8px`)
    *   `border`: `1px solid Border Default` (`#ccc`)
    *   `border-radius`: `radius-sm` (`4px`)
    *   `font-size`: `body-md` (`1em`)

### 7.4. 토글 스위치

*   **기본 스타일:**
    *   `width`: `40px`
    *   `height`: `23px`
    *   `slider background (off)`: `Disabled` (`#cccccc`)
    *   `slider background (on)`: `Primary` (`#007aff`)
    *   `slider:before (handle)`: `white`, `border-radius: radius-full` (`50%`)

### 7.5. 내비게이션 항목 (사이드바)

*   **기본 스타일:**
    *   `padding`: `spacing-xs` (`8px`) 상하, `spacing-sm` (`12px`) 좌우 (제안)
    *   `border-radius`: `radius-md` (`8px`) (제안)
    *   `color`: `Text Dark` (`#222`)
    *   `hover`: `Background Light` (`#e0e0e0`)
    *   `active`: `Border/Divider Default` (`#d0d0d0`)

## 8. 아이콘

*   **기본 색상:** `Text Light` (`#666`)
*   **활성/강조 색상:** `Text Dark` (`#222`) (제안)
*   **크기:** `menu-icon` `30px`, `sidebar-toggle-icon` `48px`, `alarm-icon` `56px` (현재 유지)

## 9. 툴팁

*   **기본 스타일:**
    *   `background-color`: `#555` (현재 유지)
    *   `color`: `white`
    *   `padding`: `spacing-xxs` (`4px`) 상하, `spacing-xs` (`8px`) 좌우 (제안)
    *   `border-radius`: `radius-sm` (`4px`)
    *   `z-index`: `1000`

## 10. 모달

*   **기본 스타일:**
    *   `background-color`: `Background Light` (`#f8f8f8`)
    *   `border-radius`: `radius-lg` (`12px`)
    *   `box-shadow`: `shadow-lg` (`0 8px 16px rgba(0,0,0,0.2)`)
    *   `close-button`: `white` (색상 유지)
