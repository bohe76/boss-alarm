### **화면 구성 리뉴얼 체크리스트 (업데이트)**

**목표:** 메뉴 기반 다중 화면 레이아웃으로 전환하여 사용자 경험 개선 및 기능별 분리 구현

---

#### **1. 전체 레이아웃 구성 (HTML/CSS)**

*   [x] 기본 HTML 구조 정의 (`index.html`):
    *   [x] `<header>` 요소 추가
    *   [x] `<nav>` (내비게이션 메뉴) 요소 추가
    *   [x] `<main>` (메인 콘텐츠 영역) 요소 추가
    *   [x] `<footer>` 요소 추가
*   [x] 기본 CSS 스타일 (`src/style.css`):
    *   [x] `body` 및 `html` 기본 스타일 설정 (margin, padding, font 등)
    *   [x] Flexbox 또는 Grid를 활용한 전체 레이아웃 구조 정의
    *   [x] 반응형 디자인을 위한 미디어 쿼리 기본 설정

#### **2. 헤더 (Header) 구현**

*   [x] 앱 제목 (`<h1>` 또는 `<div>`) 추가: "오딘 보스 알리미"
*   [x] 알람 on/off 토글 UI 구현 (SVG 아이콘 버튼 및 색상 구분):
    *   [x] SVG 아이콘 버튼 추가 (`<button>` 내 `<svg>`)
    *   [x] 알람 상태에 따른 SVG 아이콘 색상 변경 (CSS 클래스 활용)
    *   [x] `src/event-handlers.js`에 토글 이벤트 리스너 추가 및 `alarm-scheduler.js`의 `startAlarm`/`stopAlarm` 함수와 연동
    *   [x] `src/data-managers.js`에 알람 상태 저장/로드 로직 추가 (LocalStorageManager 활용)

#### **3. 내비게이션 메뉴 (Navigation Menu) 구현**

*   [x] 사이드바 HTML 구조 (`<aside>` 또는 `<div>`) 정의
*   [x] 사이드바 접기/펼치기 기능 구현:
    *   [x] 전용 토글 버튼 (예: 햄버거 아이콘) UI 추가
    *   [x] 버튼 클릭 시 사이드바 너비 및 콘텐츠 가시성 토글 (CSS `width`, `display`, `visibility` 속성 활용)
    *   [x] `src/event-handlers.js`에 토글 이벤트 리스너 추가
    *   [x] 사이드바 상태 (접힘/펼쳐짐) 로컬 스토리지 저장/로드 기능 추가
*   [x] 메뉴 항목 목록 (`<ul>`, `<li>`, `<a>`) 구현:
    *   [x] 각 메뉴 항목에 아이콘 (Heroicons) 및 텍스트 라벨 추가
    *   [x] 메뉴 항목: 대시보드, 보스 관리, 알림 설정, 알림 로그, 릴리즈 노트, 공유, 도움말
    *   [x] 사이드바 접힘 상태에서 아이콘만 표시 및 마우스 오버 시 툴팁으로 메뉴 이름 표시 기능 구현
*   [x] 메뉴 항목 클릭 시 메인 콘텐츠 영역 변경 로직 구현:
    *   [x] `src/event-handlers.js`에 메뉴 항목 클릭 이벤트 리스너 추가
    *   [x] 선택된 메뉴에 따라 `main-content-area` 내의 콘텐츠 동적으로 로드/표시 (SPA 라우팅 방식 고려)
    *   [x] 현재 활성화된 메뉴 항목 시각적 강조 (CSS `active` 클래스 등)

#### **4. 메인 콘텐츠 영역 (Main Content Area) 구현**

