---
id: issue-015
title: "보스 관리 화면 뷰/편집 모드 추가"
status: "미해결"
priority: "High"
assignee: ""
labels:
  - "feature"
  - "boss-management"
created_date: "2025-12-11"
resolved_date: ""
---

# Issue-015: 보스 관리 화면 뷰/편집 모드 추가

## 1. 개요 (Overview)
보스 관리 화면에 길드 운영자 및 길드원 사용성 증대를 위한 뷰 모드 및 편집 모드 기능을 추가합니다.

## 2. 문제점 또는 요구사항 (Problem or Requirement)
*   현재 보스 관리 화면은 텍스트 영역을 통한 보스 목록 직접 수정 방식으로, 일반 길드원이 보스를 확인하기에는 불필요하게 복잡합니다.
*   길드 운영자는 보스 설정을 편집할 수 있어야 하며, 길드원은 편집 기능 없이 보스 목록만 직관적으로 확인할 수 있어야 합니다.

## 3. 제안된 해결 방안 (Proposed Solution)
보스 관리 화면에 뷰 모드와 편집 모드를 전환하는 토글 버튼을 추가하고, 각 모드에 따라 UI와 기능을 분리합니다.

### 3.1. 모드 전환 및 UI 배치
*   **토글 버튼:** 뷰 모드와 편집 모드를 전환하는 토글 버튼을 추가합니다.
*   **기본 모드 및 상태 유지:**
    *   기본 모드는 '뷰 모드'입니다.
    *   마지막으로 선택된 모드는 `localStorage`에 저장되어 다음에 앱을 열 때 유지됩니다.
*   **버튼 위치 및 스타일:**
    *   `h2` 제목 아래, 콘텐츠 우측에 배치하며, 프라이머리 색상을 사용합니다.

### 3.2. 뷰 모드 (View Mode) 상세
*   **'다음 보스' 토글 버튼:**
    *   뷰 모드일 때만 표시됩니다. (로그 화면의 '15개 보기' 토글과 동일한 디자인)
    *   '뷰/편집' 토글 버튼 바로 왼쪽에 배치합니다.
    *   **ON 상태:** 현재 시간 이후의 보스만 표시합니다.
    *   **OFF 상태:** 모든 보스를 표시합니다.
*   **UI 요소 숨김:**
    *   안내 텍스트 ("알림을 받으려면~", "정확한 알림을 위해~")를 숨깁니다.
    *   하단의 "보스 설정 저장" 버튼을 숨깁니다.
*   **데이터 표시 방식:**
    *   보스 목록을 **표(Table) 형식**으로 표시합니다.
    *   날짜가 변경될 때마다 날짜를 표시하는 행을 추가하고, 그 아래에 해당 날짜의 시간과 보스 이름을 표시합니다.

### 3.3. 편집 모드 (Edit Mode) 상세
*   현재 보스 관리 화면의 UI 및 기능을 그대로 유지합니다. (텍스트 영역, 저장 버튼 등)

## 4. 구현 체크리스트 (Implementation Checklist)

### **0단계: 사전 준비 및 UI 요소 추가**

<details>
<summary>0.1. '뷰/편집' 토글 버튼 및 '다음 보스' 토글 버튼 DOM 요소 추가</summary>

- [x] **사전 분석:** `src/screens/boss-management.js`의 `initBossManagementScreen` 함수 내에서 DOM 조작이 이루어질 위치를 확인합니다. `index.html`에서 `boss-management-screen` 영역에 필요한 HTML 구조를 추가합니다.
- [x] **실행 계획 1 (HTML 추가):** `index.html`의 `boss-management-screen` 내 `h2` 제목 아래에 '뷰/편집' 토글 버튼과 '다음 보스' 토글 버튼을 위한 HTML 구조를 추가합니다. `DOM.bossManagementScreen` 내부에 추가될 요소들의 ID를 정의합니다.
- [x] **실행 계획 2 (DOM 요소 등록):** `src/dom-elements.js`에 새로 추가된 토글 버튼들의 ID를 등록하여 `DOM` 객체에서 접근 가능하도록 합니다.
- [x] **검증:** 개발자 도구에서 해당 DOM 요소들이 정상적으로 추가되고 `DOM` 객체에 바인딩되었는지 확인합니다.
- [x] **커밋:** `git commit -m "feat(boss-management): 뷰/편집 및 다음 보스 토글 버튼 DOM 요소 추가"`
</details>

### **1단계: 모드 전환 로직 구현**

<details>
<summary>1.1. '뷰/편집' 모드 토글 기능 구현 및 `localStorage` 연동</summary>

