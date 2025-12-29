### 코드 품질 및 검증

프로젝트의 코드 품질을 높이고 JavaScript 오류를 사전에 방지하기 위해 정적 코드 분석 도구인 **ESLint**가 도입되었습니다.

#### 1. ESLint

*   **역할:** 코드의 문법 오류, 잠재적인 버그, 스타일 규칙 위반 등을 코드를 실행하기 전에 찾아냅니다.
*   **사용법:** 다음 명령어를 사용하여 프로젝트 전체의 코드를 검사할 수 있습니다.
    ```shell
    npm run lint
    ```
    **참고:** 만약 PowerShell 실행 정책(Execution Policy) 문제로 위 명령어가 실패하는 경우, 다음 명령어를 대신 사용할 수 있습니다.
    ```shell
    node ./node_modules/eslint/bin/eslint.js .
    ```

#### 2. Vitest

*   **역할:** 유닛 테스트 프레임워크로, 핵심 로직의 정확성을 검증하고, 회귀를 방지하며, 코드의 안정성을 보장합니다.
*   **사용법:** `package.json`에 정의된 `test` 스크립트를 통해 다음 명령어로 모든 테스트를 실행할 수 있습니다.
    ```shell
    npm test
    ```
    **참고:** 만약 PowerShell 실행 정책(Execution Policy) 문제로 위 명령어가 실패하는 경우, 다음 명령어를 대신 사용할 수 있습니다.
    ```shell
    node ./node_modules/vitest/vitest.mjs run
    ```
*   **실행 정책:** 테스트는 .js와 같이 관련 코드가 변경될 때만 실행하고, **.md, .html, .css** 같은 정적 파일 변경 시에는 **생략**합니다. (Run tests only when relevant code like .js files are changed. Skip tests for static file changes like .md, .html, .css.)

#### 3. 에이전트 작업 원칙

*   **자동 검증:** **코드를 수정하거나 추가하는 모든 작업 후에는 사용자님의 별도 승인 없이도 `npm run lint` 및 `npm test` 명령을 반드시 실행하여 코드 변경 사항을 검증합니다.**
*   **오류 수정:** Lint 또는 테스트 검사에서 오류가 발견될 경우, 즉시 해당 오류를 수정하는 작업을 진행합니다. 이를 통해 코드 변경으로 인한 사이드 이펙트와 런타임 오류를 최소화합니다.

---

### **이슈 관리 프로세스**

모든 기능 개발 및 버그 수정은 `docs/issues/`에 이슈 문서를 생성하는 것으로 시작합니다.

#### **1. 신규 이슈 등록**

새로운 이슈를 등록할 때는 다음 규칙을 따릅니다.

*   **파일 위치:** `docs/issues/`
*   **파일명 형식:** `issue-XXX-short-description.md` (예: `issue-013-calculator-reset-bug.md`)
    *   `XXX`는 0으로 채워진 3자리 숫자입니다.
*   **문서 형식 (템플릿):**

    ```markdown
    ---
    id: issue-XXX
    title: "이슈에 대한 명확한 제목"
    status: "미해결" # 미해결 | 진행 중 | 해결됨
    priority: "Medium" # High | Medium | Low
    assignee: ""
    labels:
      - 
      - 
    created_date: "YYYY-MM-DD"
    resolved_date: ""
    ---

    # Issue-XXX: [이슈에 대한 명확한 제목]

    ## 1. 개요 (Overview)
    * 이슈에 대한 간략한 설명

    ## 2. 문제점 또는 요구사항 (Problem or Requirement)
    * 현재 코드의 문제점 또는 새로운 기능에 대한 요구사항을 상세히 기술

    ## 3. 제안된 해결 방안 (Proposed Solution)
    * 문제를 해결하거나 요구사항을 만족시키기 위한 기술적인 접근 방식 제안
    ```

#### **2. 이슈 해결 프로세스**

하나의 이슈에 대한 작업이 완료되면 다음 절차를 따릅니다.

1.  **해결 내용 업데이트:**
    *   해당 이슈 문서(`issue-XXX-....md`)의 프론트매터(Front Matter)를 수정합니다.
        *   `status`: `"해결됨"`
        *   `resolved_date`: `"YYYY-MM-DD"` (해결 완료일)
    *   문서 최하단에 `## 4. 해결 과정 및 최종 결과` 섹션을 추가하여, 어떤 브랜치에서 어떤 단계로 작업이 진행되었고 어떻게 검증했는지 구체적인 과정을 기록합니다.
2.  **문서 이동:**
    *   내용 업데이트가 완료된 이슈 문서를 `docs/issues/` 폴더에서 `docs/issues/resolved/` 폴더로 이동시킵니다.
3.  **커밋:**
    *   위의 내용 변경과 파일 이동을 하나의 커밋으로 묶습니다.
    *   커밋 메시지는 `docs(issues): issue-XXX 해결 및 resolved 폴더로 이동` 형식을 사용합니다.

---

### 에이전트 업무 준비

*   사용자님이 "업무준비"라고 지시하면, 다음 5개의 핵심 문서를 학습합니다.
    *   `docs/system_architecture.md`
    *   `docs/system_module_details.md`
    *   `docs/system_module_dependencies.md`
    *   `docs/system_data_flow.md`
    *   `docs/functional-specs/index.md`
*   학습을 마친 후에는 "업무 준비를 마쳤습니다."라고 사용자님께 알립니다.


