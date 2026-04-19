# Google Analytics 이벤트 명명 규칙

이 문서는 '보스 알리미' 웹 애플리케이션에서 Google Analytics (GA4)를 통해 사용자 행동 데이터를 수집하기 위한 이벤트 명명 규칙을 정의합니다. 일관된 명명 규칙을 통해 분석 보고서의 정확성과 유용성을 높이는 것을 목표로 합니다.

## 1. `event_category` (이벤트 카테고리)

이벤트가 속하는 **상위 그룹**을 나타냅니다.

*   **`Navigation`**: 메뉴 탭, 하단 내비게이션 등 화면 이동과 관련된 클릭
*   **`Interaction`**: 화면 내의 버튼 클릭, 폼 제출 등 사용자 인터랙션
*   **`Feature Usage`**: 특정 핵심 기능 사용 (예: PiP 위젯, 알림 토글)

## 2. `event_action` (이벤트 액션)

사용자가 취한 **구체적인 행동**을 나타냅니다.

*   **`Click Menu Tab`**: 상단/사이드 메뉴 탭 클릭
*   **`Click Bottom Nav`**: 모바일 하단 내비게이션 탭 클릭
*   **`Click Button`**: 일반적인 버튼 클릭
*   **`Toggle Switch`**: 스위치 형태의 토글 (예: 알림/음소거)
*   **`Submit Form`**: 폼 제출
*   **`Open Modal`**: 모달 창 열기
*   **`Close Modal`**: 모달 창 닫기
*   **`Copy to Clipboard`**: 클립보드 복사

## 3. `event_label` (이벤트 라벨)

**어떤 요소**에서 행동이 발생했는지에 대한 **구체적인 정보**를 나타냅니다.

*   **메뉴 탭:** 해당 화면의 이름
    *   `대시보드`
    *   `보스 관리`
    *   `보스 스케줄러`
    *   `알림 로그`
    *   `공유`
    *   `릴리즈 노트`
    *   `도움말`
    *   `젠 계산기`
    *   `광 계산기`
    *   `설정`
*   **버튼/토글:** 버튼의 텍스트 또는 기능
    *   `알림 시작/중지`
    *   `음소거 토글`
    *   `PiP 토글`
    *   `보스 설정 저장`
    *   `커스텀 목록 관리`
    *   `남은 시간 초기화`
    *   `보스 시간 업데이트`
    *   `스톱워치 시작`
    *   `광 시간 기록`
    *   `잡힘 시간 기록`
    *   `기록 저장`
    *   `계산기 초기화`
    *   `고정 알림 추가`
    *   `고정 알림 편집`
    *   `고정 알림 삭제`
    *   `기록 초기화`

---

## 4. 이벤트 gtag() 호출 예시 (전체)