- [x] **사전 분석:** `src/screens/boss-management.js`에서 '뷰/편집' 토글 버튼 클릭 이벤트 리스너를 추가할 위치를 확인합니다. `LocalStorageManager`를 사용하여 모드 상태를 저장하고 로드하는 방식을 결정합니다. `ui-renderer.js`에서 모드에 따른 UI 업데이트 함수를 호출할 수 있도록 준비합니다.
- [x] **실행 계획 1 (토글 함수):** `src/screens/boss-management.js`에 `toggleBossManagementMode` 함수를 생성하고, 클릭 이벤트에 바인딩합니다. 이 함수는 `LocalStorageManager.set('bossManagementMode', currentMode)`를 사용하여 현재 모드를 저장합니다.
- [x] **실행 계획 2 (초기 모드 설정):** `initBossManagementScreen` 함수 내에서 `LocalStorageManager.get('bossManagementMode')`를 통해 저장된 모드를 로드하고, 없으면 '뷰 모드'로 초기화합니다.
- [x] **실행 계획 3 (UI 업데이트):** 모드 변경 시 `ui-renderer.js`의 새로운 함수(`updateBossManagementUI(DOM, mode)`)를 호출하여 해당 모드에 맞는 UI를 표시/숨김 처리합니다.
- [x] **검증:**
    1.  '보스 관리' 화면에서 '뷰/편집' 토글 버튼 클릭 시 모드가 정상적으로 전환되는지 확인합니다.
    2.  새로고침 후에도 마지막으로 선택한 모드가 유지되는지 확인합니다.
    3.  개발자 도구의 `localStorage`에서 `bossManagementMode` 값이 정상적으로 저장되는지 확인합니다.
- [x] **커밋:** `git commit -m "feat(boss-management): 뷰/편집 모드 토글 기능 및 localStorage 연동 구현"`
</details>

<details>
<summary>1.2. '뷰 모드'에서 '다음 보스' 토글 기능 구현</summary>

- [x] **사전 분석:** '다음 보스' 토글 버튼이 '뷰 모드'일 때만 활성화되어야 함을 인지합니다. `LocalStorageManager`를 사용하여 '다음 보스' 필터 상태를 저장하고 로드합니다.
- [x] **실행 계획 1 (토글 함수):** `src/screens/boss-management.js`에 `toggleNextBossFilter` 함수를 생성하고, 클릭 이벤트에 바인딩합니다. 이 함수는 `LocalStorageManager.set('bossManagementNextBossFilter', isEnabled)`를 사용하여 상태를 저장합니다.
- [x] **실행 계획 2 (초기 상태 설정):** '뷰 모드'로 전환될 때 `LocalStorageManager.get('bossManagementNextBossFilter')`를 통해 저장된 상태를 로드하고, 없으면 'ON'으로 초기화합니다.
- [x] **실행 계획 3 (UI 업데이트):** 상태 변경 시 `ui-renderer.js`의 `renderBossListTableView(DOM, filter)` 함수를 호출하여 필터링된 보스 목록을 다시 렌더링합니다.
- [x] **검증:**
    1.  '뷰 모드'에서 '다음 보스' 토글 버튼 클릭 시 필터링이 정상적으로 적용되는지 확인합니다.
    2.  새로고침 후에도 '다음 보스' 필터 상태가 유지되는지 확인합니다.
- [x] **커밋:** `git commit -m "feat(boss-management): 뷰 모드에서 다음 보스 필터 토글 기능 구현"`
</details>

### **2단계: UI 렌더링 로직 분리 및 구현**

<details>
<summary>2.1. `ui-renderer.js`에 모드별 UI 업데이트 함수 추가</summary>

- [x] **사전 분석:** '뷰 모드'일 때 특정 UI 요소를 숨기고, '편집 모드'일 때 다시 보이도록 하는 로직을 `ui-renderer.js`에 구현합니다. '다음 보스' 토글 버튼도 모드에 따라 표시/숨김 처리해야 합니다.
- [x] **실행 계획:** `src/ui-renderer.js`에 `updateBossManagementUI(DOM, mode)` 함수를 추가합니다. 이 함수는 `DOM` 객체와 현재 모드를 인자로 받아 다음 작업을 수행합니다:
    *   '뷰 모드'일 때: 안내 텍스트, '보스 설정 저장' 버튼, '보스 목록 텍스트 영역'을 숨기고, '다음 보스' 토글 버튼 및 표 형식의 보스 목록 컨테이너를 표시합니다.
    *   '편집 모드'일 때: 위 요소들을 반대로 처리하고, 기존 텍스트 영역과 저장 버튼을 표시합니다.
- [x] **검증:** '뷰/편집' 토글 버튼 클릭 시 예상대로 UI 요소들의 표시/숨김이 정상적으로 작동하는지 확인합니다.
- [x] **커밋:** `git commit -m "feat(ui-renderer): 보스 관리 화면 모드별 UI 업데이트 함수 추가"`
</details>

<details>
<summary>2.2. '뷰 모드'에서 보스 목록 표(Table) 형식 렌더링 함수 구현</summary>