*   [x] 각 화면별 HTML 구조 및 CSS 스타일 정의 (`src/style.css` 또는 별도 파일 - *`index.html`에 구조 정의, `src/style.css`에 기본 스타일링 적용 완료*)
*   [x] **4.1. 대시보드 (Dashboard) 화면:**
    *   [x] 실시간 보스 카운트다운 (`HH:MM:SS` 형식) 표시 UI
        *   [x] `src/ui-renderer.js`에 카운트다운 업데이트 함수 추가
        *   [x] `src/alarm-scheduler.js`에서 `BossDataManager`의 `_nextBoss` 정보 활용
    *   [x] 다가오는 보스 목록 (다음 2~3개) 표시 UI
    *   [x] 알림 상태 요약 (실행 중 여부, 다음 알림 예정 시간) 표시 UI
    *   [x] 최근 알림 로그 (2~3개) 표시 UI (`src/logger.js`와 연동)
*   [x] **4.2. 보스 관리 (Boss Management) 화면:**
    *   [x] 보스 목록 입력 텍스트 영역 (`<textarea>`) 유지
    *   [x] 프리셋 기능 구현:
        *   [x] "프리셋 선택" 드롭다운 (`<select>`) UI
        *   [ ] "현재 목록 프리셋으로 저장" 버튼 UI (*선택 사항, 현재 구현 범위 외*)
        *   [x] 프리셋 데이터 관리 로직 (`src/default-boss-list.js`에 추가)
        *   [x] 프리셋 로드/저장 이벤트 리스너 (`src/event-handlers.js`)
*   [x] **4.3. 알림 설정 (Notification Settings) 화면:**
    *   [ ] 데스크톱 알림 토글 UI (새로운 기능) (*선택 사항, 현재 구현 범위 외*)
        *   [ ] `src/data-managers.js`에 설정 상태 저장/로드 로직 추가 (*선택 사항, 현재 구현 범위 외*)
        *   [ ] `src/event-handlers.js`에 이벤트 리스너 추가 및 실제 데스크톱 알림 API 연동 (Notification API) (*선택 사항, 현재 구현 범위 외*)
    *   [ ] 오디오 알림 토글 UI (새로운 기능) (*선택 사항, 현재 구현 범위 외*)
        *   [ ] `src/data-managers.js`에 설정 상태 저장/로드 로직 추가 (*선택 사항, 현재 구현 범위 외*)
        *   [ ] `src/event-handlers.js`에 이벤트 리스너 추가 및 `src/speech.js`의 `speak` 함수 제어 (*선택 사항, 현재 구현 범위 외*)
    *   [ ] 사용자 정의 알림 시간 설정 UI (새로운 기능) (*선택 사항, 현재 구현 범위 외*)
        *   [ ] "알림 시간 추가" 버튼 (*선택 사항, 현재 구현 범위 외*)
        *   [ ] 현재 설정된 알림 시간 목록 표시 및 각 항목 "삭제" 버튼 (*선택 사항, 현재 구현 범위 외*)
        *   [ ] `src/data-managers.js`에 알림 시간 목록 저장/로드 로직 추가 (*선택 사항, 현재 구현 범위 외*)
        *   [ ] `src/alarm-scheduler.js`에서 사용자 정의 알림 시간 활용 로직 구현 (*선택 사항, 현재 구현 범위 외*)
    *   [x] 고정 알림 설정 UI (기존 기능 유지 및 개선)
        *   [x] 고정 알림 목록 표시 및 개별 토글 스위치 유지
        *   [x] `src/ui-renderer.js`의 `renderFixedAlarms`, `updateFixedAlarmVisuals` 함수 연동
*   [x] **4.4. 알림 로그 (Alarm Log) 화면:**
    *   [x] 시스템 메시지 및 트리거된 알림 표시 스크롤 영역 (`<div>` 또는 `<textarea>`)
    *   [ ] "로그 지우기" 버튼 (선택 사항) (*현재 구현 범위 외*)
    *   [ ] 로그 필터링/검색 기능 (선택 사항) (*현재 구현 범위 외*)
    *   [x] `src/logger.js`와 연동하여 모든 로그 메시지 표시
