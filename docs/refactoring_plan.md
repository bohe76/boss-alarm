# 리팩토링 계획: 확장성을 위한 모듈화

## 목표
기존 "보스 알리미" 코드베이스를 리팩토링하여 `src/event-handlers.js`와 `src/ui-renderer.js`의 복잡도를 줄이고, 향후 푸시 알림 기능을 회귀(Regression) 없이 안정적으로 지원할 수 있도록 구조를 개선합니다.

## 문제점 분석
- **God Object (`event-handlers.js`):** 1000줄이 넘는 코드에 UI 이벤트 처리, 비즈니스 로직, 라우팅, 상태 관리가 뒤섞여 있습니다.
- **강한 결합 (Tight Coupling):** 로직이 `DOM` 객체 및 특정 HTML 구조에 강하게 결합되어 있습니다.
- **확장성 문제:** 이 상태에서 "푸시 알림" 로직(권한, 서비스 워커 등록, 동기화 등)을 추가하면 유지보수가 불가능해집니다.

## 변경 제안

### 1단계: 라우터 추출 (Router Extraction)
**목표:** 내비게이션 및 화면 전환 로직을 이벤트 핸들러에서 분리합니다.
- **[신규] `src/router.js`**:
    - `showScreen` 로직을 이곳으로 이동합니다.
    - 사이드바 및 하단 탭 상태 업데이트를 처리합니다.
    - 단순한 API 제공: `Router.navigate(screenId)`.

### 2단계: 화면 로직 추출 (Screen Logic Extraction)
**목표:** 화면별 비즈니스 로직을 전용 모듈로 이동합니다.
- **[신규] `src/screens/share-screen.js`**:
    - URL 생성, 단축, 클립보드 복사 로직 처리.
- **[신규] `src/screens/help-screen.js`**:
    - `feature_guide.json` 로드 및 도움말 아코디언 렌더링 처리.
- **[신규] `src/screens/calculator-screen.js`**:
    - 젠 계산기 및 빛 계산기 로직/이벤트 처리.
- **[신규] `src/screens/boss-scheduler-screen.js`**:
    - 보스 스케줄러 입력, 게임 선택, "설정으로 이동" 로직 처리.
- **[신규] `src/screens/boss-management-screen.js`**:
    - "서버 저장"(추후 예정), 정렬, 텍스트 파싱 로직 처리.

### 3단계: 이벤트 핸들러 리팩토링
**목표:** `event-handlers.js`를 단순한 초기화 진입점으로 축소합니다.
- **[수정] `src/event-handlers.js`**:
    - 추출된 로직 제거.
    - `Router` 및 화면 모듈 초기화.
    - 각 모듈로 이벤트 위임.

### 4단계: UI 렌더러 정리 (선택/부차적)
- **[수정] `src/ui-renderer.js`**:
    - 시간 여유가 있다면 함수들을 객체로 그룹화 (예: `DashboardRenderer`, `SettingsRenderer`).

## 검증 계획
- **수동 검증:**
    - 각 추출 단계 후 해당 기능이 여전히 작동하는지 확인 (예: 공유 화면 추출 후 링크 생성 테스트).
    - `npm run lint`를 사용하여 문법 오류나 정의되지 않은 변수 확인.
- **회귀 테스트 (Regression Testing):**
    - 핵심 기능인 "보스 타이머" 기능이 절대 깨지지 않도록 확인.