- [x] **사전 분석:** `BossDataManager`에서 보스 스케줄 데이터를 가져와 날짜별로 그룹화하여 표 형태로 HTML 문자열을 생성해야 합니다. '다음 보스' 필터가 적용될 경우, 현재 시간 이후의 보스만 포함해야 합니다.
- [x] **실행 계획:** `src/ui-renderer.js`에 `renderBossListTableView(DOM, filterNextBoss)` 함수를 추가합니다. 이 함수는 `BossDataManager.getBossSchedule()`를 통해 데이터를 가져오고, `filterNextBoss` 값에 따라 필터링한 후, 날짜별로 그룹화하여 `<table>` 요소를 포함한 HTML 문자열을 생성하고 `DOM.bossListTableContainer`에 삽입합니다.
- [x] **검증:** '뷰 모드'에서 보스 목록이 표 형태로 정상적으로 표시되고, '다음 보스' 토글 버튼 작동 시 필터링이 올바르게 적용되는지 확인합니다.
- [x] **커밋:** `git commit -m "feat(ui-renderer): 뷰 모드용 보스 목록 표 렌더링 함수 구현"`
</details>

### **3단계: 기존 로직 수정 및 통합**

<details>
<summary>3.1. `src/screens/boss-management.js` 초기화 로직 수정</summary>

- [x] **사전 분석:** `initBossManagementScreen` 함수는 이제 모드 전환과 '다음 보스' 필터 상태를 초기화하고, `ui-renderer.js`의 함수들을 호출해야 합니다.
- [x] **실행 계획:** `src/screens/boss-management.js`의 `initBossManagementScreen` 함수 내에서:
    *   `LocalStorageManager`에서 저장된 모드를 로드합니다.
    *   로드된 모드를 기반으로 `ui-renderer.js`의 `updateBossManagementUI`를 호출하여 초기 UI를 설정합니다.
    *   만약 모드가 '뷰 모드'이면 `LocalStorageManager`에서 '다음 보스' 필터 상태를 로드하고, 이를 `ui-renderer.js`의 `renderBossListTableView` 호출 시 인자로 전달합니다.
- [x] **검증:** 앱 실행 시 '보스 관리' 화면이 마지막으로 저장된 모드로 올바르게 시작하고, '뷰 모드'일 때 '다음 보스' 필터 상태가 유지되며 데이터가 정상적으로 표시되는지 확인합니다.
- [x] **커밋:** `git commit -m "refactor(boss-management): 보스 관리 화면 초기화 로직에 모드 전환 및 필터 적용"`
</details>

<details>
<summary>3.2. 기존 "보스 설정 저장" 버튼 로직 조건부 실행</summary>

- [x] **사전 분석:** "보스 설정 저장" 버튼의 기존 로직은 '편집 모드'일 때만 작동해야 합니다.
- [x] **실행 계획:** `src/screens/boss-management.js`의 `DOM.sortBossListButton` 클릭 이벤트 리스너 내부에 현재 모드가 '편집 모드'일 경우에만 기존 로직을 실행하도록 조건문을 추가합니다.
- [x] **검증:** '뷰 모드'일 때 "보스 설정 저장" 버튼이 보이지 않으며, '편집 모드'일 때 버튼이 보이고 클릭 시 기존 저장 기능이 정상적으로 작동하는지 확인합니다.
- [x] **커밋:** `git commit -m "refactor(boss-management): 저장 버튼 로직을 편집 모드에서만 작동하도록 수정"`
</details>

### **4단계: 테스트 및 최종 검증**

<details>
<summary>4.1. Unit 테스트 추가</summary>

- [x] **사전 분석:** '뷰/편집' 모드 전환, '다음 보스' 필터링, `localStorage` 연동, 그리고 표 형식 렌더링 로직에 대한 유닛 테스트를 `test/boss-management.test.js` 또는 `test/ui-renderer.test.js`에 추가합니다.
- [x] **실행 계획:**
    *   `bossManagementMode` 및 `bossManagementNextBossFilter` `localStorage` 값을 Mocking하여 모드 및 필터 상태 로드/저장 테스트.
    *   `updateBossManagementUI` 함수가 모드에 따라 올바른 DOM 요소를 표시/숨김 처리하는지 테스트.
    *   `renderBossListTableView` 함수가 `BossDataManager` 데이터를 기반으로 정확한 HTML 테이블을 생성하는지, '다음 보스' 필터가 올바르게 적용되는지 테스트.
- [x] **검증:** `npm test`를 실행하여 새로 추가된 유닛 테스트가 모두 통과하는지 확인합니다.
- [x] **커밋:** `git commit -m "test(boss-management): 뷰/편집 모드 및 다음 보스 필터 기능 유닛 테스트 추가"`
</details>

<details>
<summary>4.2. Lint 검사 및 최종 기능 확인</summary>

- [ ] **사전 분석:** 모든 코드 변경 후에는 `npm run lint`를 통해 코드 스타일 및 잠재적 오류를 검사해야 합니다.
- [ ] **실행 계획:**
    *   `npm run lint`를 실행하여 Lint 오류가 없는지 확인합니다.
    *   애플리케이션을 전체적으로 테스트하여 모든 기능이 정상적으로 작동하는지 최종 확인합니다.
- [ ] **검증:** Lint 오류가 없음을 확인하고, 모든 기능이 정상 작동함을 사용자에게 보고합니다.
- [ ] **커밋:** `git commit -m "chore(boss-management): 뷰/편집 모드 기능 Lint 검사 및 최종 확인"`
</details>