*   [x] **4.5. 도움말 (Help) 화면:**
    *   [x] 탭 인터페이스 구현 (`<div>` 또는 `<nav>` + `<div>`): "기능 가이드" 탭, "버전 기록" 탭
    *   [x] 탭 클릭 시 콘텐츠 동적 로드:
        *   [x] "기능 가이드" 탭: `docs/feature_guide.txt` 내용 표시 (`fetch` API 활용)
        *   [x] "버전 기록" 탭: `docs/version_history.txt` 내용 표시 (`fetch` API 활용)
        *   [x] `src/event-handlers.js`에 탭 클릭 이벤트 리스너 및 콘텐츠 로드 함수 추가
        *   [x] `src/api-service.js`에 파일 내용 로드 함수 추가 (필요시 - *현재는 `event-handlers.js`에서 직접 처리*)
*   [x] **4.6. 릴리즈 노트 (Version Info) 화면:**
    *   [x] 현재 버전 (`vX.X.X`) 크게 표시 UI
    *   [ ] 업데이트 내역 (`docs/version_history.txt` 기반) 목록 표시 UI (*현재 구현 범위 외*)
        *   [ ] `src/event-handlers.js` 또는 `src/ui-renderer.js`에서 `docs/version_history.txt` 내용을 파싱하여 표시 (*현재 구현 범위 외*)
*   [x] **4.7. 공유 (Share) 화면:**
    *   [x] "공유 링크 생성" 버튼 UI
    *   [x] 진행/결과 모달 UI 구현: (*현재는 input/button으로 처리, 모달 아님*)
        *   [x] "링크 생성 중..." 메시지 표시
        *   [x] "클립보드에 복사 되었습니다." 메시지 및 "확인" 버튼 (*현재는 버튼 텍스트 변경으로 처리*)
        *   [ ] 모달 열기/닫기 기능 (*현재는 모달 아님*)
    *   [x] 생성된 짧은 URL 표시 UI
    *   [x] `src/event-handlers.js`에 버튼 클릭 이벤트 리스너 및 `src/api-service.js`의 `getShortUrl` 연동
    *   [x] 클립보드 복사 기능 구현 (`navigator.clipboard.writeText`)

#### **5. 푸터 (Footer) 구현**

*   [ ] 저작권 정보 (`<p>`) 추가 (선택 사항) (*현재는 "Created by: bohe" 문구로 대체*)
*   [x] 버전 정보 표시 (예: `vX.X.X`)

#### **6. 전반적인 디자인 고려사항**

*   [x] 반응형 디자인 적용 (미디어 쿼리, 유동적인 레이아웃) (*초기 설정 완료, 추가 개선 가능*)
*   [x] 간결한 UI 유지 및 불필요한 요소 제거
*   [x] 시각적 계층 (폰트 크기, 색상, 굵기) 일관성 유지
*   [x] Heroicons 라이브러리 통합 및 적절한 아이콘 활용
*   [x] 모든 화면에서 일관된 디자인 시스템 및 컴포넌트 사용

#### **7. 기술 구현 및 리팩토링**

*   [x] 기존 `index.html`의 UI 요소를 각 화면별 HTML 구조로 분리 또는 동적 생성 로직으로 전환
*   [x] `src/event-handlers.js` 및 `src/ui-renderer.js`의 기능 분리 및 재구성 (각 화면별 렌더링/이벤트 처리 모듈화 고려) (*일부 진행, 추가 개선 가능*)
*   [x] 새로운 기능 (데스크톱 알림, 오디오 알림 토글, 사용자 정의 알림 시간, 프리셋)을 위한 `src/data-managers.js` 확장 (*프리셋 기능만 추가, 나머지 선택 사항은 제외*)
*   [x] `src/alarm-scheduler.js`에서 사용자 정의 알림 시간 로직 통합 (*기존 고정 알림 활용*)
*   [x] `src/logger.js`가 모든 화면에서 일관되게 로그를 표시하도록 연동
*   [x] `src/speech.js`의 오디오 알림 토글 기능 연동 (*기존 기능 유지*)
*   [x] `docs/feature_guide.txt` 및 `docs/version_history.txt` 내용을 동적으로 로드하는 로직 구현
*   [x] `src/api-service.js`에 파일 로드 기능 추가 (필요시 - *`event-handlers.js`에서 fetch로 직접 로드*)