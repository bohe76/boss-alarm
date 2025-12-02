---
id: issue-002
title: "Git 커밋 메시지 한글 깨짐 현상 (PowerShell 환경)"
status: "해결됨"
priority: "High"
assignee: "Gemini"
labels:
  - bug
  - encoding
  - powershell
  - workflow
created_date: "2025-11-23"
resolved_date: "2025-11-23"
---
# Issue-002: Git 커밋 메시지 한글 깨짐 현상 (PowerShell 환경)

- **상태:** 해결됨
- **설명:** Windows PowerShell 환경에서 `git log` 또는 `git commit`과 같은 Git 명령을 실행할 때, 한글로 작성된 커밋 메시지가 깨져서(garbled characters) 표시되는 현상이 발생합니다. 이는 PowerShell의 기본 출력 인코딩 설정이 UTF-8이 아니거나, Git의 출력을 PowerShell이 올바르게 해석하지 못하기 때문에 발생합니다.
- **영향:** 커밋 히스토리 확인 시 가독성이 저하되며, 한글 메시지의 의미를 파악하기 어렵습니다.
- **해결 방안:**
    - PowerShell 프로필 파일(예: `C:\Users\<YourUser>\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`)에 다음 줄을 추가하여 `$OutputEncoding`을 UTF-8로 설정합니다.
    ```powershell
    $OutputEncoding = [System.Text.Encoding]::UTF8
    ```
    - **추가 해결 정보:** `UTF-8`이 `uff-8` (소문자)로 잘못 설정되어 발생하는 문제였으며, 이를 대문자 `UTF-8`로 변경하여 해결되었습니다.
    - 변경 후 PowerShell을 다시 시작해야 합니다.
- **관련 커밋:** `1934f137ab9c0821d5c19cf09ae00f086b87616b`