| `event_category` | `event_action`     | `event_label`          | `gtag()` 호출 예시                                                                                                                   |
| :--------------- | :----------------- | :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| `Navigation`     | `Click Menu Tab`   | `대시보드`             | `gtag('event', 'Click Menu Tab', { 'event_category': 'Navigation', 'event_label': '대시보드' });`                                    |
| `Navigation`     | `Click Menu Tab`   | `보스 관리`            | `gtag('event', 'Click Menu Tab', { 'event_category': 'Navigation', 'event_label': '보스 관리' });`                                   |
| `Navigation`     | `Click Menu Tab`   | `보스 스케줄러`        | `gtag('event', 'Click Menu Tab', { 'event_category': 'Navigation', 'event_label': '보스 스케줄러' });`                               |
| `Navigation`     | `Click Menu Tab`   | `알림 로그`            | `gtag('event', 'Click Menu Tab', { 'event_category': 'Navigation', 'event_label': '알림 로그' });`                                   |
| `Navigation`     | `Click Menu Tab`   | `공유`                 | `gtag('event', 'Click Menu Tab', { 'event_category': 'Navigation', 'event_label': '공유' });`                                        |
| `Navigation`     | `Click Menu Tab`   | `릴리즈 노트`          | `gtag('event', 'Click Menu Tab', { 'event_category': 'Navigation', 'event_label': '릴리즈 노트' });`                                |
| `Navigation`     | `Click Menu Tab`   | `도움말`               | `gtag('event', 'Click Menu Tab', { 'event_category': 'Navigation', 'event_label': '도움말' });`                                      |
| `Navigation`     | `Click Menu Tab`   | `젠 계산기`            | `gtag('event', 'Click Menu Tab', { 'event_category': 'Navigation', 'event_label': '젠 계산기' });`                                   |
| `Navigation`     | `Click Menu Tab`   | `광 계산기`            | `gtag('event', 'Click Menu Tab', { 'event_category': 'Navigation', 'event_label': '광 계산기' });`                                   |
| `Navigation`     | `Click Menu Tab`   | `설정`                 | `gtag('event', 'Click Menu Tab', { 'event_category': 'Navigation', 'event_label': '설정' });`                                        |
| `Navigation`     | `Click Bottom Nav` | `대시보드 (모바일)`    | `gtag('event', 'Click Bottom Nav', { 'event_category': 'Navigation', 'event_label': '대시보드 (모바일)' });`                         |
| `Navigation`     | `Click Bottom Nav` | `보스 관리 (모바일)`   | `gtag('event', 'Click Bottom Nav', { 'event_category': 'Navigation', 'event_label': '보스 관리 (모바일)' });`                        |
| `Navigation`     | `Click Bottom Nav` | `보스 스케줄러 (모바일)` | `gtag('event', 'Click Bottom Nav', { 'event_category': 'Navigation', 'event_label': '보스 스케줄러 (모바일)' });`                    |
| `Navigation`     | `Click Bottom Nav` | `알림 로그 (모바일)`   | `gtag('event', 'Click Bottom Nav', { 'event_category': 'Navigation', 'event_label': '알림 로그 (모바일)' });`                        |
| `Navigation`     | `Click Bottom Nav` | `공유 (모바일)`        | `gtag('event', 'Click Bottom Nav', { 'event_category': 'Navigation', 'event_label': '공유 (모바일)' });`                             |
| `Navigation`     | `Click Bottom Nav` | `더보기 (모바일)`      | `gtag('event', 'Click Bottom Nav', { 'event_category': 'Navigation', 'event_label': '더보기 (모바일)' });`                           |
| `Feature Usage`  | `Toggle Switch`    | `알림 시작/중지`       | `gtag('event', 'Toggle Switch', { 'event_category': 'Feature Usage', 'event_label': '알림 시작/중지' });`                            |
| `Feature Usage`  | `Toggle Switch`    | `음소거 토글`          | `gtag('event', 'Toggle Switch', { 'event_category': 'Feature Usage', 'event_label': '음소거 토글' });`                               |
| `Feature Usage`  | `Click Button`     | `PiP 토글`             | `gtag('event', 'Click Button', { 'event_category': 'Feature Usage', 'event_label': 'PiP 토글' });`                                   |
| `Interaction`    | `Click Button`     | `보스 설정 저장`       | `gtag('event', 'Click Button', { 'event_category': 'Interaction', 'event_label': '보스 설정 저장' });`                              |
| `Interaction`    | `Click Button`     | `커스텀 목록 관리`     | `gtag('event', 'Click Button', { 'event_category': 'Interaction', 'event_label': '커스텀 목록 관리' });`                           |
| `Interaction`    | `Click Button`     | `남은 시간 초기화`     | `gtag('event', 'Click Button', { 'event_category': 'Interaction', 'event_label': '남은 시간 초기화' });`                           |
| `Interaction`    | `Click Button`     | `보스 시간 업데이트`   | `gtag('event', 'Click Button', { 'event_category': 'Interaction', 'event_label': '보스 시간 업데이트' });`                         |
| `Interaction`    | `Click Button`     | `스톱워치 시작`        | `gtag('event', 'Click Button', { 'event_category': 'Interaction', 'event_label': '스톱워치 시작' });`                              |
| `Interaction`    | `Click Button`     | `광 시간 기록`         | `gtag('event', 'Click Button', { 'event_category': 'Interaction', 'event_label': '광 시간 기록' });`                              |
| `Interaction`    | `Click Button`     | `잡힘 시간 기록`       | `gtag('event', 'Click Button', { 'event_category': 'Interaction', 'event_label': '잡힘 시간 기록' });`                            |
| `Interaction`    | `Click Button`     | `기록 저장`            | `gtag('event', 'Click Button', { 'event_category': 'Interaction', 'event_label': '기록 저장' });`                                    |
| `Interaction`    | `Click Button`     | `계산기 초기화`        | `gtag('event', 'Click Button', { 'event_category': 'Interaction', 'event_label': '계산기 초기화' });`                              |
| `Interaction`    | `Click Button`     | `고정 알림 추가`       | `gtag('event', 'Click Button', { 'event_category': 'Interaction', 'event_label': '고정 알림 추가' });`                              |
| `Interaction`    | `Click Button`     | `고정 알림 편집`       | `gtag('event', 'Click Button', { 'event_category': 'Interaction', 'event_label': '고정 알림 편집' });`                              |
| `Interaction`    | `Click Button`     | `고정 알림 삭제`       | `gtag('event', 'Click Button', { 'event_category': 'Interaction', 'event_label': '고정 알림 삭제' });`                              |
| `Interaction`    | `Click Button`     | `기록 초기화 (광 계산기)` | `gtag('event', 'Click Button', { 'event_category': 'Interaction', 'event_label': '기록 초기화 (광 계산기)' });`                      |
| `Interaction`    | `Copy to Clipboard`| `공유 링크 복사`       | `gtag('event', 'Copy to Clipboard', { 'event_category': 'Interaction', 'event_label': '공유 링크 복사' });`                         |