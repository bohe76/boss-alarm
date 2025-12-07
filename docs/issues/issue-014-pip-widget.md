### **Document PiP 위젯 도입 기능 구현 체크리스트 (v1)**

#### **0. 작업 원칙: 분석 → 제안 → 컨펌 → 구현 → 검증 → 컨펌 → 커밋**

이 문서는 아래 7단계의 원칙에 따라 작업을 진행하여, 사이드 이펙트를 방지하고 안정적인 개발을 보장합니다.

1.  **[Agent] 사전 분석:** 각 항목의 '실행 계획'을 구현하기 전, 코드 베이스 전체에 미칠 영향을 분석하여 잠재적 문제를 파악합니다.
2.  **[Agent] 계획 제안:** 분석 결과를 바탕으로, 구체적인 실행 계획과 코드 변경안을 사용자에게 제안합니다.
3.  **[User] 계획 컨펌:** 사용자는 제안된 계획을 검토하고 최종 승인합니다.
4.  **[Agent] 구현:** 승인된 계획에 따라 코드를 수정합니다.
5.  **[Agent] 검증 요청:** 구현이 완료되면, 사용자에게 '검증'을 요청하고 대기합니다.
6.  **[User] 최종 컨펌:** 사용자는 구현된 내용을 직접 확인하고, 문제가 없으면 커밋을 포함한 최종 진행을 승인(컨펌)합니다.
7.  **[Agent] 커밋:** 사용자의 최종 컨펌 후, 해당 단계의 변경사항을 커밋합니다.

---

#### **1.0 개요 및 전략**

이 문서는 최신 브라우저의 Document Picture-in-Picture API를 활용하여, 대시보드의 '다음 보스' 정보를 별도의 소형 오버레이 창(위젯)에 표시하는 기능을 구현하기 위한 실행 계획입니다.

*   **목표:** 사용자가 게임 등 다른 화면을 보면서도 다음 보스 정보를 항상 확인할 수 있는 PiP(Picture-in-Picture) 위젯을 제공.
*   **핵심 전략:** UI 우선 구현 후 PiP 로직과 데이터 동기화 기능을 순차적으로 개발.
*   **체크 완료:** 완료 되고, 사용자가 검증을 완료 하면, 체크 리스트를 완료로 변경.

---

### **0단계: UI/UX 구현 (UI-First)**

<details open>
<summary><strong>✅ 0.1. PiP 토글 버튼 UI 구현</strong></summary>

- [x] **사전 분석:** `index.html`의 대시보드 섹션 내 '다음 보스' 카드 헤더에 PiP 기능을 켜고 끌 수 있는 버튼이 필요합니다.
- [x] **실행 계획:**
    *   `index.html`의 `#nextBossCard > .card-header` 내부에 PiP 아이콘을 포함한 `<button id="pip-toggle-button">`을 추가합니다.
    *   `src/styles/style.css`에 버튼에 대한 스타일(크기, 위치, 아이콘 모양)을 정의합니다.
    *   API를 지원하지 않는 브라우저를 위해 버튼은 기본적으로 숨김 처리(`display: none`)합니다.
- [x] **검증:** 대시보드 '다음 보스' 카드 우측 상단에 PiP 버튼이 디자인에 맞게 표시되는지 확인.
</details>

<details open>
<summary><strong>✅ 0.2. PiP 창을 위한 콘텐츠 HTML 파일 생성</strong></summary>

- [x] **사전 분석:** PiP 창에 표시될 내용은 메인 페이지와 별도로 관리되는 것이 효율적입니다.
- [x] **실행 계획:**
    *   `src/pip-content.html` 파일을 생성합니다.
    *   해당 파일에 '다음 보스' 이름과 남은 시간을 표시할 최소한의 HTML 구조(`id="pip-boss-name"`, `id="pip-remaining-time"` 등)와 CSS 스타일을 작성합니다.
- [x] **검증:** `pip-content.html` 파일이 생성되고, PiP 위젯에 필요한 최소한의 구조와 스타일이 포함되었는지 확인.
</details>

---

### **1단계: 핵심 PiP 기능 구현**

<details open>
<summary><strong>✅ 1.1. PiP 기능 관리자(`pip-manager.js`) 생성</strong></summary>

- [x] **사전 분석:** PiP 창의 상태(열림/닫힘), 창 참조, 콘텐츠 업데이트 로직을 중앙에서 관리할 모듈이 필요합니다.
- [x] **실행 계획:**
    *   `src/pip-manager.js` 파일을 새로 생성합니다.
    *   PiP 창의 상태와 참조를 관리할 변수(`pipWindow`, `isPipOpen`)를 선언합니다.
    *   PiP 창을 열고 닫는 `togglePipWindow()`, PiP 창의 콘텐츠를 업데이트하는 `updatePipContent()` 등의 함수를 정의합니다.
- [x] **검증:** `src/pip-manager.js` 파일 및 기본 함수 구조가 생성되었는지 확인.
</details>

<details open>
<summary><strong>✅ 1.2. PiP 창 열기/닫기 로직 구현</strong></summary>

