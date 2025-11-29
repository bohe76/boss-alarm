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

#### 3. 에이전트 작업 원칙

*   **자동 검증:** **코드를 수정하거나 추가하는 모든 작업 후에는 사용자님의 별도 승인 없이도 `npm run lint` 및 `npm test` 명령을 반드시 실행하여 코드 변경 사항을 검증합니다.**
*   **오류 수정:** Lint 또는 테스트 검사에서 오류가 발견될 경우, 즉시 해당 오류를 수정하는 작업을 진행합니다. 이를 통해 코드 변경으로 인한 사이드 이펙트와 런타임 오류를 최소화합니다.

### 디버깅 및 검증 도구

#### 1. 로컬 서버 백그라운드 실행 (PowerShell)
Python의 `http.server` 모듈을 사용하여 로컬 정적 파일 서버를 백그라운드에서 실행할 수 있습니다. 이는 `run_shell_command` 도구를 통해 실행됩니다.

```powershell
Start-Process python -ArgumentList "-m", "http.server", "8080" -NoNewWindow
```
*   포트 번호(예: 8080)는 필요에 따라 변경 가능합니다.
*   서버 실행 후 `chrome-devtools-mcp` 도구로 접속하여 테스트할 수 있습니다.

#### 2. Chrome DevTools MCP 사용법
브라우저를 직접 제어하고 콘솔 로그를 확인하거나 DOM을 조작하여 실시간 디버깅을 수행할 수 있습니다.

*   `navigate_page`: 특정 URL로 브라우저를 이동시킵니다. (예: `http://localhost:8080`)
*   `take_snapshot`: 현재 페이지의 DOM 구조와 요소별 UID를 스냅샷으로 캡처합니다. 요소를 찾을 때 필수입니다.
*   `click`: UID를 사용하여 요소를 클릭합니다.
*   `fill`: UID를 사용하여 입력 필드에 값을 채웁니다.
*   `evaluate_script`: 페이지 내에서 JavaScript 코드를 실행합니다.
*   `list_console_messages`: 브라우저 콘솔에 출력된 로그를 가져옵니다. 디버깅 로그(`console.log`) 확인 시 유용합니다.

---

### 에이전트 업무 준비

*   사용자님이 "업무준비"라고 지시하면, 다음 문서들을 학습합니다.
    *   `docs/system_architecture.md`
    *   `docs/system_module_details.md`
    *   `docs/system_module_dependencies.md`
    *   `docs/system_data_flow.md`
*   학습을 마친 후에는 "업무 준비를 마쳤습니다."라고 사용자님께 알립니다.


### 버전 관리
- 모든 커밋은 버전 관리를 포함할 수 있다.
- 버전은 사용자가 명시적으로 지정하며, `vX.X.X` 형식을 따른다.
- 버전이 업데이트되면 아래 3가지 작업을 반드시 수행한다.
  1. `index.html`의 CSS 링크 버전을 수정한다. (`href="src/style.css?v=X.X.X"`)
  2. `index.html`의 스크립트 내 `window.APP_VERSION` 변수를 수정한다.
  3. `docs/version_history.json` 파일에 해당 버전의 변경 내역을 추가한다.

### 릴리즈 노트 작성 원칙

- 릴리즈 노트는 `docs/version_history.json` 파일에 작성한다.
- 릴리즈 노트는 사용자 관점에서 작성하며, 추가된 기능과 기능 설명에 집중한다.
- 기술적인 구현 세부 사항이나 내부적인 변경 사항은 포함하지 않는다.
- 각 항목은 명확하고 간결하게 작성한다.
- 다음 형식을 따른다:
  ```
  vX.X.X (YYYY-MM-DD)
  * [유형]: [기능 또는 수정 사항에 대한 사용자 친화적인 설명]
    - [세부 설명 1]
    - [세부 설명 2]
  ```
  - `[유형]`은 `feat` (기능 추가), `fix` (버그 수정), `perf` (성능 개선), `chore` (기타 변경) 등을 사용한다.

#### 릴리즈 노트 내용 컨펌 절차 (2단계)
1.  **제시 (Proposal):** `docs/version_history.json` 파일에 추가될 릴리즈 노트 내용 (JSON 형식의 새 항목)을 먼저 제시하고 대기한다. (도구 호출 코드 블록 없이)
2.  **승인 후 실행 (Execution after Approval):** 사용자님의 해당 내용에 대한 승인을 받으면, 해당 내용을 적용할 도구 호출(tool call) 코드 블록을 제시하고, 사용자님의 명시적인 컨펌이 있을 때까지 어떠한 추가 출력도 생성하지 않고 완전히 대기한다.
3.  **실행 (Execution):** 사용자님의 도구 호출에 대한 명시적인 컨펌이 있으면 작업을 실행한다.

