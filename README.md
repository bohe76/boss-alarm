# Boss Alarm (보스 알리미)

![Boss Alarm Screenshot](https://i.postimg.cc/gcZddxqV/screencapture-127-0-0-1-5500-index-html-2025-12-01-15-48-11.png)

## 🚀 프로젝트 소개 (Project Introduction)

"보스 알리미"는 게임 보스 출현 시간에 대한 알림을 제공하는 클라이언트 측 웹 애플리케이션입니다. 기존 단일 화면 구성에서 메뉴 기반의 다중 화면 레이아웃으로 전환하여 사용자 경험을 개선하고 기능별 분리를 강화했습니다. 사용자는 텍스트 영역에 보스 출현 시간 목록을 입력할 수 있으며, 보스 출현 5분 전, 1분 전, 그리고 정확한 출현 시간에 오디오 및 시각적(로그) 알림을 받습니다. 또한, 현재 보스 목록을 인코딩하여 공유 가능한 짧은 URL(TinyURL API 사용)을 생성하는 기능을 제공하여 사용자가 자신의 설정을 쉽게 공유할 수 있도록 합니다.

This project is a client-side web application designed to provide notifications for game boss appearances. It has transitioned from a single-screen setup to a menu-driven, multi-screen layout to enhance user experience and improve functional separation. Users can input a list of boss spawn times into a text area, and receive audio and visual (log) notifications 5 minutes before, 1 minute before, and at the exact boss appearance time. Additionally, it offers a feature to generate shareable short URLs (using the TinyURL API) by encoding the current boss list, allowing users to easily share their settings.

## ✨ 주요 기능 (Key Features)

*   **메뉴 기반 다중 화면 레이아웃 (Menu-Driven Multi-Screen Layout):**
    *   **대시보드:** 다음 보스 정보 및 알림 상태 요약.
    *   **보스 관리:** 보스 목록 입력 및 프리셋 관리.
    *   **알림 설정:** 고정 알림 추가, 편집, 삭제 및 활성화/비활성화.
    *   **젠 계산기:** 남은 시간을 기준으로 보스 출현 시간 계산.
    *   **보스 스케줄러:** 게임별 보스 목록에서 남은 시간을 설정하여 보스 목록 자동 생성. **(정확한 시간 계산과 안정성 강화)**
    *   **공유:** 현재 보스 목록을 공유 가능한 짧은 URL로 생성.
    *   **알림 로그:** 모든 알림 및 시스템 메시지 기록. "15개 보기" 토글을 통해 최근 15개 또는 전체 로그를 볼 수 있으며, 이 설정은 로컬 스토리지에 유지됩니다.
    *   **도움말:** 애플리케이션 사용법 및 기능 설명.
    *   **릴리즈 노트:** 버전별 업데이트 내역 확인.

*   **시간 기반 알림 (Time-Based Notifications):** 보스 출현 5분 전, 1분 전, 0분 전에 알림이 트리거됩니다. **(자정(00:00:00) 시간 처리 및 전체적인 시간 계산 정확성, 안정성 향상)**
*   **오디오 알림 (Audio Notifications):** 웹 음성 API (`window.speechSynthesis`)를 활용하여 음성 알림을 제공합니다.
*   **로깅 (Logging):** 트리거된 모든 알림 및 시스템 메시지 로그를 UI에 표시합니다.
*   **공유 가능한 URL (Shareable URLs):** 현재 보스 목록을 인코딩하여 다른 사용자를 위해 미리 채워주는 짧은 URL(TinyURL API를 통해)을 생성합니다.
*   **고정 알림 (Fixed Alarms):** 특정 보스에 대한 고정된 알림을 설정하고 개별적으로 ON/OFF 할 수 있으며, 로컬 스토리지에 저장됩니다.
*   **로컬 스토리지 저장 (Local Storage Persistence):** 사용자 설정(고정 알림, 로그 가시성, 사이드바 상태, 활성 화면 등)이 브라우저에 저장되어 재접속 시에도 유지됩니다.
*   **자정 넘김 시간 처리 (Cross-Midnight Time Handling):** 자정을 넘어가는 보스 시간도 정확하게 처리합니다.
*   **스켈레톤 UI (Skeleton UI):** 애플리케이션 초기 로딩 시 사용자에게 시각적인 피드백을 제공하여 로딩 경험을 개선합니다.

## 🛠️ 사용 방법 (How to Use)

1.  **애플리케이션 실행:** `index.html` 파일을 웹 브라우저에서 엽니다. (로컬 웹 서버 사용 권장)
2.  **보스 목록 입력:** "보스 관리" 메뉴에서 텍스트 영역에 `HH:MM 보스이름` 형식으로 보스 출현 시간을 입력합니다.
3.  **보스 스케줄러 활용:** "보스 스케줄러" 메뉴에서 게임을 선택하고 각 보스별 남은 시간을 입력하여 보스 목록을 자동으로 생성할 수 있습니다.
4.  **알림 시작:** "알림 시작" 버튼을 클릭하여 알림 시스템을 활성화합니다.
5.  **고정 알림 설정:** "알림 설정" 메뉴에서 고정 알림을 추가, 편집, 삭제하고 활성화/비활성화할 수 있습니다.
6.  **공유 링크 생성:** "공유" 메뉴에서 현재 보스 목록이 포함된 짧은 URL을 생성하고 공유할 수 있습니다.
7.  **알림 로그 확인:** "알림 로그" 메뉴에서 시스템 메시지 및 트리거된 알림을 모니터링합니다.

## ⚙️ 기술 스택 (Tech Stack)

*   **HTML5**
*   **CSS3** (외부 파일 `src/styles/style.css`로 링크)
*   **정적 자원:** 이미지 파일 등은 `src/assets/images` 경로에 관리됩니다.
*   **데이터 파일:** `data/` 폴더에 설정 및 데이터 파일 (예: `boss_lists.json`, `faq_guide.json`)을 관리합니다.
*   **바닐라 자바스크립트** (모듈화된 파일 `src/` 폴더 내에서 import하여 사용)
*   **Web Speech API** (`window.speechSynthesis`를 통한 음성 알림)
*   **TinyURL API** (URL 단축용)

## 🚦 코드 품질 및 검증 (Code Quality & Verification)

본 프로젝트는 높은 코드 품질을 유지하고 잠재적인 오류를 사전에 방지하기 위해 다음과 같은 도구를 활용합니다.

*   **ESLint:** 코드의 문법 오류, 잠재적인 버그, 스타일 규칙 위반 등을 코드를 실행하기 전에 찾아냅니다. (`npm run lint`로 실행)
*   **Vitest:** 핵심 로직의 정확성을 검증하고, 회귀를 방지하며, 코드의 안정성을 보장하기 위한 유닛 테스트 프레임워크입니다. (`npm test`로 실행)

## 🤝 기여 (Contributing)

버그 보고, 기능 제안 등 모든 기여를 환영합니다. GitHub Issues를 통해 의견을 남겨주세요.

## 📄 라이선스 (License)

이 프로젝트는 MIT 라이선스(MIT License)를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.