- [x] **사전 분석:** `pip-manager.js`의 `togglePipWindow` 함수는 Document PiP API를 직접 호출하여 창을 열고, 이미 열려있을 경우 닫는 역할을 해야 합니다.
- [x] **실행 계획:**
    *   `togglePipWindow` 함수 내에서 `documentPictureInPicture.requestWindow()`를 호출하여 PiP 창을 요청합니다.
    *   창이 열리면 `pipWindow` 변수에 참조를 저장하고, `isPipOpen` 상태를 `true`로 설정합니다.
    *   창이 이미 열려있으면 `pipWindow.close()`를 호출하여 닫습니다.
    *   `fetch`를 사용하여 `src/pip-content.html`의 내용을 읽어와 새로 열린 PiP 창의 `document.body`에 삽입합니다.
- [x] **검증:** PiP 토글 버튼 클릭 시 비어있는 PiP 창이 정상적으로 열리고 닫히는지 확인.
</details>

<details open>
<summary><strong>✅ 1.3. 이벤트 리스너 연결 및 API 지원 확인</strong></summary>

- [x] **사전 분석:** `app.js`에서 PiP 기능을 초기화하고 버튼에 이벤트 리스너를 연결해야 합니다. 또한, API 지원 여부에 따라 버튼의 표시 여부를 결정해야 합니다.
- [x] **실행 계획:**
    *   `src/app.js`의 `initApp` 함수에서 `documentPictureInPicture` API 지원 여부를 확인합니다.
    *   API가 지원되는 경우에만 `#pip-toggle-button`을 화면에 표시합니다.
    *   `initEventHandlers` 또는 `initDashboardScreen`에서 `#pip-toggle-button`에 `click` 이벤트 리스너를 추가하고, `pip-manager.js`의 `togglePipWindow()` 함수를 호출하도록 연결합니다.
- [x] **검증:** Chrome, Edge 등 지원 브라우저에서는 버튼이 보이고, Firefox 등 미지원 브라우저에서는 버튼이 보이지 않는지 확인.
</details>

---

### **2단계: 데이터 및 콘텐츠 동기화**

<details open>
<summary><strong>[ ] 2.1. PiP 콘텐츠 업데이트 로직 구현</strong></summary>

- [ ] **사전 분석:** `ui-renderer.js`의 `updateNextBossDisplay` 함수가 실행될 때, PiP 창이 열려 있다면 그 내용도 함께 갱신되어야 합니다.
- [ ] **실행 계획:**
    *   `src/pip-manager.js`에 `updatePipContent(nextBoss, minTimeDiff)` 함수를 구현합니다. 이 함수는 PiP 창 내부의 DOM 요소를 직접 찾아 `textContent`를 업데이트합니다.
    *   `src/ui-renderer.js`의 `updateNextBossDisplay` 함수 마지막 부분에, `pip-manager.js`를 `import`하고 `isPipOpen()`을 확인하여 PiP 창이 열려있으면 `updatePipContent()`를 호출하는 로직을 추가합니다.
- [ ] **검증:** PiP 창이 열린 상태에서 대시보드의 '다음 보스' 정보가 변경될 때 PiP 창의 내용도 1초마다 함께 변경되는지 확인.
</details>

<details>
<summary><strong>[ ] 2.2. PiP 창 닫힘 이벤트 처리</strong></summary>

- [ ] **사전 분석:** 사용자가 PiP 창의 자체 닫기 버튼(X)을 눌렀을 때, 애플리케이션은 이 상태를 인지하고 내부 상태(`isPipOpen`)를 갱신해야 합니다.
- [ ] **실행 계획:**
    *   `src/pip-manager.js`에서 PiP 창이 열릴 때, `pipWindow` 객체에 `pagehide` 이벤트 리스너를 등록합니다.
    *   `pagehide` 이벤트가 발생하면, `isPipOpen` 상태를 `false`로 변경하고 `pipWindow` 참조를 `null`로 설정합니다.
    *   (선택) 메인 페이지의 PiP 토글 버튼 상태도 비활성화 상태로 변경합니다.
- [ ] **검증:** PiP 창의 닫기 버튼으로 창을 닫은 후, 다시 메인 페이지의 토글 버튼을 눌렀을 때 새 PiP 창이 정상적으로 열리는지 확인.
</details>

---

### **3단계: 통합 테스트**

<details>
<summary><strong>[ ] 3.1. 시나리오 테스트</strong></summary>

- [ ] **검증:**
    1.  대시보드에서 PiP 토글 버튼을 눌러 위젯을 연다.
    2.  '다음 보스' 정보가 위젯과 메인 화면 양쪽에 동일하게 표시되고, 1초마다 동기화되는지 확인한다.
    3.  위젯의 닫기 버튼(X)으로 닫고, 다시 토글 버튼으로 열었을 때 정상 동작하는지 확인한다.
    4.  메인 페이지의 토글 버튼으로 위젯을 닫았을 때 정상 동작하는지 확인한다.
    5.  다른 화면(예: 설정)으로 이동했다가 대시보드로 돌아왔을 때, 열려 있던 PiP 창이 유지되고 계속 동기화되는지 확인한다.
</details>
