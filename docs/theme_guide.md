# 테마 스타일 가이드 (Theme Style Guide)

## 1. 개요
이 문서는 Boss Alarm 애플리케이션의 색상 테마 생성 및 관리 방법에 대해 설명합니다. 새로운 테마를 추가하거나 기존 테마를 수정할 때 이 가이드를 참고하세요.

## 2. 테마 파일 관리

### 2.1. 폴더 구조
- **활성 테마:** `src/styles/style.css`
  - 현재 애플리케이션에 적용된 기본 스타일시트입니다.
- **비활성 테마 보관:** `src/styles/color-themes/`
  - 현재 사용되지 않는 다크 모드 및 추가 커스텀 테마 파일들이 보관되는 폴더입니다.

### 2.2. 파일명 규칙
- `style.css`: 기본 테마 (iOS Pure / Theme 1)
- `style.dark.css`: 다크 모드 (Theme 2)
- `style.theme{번호}.css` (예: `style.theme9.css`): 추가 커스텀 테마

## 3. 새 테마 생성 절차

### 1단계: 파일 생성
**가장 최신 버전의 `src/styles/style.css` 파일을 복사**하여 `src/styles/color-themes/` 폴더 안에 새로운 테마 파일을 생성합니다.

```powershell
# 예시: style.css를 복사하여 Theme 9 생성
Copy-Item src/styles/style.css -Destination src/styles/color-themes/style.theme9.css
```

### 2단계: CSS 수정 (핵심 포인트)
테마의 분위기를 결정하는 주요 CSS 속성들을 수정합니다.

#### 1) 배경 및 기본 폰트 색상 (Body)
```css
body {
    /* 배경 그라데이션 또는 단색 */
    background: linear-gradient(135deg, #시작색 0%, #끝색 100%);
    color: #텍스트색상;
}
```

#### 2) 헤더 및 사이드바 (Glassmorphism 효과)
현대적인 유리 질감을 표현하려면 `rgba` 배경색과 `backdrop-filter`를 조합합니다.
```css
header, nav.sidebar {
    background: rgba(255, 255, 255, 0.7); /* 반투명 배경 */
    backdrop-filter: blur(12px);          /* 블러 효과 */
    border-bottom: 1px solid rgba(255, 255, 255, 0.5);
}
```

#### 3) 버튼 및 포인트 (Highlight)
주요 버튼(`primary-button`, `startButton`)과 활성화 상태(`active`)에 그라데이션을 적용하여 심미성을 높입니다.
```css
.primary-button {
    background: linear-gradient(135deg, #포인트A 0%, #포인트B 100%);
    box-shadow: 0 4px 15px rgba(..., 0.3); /* 광채 효과 */
}
```

#### 4) 카드 스타일 (.card-standard)
컨텐츠 영역인 카드의 투명도와 그림자를 테마에 맞게 조정합니다.
```css
.card-standard {
    background: rgba(255, 255, 255, 0.6); /* 반투명 화이트 */
    backdrop-filter: blur(16px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.4);
}
```

## 4. 테마 적용 및 확인

> **⚠️ 중요:** 아래 절차는 테마 적용의 기본 원리를 설명하기 위한 예시입니다. `style.css`의 내용이 계속해서 변경되므로, `color-themes` 폴더에 보관된 과거의 테마 파일을 `index.html`에 바로 연결하여 적용할 경우 UI가 깨질 수 있습니다.
>
> 새로운 테마를 적용하거나 기존 테마를 다시 사용할 때는 **항상 가장 최신 `style.css` 파일을 기반으로** 다시 작업하는 것을 원칙으로 해야 합니다.

1.  (필요시) `color-themes` 폴더의 테마 파일을 최신 `style.css` 기준으로 업데이트합니다.
2.  `index.html` 파일에서 현재 `style.css`를 비활성화하고, 적용할 테마 파일의 경로를 연결합니다.
    ```html
    <!-- <link rel="stylesheet" href="src/styles/style.css"> -->
    <link rel="stylesheet" href="src/styles/color-themes/style.theme9.css">
    ```
3.  브라우저를 새로고침하여 디자인을 시각적으로 검증합니다.

## 5. (참고) 기존 테마 레퍼런스
* **Theme 7 (Glassy Aurora Dark):** 어두운 오로라 그라데이션 + 다크 글래스
* **Theme 8 (Glassy Aurora Light):** 밝은 스카이/라벤더 그라데이션 + 화이트 글래스
