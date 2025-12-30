---
id: issue-028
title: "구조적 한계 극복을 위한 모듈화 및 리팩토링 전략 (Sandcastle Codebase)"
status: "미해결"
priority: "Critical"
assignee: ""
labels:
  - refactoring
  - architecture
  - technical-debt
created_date: "2025-12-31"
resolved_date: ""
---

# Issue-028: 구조적 한계 극복을 위한 모듈화 및 리팩토링 전략

## 1. 개요 (Overview)
현재 프로젝트는 기능이 지속적으로 추가되면서 초기 설계의 한계에 봉착했다. 특히 UI 렌더링(`ui-renderer.js`)과 DOM 구조(`index.html`, CSS), 그리고 비즈니스 로직(각종 screen 모듈)이 강하게 결합되어 있어, **"모래성 코드(Sandcastle Code)"**와 같은 상태이다. 하나의 작은 수정(예: CSS 클래스 변경, div 래퍼 추가)이 전혀 예상치 못한 기능(예: 내보내기 캡처, 스크롤 동작)을 망가뜨리는 사이드 이펙트가 빈번하다.

본 이슈는 이러한 구조적 취약점을 인정하고, 장기적인 유지보수성과 안정성을 확보하기 위한 근본적인 리팩토링 방향성을 정의한다.

**⚠️ 주의: 본 이슈의 실행은 다른 모든 기능 개발이 완료된 후, 사용자(보헤님)의 명시적인 "리팩토링 시작" 지시가 있을 때만 진행한다.**

## 2. 문제점 상세 (Detailed Problems)

### 2.1. 강한 결합도 (Tightly Coupled DOM & Logic & Style)
*   **증상**: JS 로직이 특정 HTML 구조(부모-자식 관계)나 ID/Class 이름에 지나치게 의존적이다.
*   **사례**: `ui-renderer.js`에서 2단 레이아웃을 위해 `boss-list-table` ID를 가진 div를 제거하자, `timetable.js`의 내보내기 로직이 해당 ID를 찾지 못해 크래시가 발생함.
*   **위험**: 디자인을 조금만 변경해도 기능이 깨질 수 있어, UI 수정에 대한 두려움이 가중된다.

### 2.2. 캡슐화 부재 (Leakage of Concerns)
*   **증상**: 특정 컴포넌트(예: 시간표)의 내부 구현 상세가 전역적으로 노출되어 있다.
*   **사례**: `global-event-listeners.js`나 `app.js`가 특정 화면의 렌더링 함수(`updateTimetableUI`)를 직접 호출하거나 제어하려고 한다.
*   **위험**: 모듈 간 경계가 모호하여, 스파게티 코드가 양산되고 디버깅이 어려워진다.

### 2.3. 방어적 설계 부족 (Lack of Defensive Engineering)
*   **증상**: "항상 이상적인 상태일 것"이라는 가정하에 코드가 작성되어 있다.
*   **사례**: DOM 요소가 없을 때의 예외 처리 부족, 비동기 데이터 로딩 시점 차이에 따른 레이스 컨디션 고려 부족.
*   **위험**: 네트워크 지연이나 예상치 못한 사용자 동작 시 앱이 멈추거나 백화 현상이 발생한다.

### 2.4. 암시적 의존성 (Implicit Dependencies)
*   **증상**: CSS 클래스 하나가 레이아웃뿐만 아니라 JS 로직의 타겟팅 용도로 혼용된다.
*   **위험**: 스타일 정리를 위해 클래스명을 바꿨는데 기능이 동작하지 않는 황당한 상황 발생.

## 3. 리팩토링 방향 및 해결 방안 (Refactoring Strategy)

### 3.1. 컴포넌트 기반 아키텍처 도입 (Vanilla JS Component Pattern)
*   **개념**: React나 Vue를 쓰지 않더라도, 바닐라 JS로 **"상태(State)를 받으면 UI(HTML)를 뱉는"** 순수 함수 형태의 컴포넌트 구조를 확립한다.
*   **실행**:
    *   `UI Component`는 자신의 HTML 구조와 스타일을 스스로 책임진다.
    *   외부에서는 컴포넌트의 내부 DOM 구조를 알 필요 없이, `render(state)` 메소드만 호출한다.

### 3.2. 의존성 역전 및 격리 (Dependency Inversion & Isolation)
*   **DOM ID 의존성 제거**: JS에서 `document.getElementById`로 요소를 찾는 것을 최소화하고, 초기화 시점에 루트 컨테이너만 주입받아 그 내부에서 `querySelector`로 범위를 한정한다.
*   **EventBus 활용 고도화**: 모듈 간 직접 호출(Direct Call)을 금지하고, 명확한 이벤트를 정의하여 느슨한 결합(Loose Coupling)을 유지한다.

### 3.3. CSS 아키텍처 재수립 (BEM or Utility-First)
*   **목표**: 스타일 변경이 로직에 영향을 주지 않도록 **"기능용 클래스(js-*)"와 "스타일용 클래스"를 분리**한다.
*   **실행**:
    *   로직 타겟팅용: `.js-export-target`, `.js-modal-close`
    *   스타일링용: `.btn-primary`, `.card-layout`

### 3.4. SSOT(Single Source of Truth) 강화
*   DOM을 데이터 저장소로 쓰지 않는다. (예: `dataset`에 저장된 값 읽기 지양)
*   모든 상태는 JS 객체(Store)에만 존재하며, UI는 그 상태의 '반영(Projection)'일 뿐이어야 한다.

## 4. 실행 계획 (Execution Plan)

**본 리팩토링은 "빅뱅" 방식이 아닌, 모듈 단위의 "점진적 교체" 방식으로 진행한다.**

1.  **Phase 1: 기반 마련**
    *   컴포넌트 베이스 클래스 정의 (`Component.js`)
    *   상태 관리 단순화 (Store 패턴 정립)
2.  **Phase 2: 핵심 모듈 격리**
    *   가장 복잡도가 높은 `timetable.js`와 `ui-renderer.js`의 시간표 관련 로직부터 분리.
3.  **Phase 3: 전역 청소**
    *   `global-event-listeners.js`의 직접 호출 제거.
    *   불필요한 DOM ID 의존성 제거.

## 5. 실행 조건 (Action Trigger)
*   **우선순위**: Critical (중요하지만 긴급하지 않음)
*   **트리거**: 현재 진행 중인 모든 기능 개발 및 안정화 작업이 끝난 후, **사용자(보헤님)가 "이제 이슈 028 리팩토링을 시작하세요"라고 명시적으로 지시할 때 착수한다.**
