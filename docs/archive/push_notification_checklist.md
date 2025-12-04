### **푸시 알림 시스템 구축 체크리스트 (사전 분석 기반 실행 계획) - v2**

#### **1.0 개요 및 전략**

이 문서는 '보스 알리미' 애플리케이션에 **푸시 알림 및 실시간 동기화 시스템**을 구축하기 위한 실행 계획을 정의합니다. `@docs/push_notification_spec.md` (v6.1) 명세서를 기반으로 작성되었습니다.

*   **목표:** 브라우저가 종료된 상태에서도 알림을 받을 수 있는 백그라운드 푸시 알림 및 관리자-사용자 간 실시간 동기화 기능 구현.
*   **핵심 원칙:**
    1.  **사전 심층 분석:** 각 단계를 실행하기 전, 영향 범위를 분석하고 잠재적 오류를 예측합니다.
    2.  **점진적 구현:** Backend(DB) -> Frontend Core -> UI -> Serverless API 순으로 바닥부터 견고하게 쌓아 올립니다.
    3.  **사용자 검증 필수:** 각 주요 기능 구현 후에는 반드시 수동 검증 절차를 거칩니다.

---

### **0단계: 환경 설정 및 기반 작업**

<details>
<summary><strong>0.1. Supabase 및 OneSignal 프로젝트 설정 (수동)</strong></summary>

