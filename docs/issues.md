# 오딘 보스 알리미 프로젝트 이슈 문서

## 1. 개요

본 문서는 "오딘 보스 알리미" 프로젝트 진행 중 발생했거나 인지된 주요 이슈들을 기록합니다.

## 2. 현재 이슈 목록

### 2.1. Git 커밋 메시지 한글 깨짐 현상 (PowerShell 환경)

- **상태:** 인지됨 (해결 방안 제시됨)
- **설명:** Windows PowerShell 환경에서 `git log` 또는 `git commit`과 같은 Git 명령을 실행할 때, 한글로 작성된 커밋 메시지가 깨져서(garbled characters) 표시되는 현상이 발생합니다. 이는 PowerShell의 기본 출력 인코딩 설정이 UTF-8이 아니거나, Git의 출력을 PowerShell이 올바르게 해석하지 못하기 때문에 발생합니다.
- **영향:** 커밋 히스토리 확인 시 가독성이 저하되며, 한글 메시지의 의미를 파악하기 어렵습니다.
- **해결 방안:**
    - PowerShell 프로필 파일(예: `C:\Users\<YourUser>\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`)에 다음 줄을 추가하여 `$OutputEncoding`을 UTF-8로 설정합니다.
    ```powershell
    $OutputEncoding = [System.Text.Encoding]::UTF8
    ```
    - 변경 후 PowerShell을 다시 시작해야 합니다.
- **관련 커밋:** `1934f137ab9c0821d5c19cf09ae00f086b87616b`
