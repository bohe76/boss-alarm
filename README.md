# Odin Boss Alarm (오딘 보스 알리미)

![Odin Boss Alarm Screenshot](https://i.postimg.cc/9f4Tx78r/odin-boss-alarm.png)

## 🚀 프로젝트 소개 (Project Introduction)

이 프로젝트는 오딘(Odin) 게임 플레이어들을 위한 웹 기반 보스 알리미입니다. 사용자가 직접 보스 젠 시간을 입력하고, 설정된 시간(5분 전, 1분 전, 정각)에 음성 알림을 받을 수 있도록 돕습니다. 또한, 고정된 보스 알림 기능과 알림 로그 가시성 제어 기능을 제공합니다.

This project is a web-based boss alarm for Odin game players. It helps users receive voice notifications at set times (5 minutes before, 1 minute before, on time) by entering boss spawn times. It also provides fixed boss notification features and alarm log visibility control.

## ✨ 주요 기능 (Key Features)

*   **음성 알림 (Voice Notifications):** 설정된 보스 젠 시간에 맞춰 음성으로 알림을 제공합니다.
*   **커스터마이징 가능한 보스 목록 (Customizable Boss List):** 텍스트 영역에 보스 젠 시간을 직접 입력하여 자신만의 알림 목록을 만들 수 있습니다.
*   **자동 보스 제거 (Automatic Boss Removal):** 젠 시간이 지난 보스는 목록에서 자동으로 제거됩니다.
*   **다음 보스 표시 (Next Boss Display):** 가장 가까운 다음 보스 정보를 실시간으로 표시합니다.
*   **공유 링크 생성 (Shareable Links):** 현재 설정된 보스 목록을 URL로 인코딩하여 다른 사람들과 쉽게 공유할 수 있습니다.
*   **고정 알림 (Fixed Alarms):** 특정 보스에 대한 고정된 알림을 설정하고 개별적으로 ON/OFF 할 수 있습니다.
*   **알림 로그 가시성 제어 (Alarm Log Visibility Control):** 알림 로그의 표시 여부를 스위치로 제어할 수 있습니다.
*   **로컬 스토리지 저장 (Local Storage Persistence):** 고정 알림 및 알림 로그 스위치 상태가 브라우저에 저장되어 재접속 시에도 유지됩니다.
*   **자정 넘김 시간 처리 (Cross-Midnight Time Handling):** 자정을 넘어가는 보스 시간도 정확하게 처리합니다.

## 🛠️ 사용 방법 (How to Use)

1.  **접속 (Access):** [여기](https://bohe76.github.io/boss-alarm/)를 클릭하여 알리미 페이지에 접속합니다. (또는 로컬 `index.html` 파일을 브라우저로 엽니다.)
2.  **보스 목록 입력 (Enter Boss List):** "필드 보스" 아래 텍스트 영역에 `HH:MM 보스이름` 형식으로 보스 젠 시간을 입력합니다. (예: `12:00 셀로비아`)
3.  **알림 시작 (Start Alarm):** "알림 시작" 버튼을 클릭하여 알림을 활성화합니다.
4.  **고정 알림 설정 (Configure Fixed Alarms):** "고정 알림" 섹션에서 전체 고정 알림을 켜거나 끄고, 각 고정 보스별로 알림을 설정할 수 있습니다.
5.  **공유 (Share):** "공유 링크 생성" 버튼을 클릭하여 현재 보스 목록이 포함된 단축 URL을 생성하고 공유할 수 있습니다.

## ⚙️ 개발 환경 (Development Environment)

*   **HTML5**
*   **CSS3**
*   **JavaScript (ES6+)**
*   **Web Speech API (TTS)**
*   **TinyURL API (for URL shortening)**

## 🤝 기여 (Contributing)

버그 보고, 기능 제안 등 모든 기여를 환영합니다. GitHub Issues를 통해 의견을 남겨주세요.

## 📄 라이선스 (License)

이 프로젝트는 MIT 라이선스(MIT License)를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