- [ ] **사전 분석:** 외부 서비스(Supabase, OneSignal) 계정 및 프로젝트 생성이 선행되어야 함을 확인합니다. Dev/Prod 환경 분리 전략을 숙지합니다.
- [ ] **실행 계획:**
    1.  **Supabase:** 새 프로젝트 생성 (또는 기존 프로젝트 활용).
    2.  **OneSignal:**
        *   Production용 App 생성.
        *   Development용 App 생성 (Localhost 테스트용).
    3.  **Vercel:** 환경 변수 설정 (`ONESIGNAL_APP_ID_*`, `ONESIGNAL_REST_API_KEY_*`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` 등).
- [ ] **검증:** 각 서비스 대시보드에서 프로젝트가 정상 생성되었는지 확인.
- [ ] **비고:** 이 단계는 코드가 아닌 서비스 설정 작업입니다.
</details>

<details>
<summary><strong>0.2. 상수 및 타입 정의 (`src/constants.js`)</strong></summary>

- [ ] **사전 분석:** `PushManager` 및 UI에서 공통으로 사용할 환경 변수(App ID 등)와 상수(알림 상태 텍스트 등)를 정의할 곳이 필요합니다.
- [ ] **실행 계획:**
    *   `src/constants.js` 생성/수정.
    *   OneSignal App ID (Dev/Prod), Supabase URL/Key(Public) 등을 상수로 정의.
    *   `window.location.hostname` 기반으로 Dev/Prod ID를 반환하는 헬퍼 함수 추가.
- [ ] **검증:** 콘솔에서 상수 값들이 올바르게 출력되는지 확인.
- [ ] **커밋:** `git commit -m "chore(config): 푸시 알림 관련 상수 및 환경 설정 추가"`
</details>

---

### **1단계: Backend - 데이터베이스 구축 (Supabase)**

<details>
<summary><strong>1.1. DB 테이블 생성 및 RLS 정책 적용</strong></summary>

- [ ] **사전 분석:** 명세서 4.0 섹션의 SQL 스키마를 분석합니다. `schedules`, `push_alarms` 테이블과 인덱스, RLS 정책이 포함되어야 합니다.
- [ ] **실행 계획:** Supabase SQL Editor에서 명세서의 SQL 쿼리를 실행하여 테이블 생성.
- [ ] **검증:** Supabase Table Editor에서 `schedules`, `push_alarms` 테이블이 생성되었는지, 컬럼 타입과 제약 조건이 올바른지 확인.
- [ ] **비고:** SQL 파일은 `docs/schema.sql`로 저장하여 관리하는 것을 권장.
</details>

---

### **2단계: Frontend Core - PushManager 구현**

<details>
<summary><strong>2.1. OneSignal SDK 연동 및 초기화</strong></summary>

- [ ] **사전 분석:** `index.html`에 SDK 스크립트 추가가 필요하며, `PushManager` 모듈에서 초기화(`init`) 로직을 담당해야 합니다. **포그라운드 알림 차단 정책**을 적용해야 합니다.
- [ ] **실행 계획 1 (HTML):** `index.html` `<head>`에 OneSignalSDK 스크립트 태그 추가.
- [ ] **실행 계획 2 (PushManager):** `src/push-manager.js` 생성.
    *   `init()` 함수에서 `OneSignal.init()` 호출.
    *   옵션 적용: `notificationWillShowInForeground: false` (앱 사용 중 시스템 푸시 차단).
    *   환경(Dev/Prod)에 따른 App ID 분기 처리 적용.
- [ ] **실행 계획 3 (App.js):** `src/app.js`에서 `PushManager.init()` 호출.
- [ ] **검증:** 로컬 실행 시 브라우저 콘솔에 OneSignal 초기화 로그가 뜨는지 확인. (구독 프롬프트는 아직 뜨지 않아야 함)
- [ ] **커밋:** `git commit -m "feat(push): OneSignal SDK 연동 및 PushManager 초기화 로직 구현"`
</details>

<details>
<summary><strong>2.2. Supabase Client 연동 및 Realtime 구독</strong></summary>

- [ ] **사전 분석:** 바닐라 JS 환경이므로 CDN을 통해 `supabase-js`를 로드하거나 모듈로 import 해야 합니다. `PushManager`가 Supabase 연결을 담당합니다.
- [ ] **실행 계획 1 (라이브러리):** `index.html`에 `supabase-js` CDN 추가.
- [ ] **실행 계획 2 (연결):** `src/push-manager.js`에서 `createClient`로 Supabase 인스턴스 생성.
- [ ] **실행 계획 3 (Realtime):** `schedules` 테이블의 `UPDATE` 이벤트를 구독하는 로직 구현. 데이터 변경 시 `BossDataManager`를 업데이트하고 UI를 갱신하는 콜백 연결.
- [ ] **검증:** Supabase 대시보드에서 임의의 데이터를 수정했을 때, 클라이언트 콘솔에 변경 이벤트가 수신되는지 확인.
- [ ] **커밋:** `git commit -m "feat(sync): Supabase Client 연동 및 Realtime 구독 구현"`
</details>

---

### **3단계: UI/UX 구현**

<details>
<summary><strong>3.1. 대시보드 - 알림 상태 및 소리 설정 카드 개선</strong></summary>

- [ ] **사전 분석:** 명세서 3.1에 따라 '알림 상태' 카드는 브라우저 권한 상태와 연동되어야 하며, '좀비 상태(Zombie State)' 처리가 필요합니다.
- [ ] **실행 계획:**
    *   `src/ui-renderer.js` 및 `dashboard.js` 수정.
    *   알림 권한 상태(`Notification.permission`) 체크 로직 추가.
    *   권한이 `denied`인데 로컬 설정이 `ON`인 경우 강제 `OFF` 및 경고창 표시 로직 구현.
- [ ] **검증:** 브라우저 알림 권한을 차단한 상태로 앱을 실행하여 경고창이 뜨고 스위치가 꺼지는지 확인.
- [ ] **커밋:** `git commit -m "feat(ui): 대시보드 알림 상태 카드 및 권한 방어 로직 구현"`
</details>

<details>
<summary><strong>3.2. 보스 설정 화면 - 관리자/뷰어 모드 분리</strong></summary>

- [ ] **사전 분석:** URL의 `adminKey` 유무에 따라 화면이 완전히 달라져야 합니다. 일반 사용자는 수정 불가능한 테이블을 봐야 합니다.
- [ ] **실행 계획:**
    *   `src/screens/boss-management.js` 및 `ui-renderer.js` 수정.
    *   `checkAdminMode()` 함수 구현.
    *   **관리자 모드:** 기존 `<textarea>`, '시간순 정렬' 버튼 표시 + '[서버 저장]' 버튼(Danger Style) 추가. Dirty State 감지 로직.
    *   **뷰어 모드:** `<textarea>` 숨김, **읽기 전용 Table** 렌더링 로직 추가. '[텍스트 복사]' 버튼 추가.
- [ ] **검증:**
    *   `?adminKey=...` 접속 시: 에디터 및 저장 버튼 표시.
    *   일반 접속 시: 테이블 및 복사 버튼 표시.
- [ ] **커밋:** `git commit -m "feat(ui): 보스 설정 화면 관리자/뷰어 모드 분리 및 UI 구현"`
</details>

<details>
<summary><strong>3.3. 공유 화면 - 카드 UI 개편</strong></summary>

- [ ] **사전 분석:** 명세서 3.4에 따라 3단 카드 레이아웃(앱 링크, 길드원 스케줄, 관리자 링크)으로 전면 개편해야 합니다.
- [ ] **실행 계획:**
    *   `src/screens/share.js` 및 `ui-renderer.js` 수정.
    *   기존 단일 공유 버튼을 3개의 카드 UI로 변경.
    *   각 버튼 클릭 시 클립보드 복사 로직 및 Toast 출력 구현.
    *   `scheduleId`가 없을 경우 경고창 표시 로직 추가.
- [ ] **검증:** 각 버튼 클릭 시 올바른 URL이 복사되는지, 관리자 링크는 권한이 있을 때만 보이는지 확인.
- [ ] **커밋:** `git commit -m "feat(ui): 공유 화면 카드 UI 3단 개편"`
</details>

<details>
<summary><strong>3.4. 알림 설정 화면 - 백그라운드 알림 토글</strong></summary>

- [ ] **사전 분석:** 명세서 3.5에 따라 OneSignal 구독(`optIn`/`optOut`)을 제어하는 토글 스위치를 추가해야 합니다.
- [ ] **실행 계획:**
    *   `src/screens/notifications.js` 수정.
    *   [백그라운드 알림 (Beta)] 섹션 추가.
    *   토글 변경 시 `PushManager.setSubscription(bool)` 호출.
- [ ] **검증:** 토글 ON/OFF 시 OneSignal 대시보드에서 구독자 상태가 변경되는지 확인.
- [ ] **커밋:** `git commit -m "feat(ui): 알림 설정 화면 백그라운드 알림 토글 추가"`
</details>

<details>
<summary><strong>3.5. 젠 계산기 - 서버 동기화 연동</strong></summary>

- [ ] **사전 분석:** 명세서 3.3에 따라 젠 계산기 업데이트 시 로컬뿐만 아니라 서버 API도 호출해야 합니다.
- [ ] **실행 계획:**
    *   `src/screens/calculator.js` 수정.
    *   [보스 시간 업데이트] 버튼 클릭 핸들러에 `PushManager.syncSchedule()` 호출 로직 추가.
    *   성공/실패에 따른 Toast 메시지 처리.
- [ ] **검증:** 젠 계산기 업데이트 후 Supabase DB 데이터가 갱신되는지 확인.
- [ ] **커밋:** `git commit -m "feat(ui): 젠 계산기 업데이트 시 서버 동기화 로직 추가"`
</details>

<details>
<summary><strong>3.6. iOS 대응 - 홈 화면 추가 유도 모달</strong></summary>

- [ ] **사전 분석:** 명세서 3.6에 따라 iOS 기기이면서 Standalone 모드가 아닌 경우 모달을 띄워야 합니다.
- [ ] **실행 계획:**
    *   `src/ui-renderer.js` 수정.
    *   `checkIOSAndNotStandalone()` 헬퍼 함수 구현 (User Agent 확인).
    *   전체 화면 모달 UI (`src/assets/images/favicon.svg` 활용) 구현.
    *   '나중에 하기' 클릭 시 쿠키/로컬스토리지에 숨김 상태 저장 로직 추가.
- [ ] **검증:** 크롬 개발자 도구 'Sensors' 탭에서 iOS 기기로 시뮬레이션하여 모달 표시 여부 확인.
- [ ] **커밋:** `git commit -m "feat(ui): iOS 홈 화면 추가 유도 모달 구현"`
</details>

---

### **4단계: Serverless Backend (Vercel Functions)**

<details>
<summary><strong>4.1. 동기화 API (`/api/sync`) 구현</strong></summary>

- [ ] **사전 분석:** 명세서 5.1에 따라 트랜잭션 처리, 데이터 Upsert, OneSignal 예약 취소, 재예약 로직이 포함되어야 합니다.
- [ ] **실행 계획:**
    *   `api/sync.js` (Node.js) 생성.
    *   Supabase 클라이언트 설정 (Pooler 포트 6543 사용).
    *   트랜잭션 내에서 `DELETE` -> `INSERT` 로직 구현.
    *   OneSignal API 호출하여 기존 예약 취소 로직 추가.
- [ ] **검증:** Postman으로 API 호출 시 DB 데이터가 갱신되고 `expires_at`이 연장되는지 확인.
- [ ] **커밋:** `git commit -m "feat(api): 동기화 API(sync.js) 구현 - 트랜잭션 및 예약 관리"`
</details>

<details>
<summary><strong>4.2. Cron 스케줄러 (`/api/cron`) 구현</strong></summary>

- [ ] **사전 분석:** 명세서 5.2에 따라 매분 실행되며, 조회 범위 중첩(-10s ~ +70s)과 OneSignal `send_after` 전송 로직을 구현해야 합니다.
- [ ] **실행 계획:**
    *   `api/cron.js` 생성.
    *   `vercel.json`에 Cron Job 설정 추가 (`"schedule": "* * * * *"`).
    *   DB 조회 쿼리 구현 (중첩 범위).
    *   OneSignal REST API 호출 (Batch 처리 권장, Idempotency Key 사용).
- [ ] **검증:** 로컬에서 `/api/cron` 호출 시, 해당 시간대(범위 내)의 알림이 OneSignal로 전송되는지 로그 확인.
- [ ] **커밋:** `git commit -m "feat(api): Cron 스케줄러(cron.js) 구현 및 Vercel 설정"`
</details>

---

### **5단계: 통합 테스트 및 배포**

<details>
<summary><strong>5.1. 전체 시나리오 통합 테스트</strong></summary>

- [ ] **사전 분석:** 모든 기능이 연결된 상태에서 사용자 시나리오를 수행합니다.
- [ ] **실행 계획:**
    1.  관리자가 보스 시간을 수정하고 [서버 저장] 클릭 -> DB 갱신 및 Realtime으로 다른 브라우저에 반영되는지 확인.
    2.  알림 설정에서 백그라운드 알림 ON -> Cron 실행 시점에 푸시 알림 도착하는지 확인.
    3.  공유 링크 생성 및 접속 테스트 (뷰어 모드 확인).
    4.  젠 계산기 업데이트 시 동기화 확인.
    5.  iOS 시뮬레이션 모달 확인.
- [ ] **검증:** 모든 시나리오 통과.
</details>

<details>
<summary><strong>5.2. 배포 (Production)</strong></summary>

- [ ] **사전 분석:** 환경 변수가 Prod용으로 올바르게 설정되었는지 최종 확인합니다.
- [ ] **실행 계획:** `main` 브랜치 푸시 (Vercel 자동 배포).
- [ ] **검증:** 배포된 실제 URL에서 기능 동작 확인.
- [ ] **커밋:** `git commit -m "chore(release): 푸시 알림 시스템 배포"`
</details>