### 버전 관리
- 모든 커밋은 버전 관리를 포함할 수 있다.
- 버전은 사용자가 명시적으로 지정하며, `vX.X.X` 형식을 따른다.
- 버전이 업데이트되면 아래 3가지 작업을 반드시 수행한다.
  1. `index.html`의 CSS 링크 버전을 수정한다. (`href="src/style.css?v=X.X.X"`)
  2. `index.html`의 스크립트 내 `window.APP_VERSION` 변수를 수정한다.
  3. `data/version_history.json` 파일에 해당 버전의 변경 내역을 추가한다.

### 릴리즈 노트 작성 원칙

- **소스 활용:** 릴리즈 노트는 `docs/unreleased_changes.md` 파일에 기록된 `Unreleased` 항목들을 기반으로 작성한다.
- **작성 위치:** `data/version_history.json` 파일에 해당 버전의 새 항목을 추가한다.
- **작성 형식:**
  ```
  vX.X.X (YYYY-MM-DD)
  * [유형]: [기능 또는 수정 사항에 대한 사용자 친화적인 설명]
    - [세부 설명 1]
    - [세부 설명 2]
  ```
  - `[유형]`은 `feat` (기능 추가), `fix` (버그 수정), `perf` (성능 개선), `chore` (기타 변경) 등을 사용한다.
- **릴리즈 목록 초기화:** `data/version_history.json` 업데이트가 완료되면, `docs/unreleased_changes.md` 파일의 `[Unreleased]` 섹션 아래 내용을 비워 초기화한다.
- **내용 원칙:**
  - 사용자 관점에서 작성하며, 추가된 기능과 기능 설명에 집중한다.
  - 기술적인 구현 세부 사항이나 내부적인 변경 사항은 포함하지 않는다.
  - 각 항목은 명확하고 간결하게 작성한다.

#### 릴리즈 노트 내용 컨펌 절차 (2단계)
1.  **제시 (Proposal):** `data/version_history.json` 파일에 추가될 릴리즈 노트 내용 (JSON 형식의 새 항목)을 먼저 제시하고 대기한다. (도구 호출 코드 블록 없이)
2.  **승인 후 실행 (Execution after Approval):** 사용자님의 해당 내용에 대한 승인을 받으면, 해당 내용을 적용할 도구 호출(tool call) 코드 블록을 제시하고, 사용자님의 명시적인 컨펌이 있을 때까지 어떠한 추가 출력도 생성하지 않고 완전히 대기한다.
3.  **실행 (Execution):** 사용자님의 도구 호출에 대한 명시적인 컨펌이 있으면 작업을 실행한다.

---

### 핵심 코드 수정 정책 (Critical Code Modification Policy)

#### 1. 절대 원칙

##### 1.1. 핵심 로직 수정 금지
다음 파일들의 **핵심 로직**은 사용자님의 **명시적 승인 없이 절대 수정하지 않는다:**

| 파일 | 핵심 영역 |
|------|----------|
| `src/data-managers.js` | `BossDataManager`, `LocalStorageManager` 전체 |
| `src/boss-parser.js` | `parseBossList`, 날짜/시간 파싱 로직 |
| `src/app.js` | `processBossItems`, `loadInitialData` |
| `src/screens/boss-scheduler.js` | `syncInputToText`, `syncTextToInput`, `handleApplyBossSettings` |
| `src/ui-renderer.js` | `renderBossInputs`, `updateBossListTextarea` |

##### 1.2. 수정 전 필수 절차
1. **변경 의도 설명:** 무엇을, 왜 바꾸려는지 사용자님께 먼저 설명
2. **영향 범위 분석:** 해당 변경이 다른 기능에 미치는 영향 분석 제시
3. **사용자 승인:** 사용자님의 명시적 `진행` 승인 후에만 코드 수정

##### 1.3. 금지 행위
- 린트 오류 수정을 구실로 핵심 로직 변경
- "최적화"를 이유로 기존 동작 방식 변경
- 사용자 요청 없이 리팩토링 진행
- 기존 함수의 역할/책임 변경

#### 2. SSOT 원칙 (절대 불변)

##### 2.1. 데이터 흐름
```
[JSON 파일] → processBossItems → [Main SSOT] → [Draft] → [UI]
[사용자 입력] → [Draft] → commitDraft → [Main SSOT]
```

##### 2.2. 핵심 규칙
- **출력은 항상 SSOT(또는 Draft)를 바탕으로**: 화면 로딩 시 분 단위 남은 시간에서 역계산하지 말고, `scheduledDate`를 직접 읽어 출력하여 1ms의 오차도 허용하지 않음.
- **입력은 SSOT 형식에 맞게 변환하여 업데이트**: 사용자가 입력을 마치는 시점에만 새로운 `scheduledDate`를 계산하여 반영.
- **시간 역전 감지**: 이전 보스보다 시간이 이르면 다음 날로 처리.
- **이름 기반 매칭**: 간편 모드에서는 이름을 키로 매칭하며, 중복 시 현재 시각에 가장 가까운 항목 선택.
- **음수 시간 지원**: `-HH:MM` 형식의 과거 시간을 허용하고 정확한 과거 시점 계산.

#### 3. 위반 시
- 해당 변경 즉시 롤백
- 원인 분석 및 이슈 등록
- 재발 방지 대책 수립
