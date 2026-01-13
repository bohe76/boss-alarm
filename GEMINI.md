# Boss Alarm Agent Guide (GEMINI)

이 문서는 에이전트가 프로젝트를 이해하고 관리하기 위한 핵심 지침서입니다.

### **핵심 문서 리스트** (에이전트 필수 학습 대상)

작업 시작 전, 다음 문서들을 최신 상태로 로드하고 학습하여 프로젝트의 컨텍스트를 유지해야 합니다.

1.  **[GEMINI.md](file:///d:/BuyMeaCoffee/boss-alarm/GEMINI.md)**: 에이전트 가이드 및 프로젝트 통합 관리
2.  **[system_module_details.md](file:///d:/BuyMeaCoffee/boss-alarm/docs/system_module_details.md)**: 모듈별 상세 구현 명세
3.  **[system_module_dependencies.md](file:///d:/BuyMeaCoffee/boss-alarm/docs/system_module_dependencies.md)**: 모듈 간 의존성 관계도
4.  **[system_data_flow.md](file:///d:/BuyMeaCoffee/boss-alarm/docs/system_data_flow.md)**: 데이터 흐름 및 업데이트 엔진 메커니즘
5.  **[system_architecture.md](file:///d:/BuyMeaCoffee/boss-alarm/docs/system_architecture.md)**: 전체 시스템 아키텍처 및 자가 치유 전략
6.  **[session_handoff.md](file:///d:/BuyMeaCoffee/boss-alarm/docs/session_handoff.md)**: 세션 간 인수인계 및 작업 이력
7.  **[design_system_guide.md](file:///d:/BuyMeaCoffee/boss-alarm/docs/design_system_guide.md)**: UI/UX 디자인 시스템 및 컴포넌트 규격
8.  **[critical_code_policy.md](file:///d:/BuyMeaCoffee/boss-alarm/docs/critical_code_policy.md)**: 핵심 로직 수정 정책 (수정 금지 영역 포함)
9.  **[functional-specs/](file:///d:/BuyMeaCoffee/boss-alarm/docs/functional-specs/) 내 모든 문서**: 각 기능별 상세 요구사항 및 동작 명세

---

### 코드 품질 및 검증 (관연 워크플로우: `/검증`, `/린트`)

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

### **이슈 관리 프로세스** (관련 워크플로우: `/오토파일럿`)

모든 기능 개발 및 버그 수정은 `docs/issues/`에 이슈 문서를 생성하는 것으로 시작합니다. `/오토파일럿` 명령어를 사용하면 아래 프로세스를 자율적으로 수행합니다.

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

#### **3. 이슈 관리 및 오토파일럿 안전 가이드라인 (Safety Measures)**

1. **수동 시작 원칙 (On-Demand Only)**: 에이전트는 세션 시작 시 자율적으로 이슈를 스캔하거나 분석하지 않는다. 오직 사용자님의 명시적 지시(예: `/오토파일럿 issue-XXX` 또는 "이슈 해결해줘")가 있을 때만 이슈 관련 도구 및 문서를 확인한다.
2. **선 보고 후 실행 (Plan First)**: `/오토파일럿` 실행 시 이슈 문서를 분석한 직후 곧바로 코드를 수정하지 않는다. **[문제 분석 -> 해결 계획 -> 예상 영향 범위]**를 먼저 요약 보고하고, 사용자님의 `진행` 또는 `y` 승인이 있을 때까지 완전히 대기한다.
3. **컨텍스트 확인 및 질문 의무**: 계획 보고 시 "이슈와 관련하여 제가 더 알아야 할 설계 의도나 주의사항이 있을까요?"라고 반드시 질문하여 사용자님의 추가 설명을 끌어낸 후 이를 구현 계획에 반영한다.
4. **핵심 로직 보호**: 오토파일럿 중이라도 `Critical Code Modification Policy`에 정의된 파일 수정 시에는 반드시 개별적인 명시적 승인을 다시 한번 확인한다.

### **문서 업데이트 및 동기화** (관련 워크플로우: `/문서업데이트`)

코드의 물리적 변화와 문서의 논리적 설명을 100% 동기화하여 기술적 무결성을 유지합니다.
- **자동 검증:** 코드 변경 사항이 발생할 때마다 `/문서업데이트` 명령을 통해 6개 핵심 문서와의 정밀 동기화를 수행합니다.
- **동기화 원칙:**
  - 문서 내의 용어를 실제 코드의 변수/함수명과 100% 일치시킵니다.
  - 추상적인 기능 설명을 현재 코드의 실제 제어 흐름을 반영한 기술적 명세로 교체합니다.
  - 코드만으로는 파악하기 어려운 설계 결정 이유(Rationale)를 명문화합니다.

---

### 에이전트 업무 준비 (관련 워크플로우: `/업무준비`)

사용자님이 `/업무준비`라고 지시하면, 다음 작업을 수행하여 세션의 연속성을 보장합니다.
- **핵심 문서 학습:** 프로젝트의 아키텍처, 기능 명세, 데이터 흐름, 핵심 로직 수정 정책을 담은 6개 핵심 문서를 최신 상태로 로드합니다.
- **문맥 복구:** `docs/session_handoff.md`를 학습하여 지난 세션의 성과와 남은 과제(Next Steps)를 즉시 파악하고 흐름을 이어갑니다.
- **보고:** 학습을 마친 후에는 "업무 준비를 마쳤습니다."라고 사용자님께 알리고 작업을 대기합니다.


### 버전 관리 (관련 워크플로우: `/배포준비`)
- 모든 커밋은 버전 관리를 포함할 수 있다. `/배포준비` 명령어를 통해 일관성 있는 버전 작업을 수행한다.
- 버전은 사용자가 명시적으로 지정하며, `vX.X.X` 형식을 따른다.
- **버전 데이터 표준화 원칙**: 
  - `window.APP_VERSION` 값은 **숫자로만 관리**한다 (예: `"2.16.2"`).
  - 'v'와 같은 접두사나 추가 텍스트가 필요한 경우, 이를 변수값에 포함하지 않고 출력 시점(UI Renderer 등)에서 **별도로 처리**한다.
- 버전이 업데이트되면 아래 4가지 작업을 반드시 수행한다. (SSOT 유지)
  1. `index.html`의 CSS 링크 버전을 수정한다. (`href="src/style.css?v=X.X.X"`)
  2. `index.html`의 스크립트 내 `window.APP_VERSION` 변수를 수정한다. (숫자만 입력)
  3. `data/version_history.json` 파일에 해당 버전의 변경 내역을 추가한다.
  4. **`src/data/update-notice.json` 파일을 사용하여 앱 시작 시 노출될 업데이트 안내 모달의 내용을 갱신한다.** (가변적 요약 및 인사말 반영)
     - `developerMessage`: 개발자 인사말을 작성하며, 줄바꿈은 `\n`을 사용하여 조정한다.
     - `summaryItems`: 이번 업데이트의 **모든 핵심 변경 사항**을 리스트로 누락 없이 작성한다.
     - **작성 형식**: `<strong>소제목:</strong> 상세 설명` 구조를 사용하여 화면에서 소제목이 굵게 강조되도록 한다. (마크다운 기호 대신 HTML 태그 사용)

#### 업데이트 안내 모달 컨펌 절차 (신규)
1. **인사말 컨펌**: 사용자님께 **"이번 버전의 개발자 인사말을 무엇으로 할까요?"**라고 질문하여 답변을 완료받는다.
2. **공지 내용 생성**: 답변받은 인사말과 `data/version_history.json`의 릴리즈 노트를 요약하여 `src/data/update-notice.json` 파일에 반영한다. (버전 번호는 적지 않고 내용만 관리한다.)
3. **최종 확인**: 작성된 JSON 내용을 사용자에게 제시하고 승인을 받은 후 커밋한다.

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
- **과거 데이터 자동 정제 (Data Diet)**: `_expandAndReconstruct` 로직은 서비스 성능 및 메모리 효율을 위해 오늘 00:00 이전의 보스 인스턴스를 자동으로 제거한다. 단, 사용자가 직접 입력한 '가장 가까운 미래의 앵커'는 유실 방지를 위해 기간 외라도 항상 보호한다.
- **시간 역전 감지**: 이전 보스보다 시간이 이르면 다음 날로 처리.
- **이름 기반 매칭 및 정합성 (v2.17.2)**: 간편 모드에서는 이름을 키로 매칭하며, 프리셋 정합성 검사 시 보스 인스턴스의 개수가 아닌 **보스 종류(Type)**를 기준으로 일치 여부를 판단하여 유령 보스 유입을 원천 차단한다. 이를 통해 일부 보스 시간만 입력된 경우에도 프리셋 모드가 유지되도록 개선했다. 중복 시 현재 시각에 가장 가까운 항목 선택.
- **음수 시간 지원**: `-HH:MM` 형식의 과거 시간을 허용하고 정확한 과거 시점 계산.

---

### **배포 안정성 및 보안 지침 (Deployment Stability & Security)**

#### 1. 배포 환경 안정화 (.nojekyll)
* **목적:** GitHub Pages의 기본 Jekyll 빌드 엔진으로 인한 배포 지연 및 오류(특히 ASCII 외 파일명 충돌) 방지.
* **필수 조치:** 프로젝트 루트의 `.nojekyll` 파일은 절대 삭제하거나 변경하지 않는다. 이 파일은 GitHub Pages가 정적 파일을 직접 배포하게 만드는 핵심 스위치이다.

#### 2. 보안 파일 관리 (.env)
* **절대 금지:** API 키, DB 접속 정보 등 기밀이 포함된 `.env` 파일은 절대 Git 저장소에 포함시키지 않는다.
* **형상 관리:** `.gitignore`에 `.env`가 등록되어 있는지 항상 확인하며, 실수로 추적된 경우 즉시 `git rm --cached` 명령으로 제거한다.

#### 3. 위반 시 조치
- 배포 타임아웃 발생 시 가장 먼저 `.nojekyll` 파일 존재 여부를 확인한다.
- 보안 키 노출 감지 시 즉시 키를 무효화(Revoke)하고 재생성할 것을 권고한다.
