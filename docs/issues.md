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

### 2.2. Mobile Voice Notification Issues (Web Speech API Limitations)

- **상태:** 인지됨 (해결 방안 모색 중)
- **설명:** 모바일 환경(특히 iOS Safari)에서 보스 알리미의 음성 알림(`window.speechSynthesis`)이 제대로 작동하지 않거나, 사용자 상호작용 없이는 재생되지 않는 문제가 발생합니다. 이는 모바일 브라우저의 오디오 자동 재생 정책 및 Web Speech API 지원의 불일치 때문입니다.
- **영향:** 모바일 사용자가 보스 알림을 음성으로 받지 못하여 애플리케이션의 핵심 기능 중 하나를 온전히 활용하기 어렵습니다.
- **해결 방안:**
    - "알림 시작" 버튼 클릭 시 짧은 무음 오디오를 재생하여 오디오 컨텍스트를 활성화하는 방안을 고려합니다.
    - `window.speechSynthesis.getVoices()`를 통해 사용 가능한 음성을 명시적으로 로드하고 설정하는 방안을 검토합니다.
    - 브라우저별 Web Speech API의 동작 특성을 추가로 조사하여 최적의 구현 방법을 찾습니다.