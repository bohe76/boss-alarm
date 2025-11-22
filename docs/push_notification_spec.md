# 푸시 알림 시스템 구축 및 UI/UX 상세 명세서 (Final v6.1)

## 1. 프로젝트 개요
* **목표:** 기존 웹 앱(SPA)의 완성된 로직을 유지하면서, 브라우저가 종료된 상태에서도 보스 출현 알림을 받을 수 있는 **'백그라운드 푸시 알림'** 및 관리자-사용자 간 **'실시간 동기화'** 기능을 추가한다.
* **핵심 전략:**
    * **알림:** 서버가 정해진 시간(초 단위)에 예약 발송한다.
    * **동기화:** 관리자의 수정 사항은 길드원 화면에 자동으로 반영된다.
    * **안정성:** 24시간 TTL 및 자동 복구 로직을 통해 데이터를 효율적으로 관리한다.

---

## 2. 시스템 아키텍처

### 2.1. Frontend (Client)
* **기존 앱 구조 유지:** `index.html`, `event-handlers.js` 등 기존 파일 보존.
* **신규 모듈 (`src/push-manager.js`):**
    * **역할:** OneSignal SDK 제어, 서버 API 통신, 자동 동기화 관리.
    * **데이터 흐름:** `BossDataManager`(로컬 데이터) ↔ `PushManager` ↔ `Server API`.
* **환경 분기 (Environment Branching) - [New]:**
    * **전략:** 개발용(Dev)과 배포용(Prod) OneSignal 프로젝트를 별도로 생성하여 운영한다.
    * **구현:** `init` 함수 실행 시 `window.location.hostname`을 확인한다.
        * `localhost` 또는 `127.0.0.1`: **Dev App ID** 사용.
        * 그 외 실제 도메인: **Prod App ID** 사용.
* **보안:** URL로 전달된 `adminKey`는 로드 즉시 `LocalStorage`에 저장하고 주소창에서 제거(Masking)한다.
* **데이터 로딩 정책 (Load Policy):**
    * **정상 접속:** DB에 데이터가 있으면 불러와서 적용.
    * **만료된 접속 (Expired Handling):**
        * `scheduleId`로 조회했으나 DB에 데이터가 없는 경우(TTL 만료).
        * **Error 페이지를 띄우지 않고**, 앱 내장 **'기본 보스 목록(Default Boss List)'**을 표시하여 앱 사용에 지장이 없도록 한다.
        * **피드백:** "스케줄이 만료되어 기본 설정으로 로드되었습니다." Toast 출력.
* **자동 동기화 메커니즘 (Auto-Sync):**
    * **주기적 체크 (Polling):** 60초마다 서버 확인.
    * **포커스 감지:** 탭 복귀 시(`visibilitychange`) 즉시 확인.
    * **데이터 절약:** `updated_at` 비교 후 다를 때만 전체 로드.

### 2.2. Backend (Serverless)
* **Platform:** Vercel Serverless Functions.
* **Database:** Supabase (PostgreSQL).
* **Push Service:** OneSignal REST API.
* **Scheduler:** Vercel Cron (1분 주기 실행).
* **환경 변수 관리 (Environment Variables) - [New]:**
    * Vercel 프로젝트 설정에 Dev용과 Prod용 OneSignal API Key를 각각 등록한다.
    * 백엔드 코드에서도 실행 환경(또는 요청 Origin)에 따라 적절한 **REST API Key**와 **App ID**를 선택하여 OneSignal에 요청을 보낸다.

---

## 3. UI/UX 상세 명세 (화면별 세부 정의)

### 3.1. 대시보드 화면 (Dashboard)
* **레이아웃 배치 순서 (위에서 아래로):**
    1.  **다음 보스 (Next Boss)**: 메인 타이머 (기존 유지).
    2.  **다가오는 보스 목록 (Upcoming List)**: 다음 보스 다음부터 상위 10개 목록 (기존 유지).
    3.  **보스 동기화 상태 (Boss Sync Status) - [관리자 전용]**
        * **위치:** 보스 목록 바로 아래.
        * **UI:** 소제목 "보스 동기화 상태" + 상태 텍스트.
        * **상태 텍스트:**
            * 동기화 완료 시: "동기화 완료" (검정색 텍스트).
            * 미완료 시: **"동기화 필요 - 설정에서 저장해주세요"** (빨간색 텍스트).
        * **뷰어 모드:** 해당 섹션 숨김 처리.
    4.  **알림 상태 (Alarm Status)**: 앱 자체 알림 ON/OFF 토글.
    5.  **소리 설정 (Sound Settings)**: 음소거 버튼.
    6.  **알림 로그 (Alarm Log)**: 최근 알림 기록.

* **알림 상태 (Alarm Status) - 초기화 및 스위치 로직:**
    * **앱 초기화 시 (State Check):**
        * 로컬 상태는 `ON`인데, 브라우저 권한이 `없음(Denied/Default)`인 경우 (Zombie State).
        * **동작 1:** 스위치를 강제로 **OFF**로 변경하여 렌더링.
        * **동작 2:** 즉시 **시스템 경고창(Modal/Sticky Toast)**을 띄운다 (Active Alert).
        * **경고 문구:** " 알림 권한이 만료되어 스위치가 꺼졌습니다. 다시 켜주세요."
    * **최초 ON 시:** 브라우저 권한 요청 및 OneSignal 구독(`optIn`) 실행.
    * **OFF 시:** OneSignal 구독 취소(`optOut`).

* **자동 데이터 갱신 (Auto-Sync) 피드백:**
    * **상황:** 2.1의 로직에 의해 서버 데이터가 더 최신임이 확인되어, 화면이 자동으로 갱신되었을 때.
    * **UI 동작:** 상단 Toast 메시지 출력: **"최신 스케줄 정보를 불러왔습니다."**

### 3.2. 보스 설정 화면 (Boss Settings)
URL의 `adminKey` 유무에 따라 화면 구성을 완전히 이원화한다.

#### **A. 관리자 모드 (Admin Mode)**
* **기능:** 텍스트 에디터(`<textarea>`)를 통한 자유 수정.
* **버튼 구성 (좌측부터):**
    1.  **[시간순 정렬]**: 일반 버튼 (기존 유지).
    2.  **[서버 저장]**: **신규 Danger Style 버튼** (붉은색 계열 CSS 적용).
* **[서버 저장] 버튼 상세 동작:**
    * **Dirty State (변경 감지):** 텍스트 수정 즉시 버튼이 **붉은색(Danger)**으로 변하고, 하단에 "변경사항이 저장되지 않았습니다" 경고 노출.
    * **이탈 방지:** 저장하지 않고 메뉴 이동 시 `confirm` 창으로 방어.
    * **스케줄 복구 (Recovery / Upsert):** 삭제된 스케줄이라도 유효한 `adminKey`로 저장 시도 시, 동일 ID로 데이터를 재생성(복구)한다.
    * **수명 연장 (TTL Reset):** 저장 성공 시 유효 기간이 **24시간 연장**된다.
    * **클릭 시 동작:** DB 업데이트 -> 알림 예약 재설정(Reschedule). (즉시 발송 X)
    * **피드백:** "서버에 저장되었습니다." Toast 메시지.
* **최초 ID 생성:**
    * URL에 ID가 없는 초기 상태(홈 접속)인 경우, 이 화면에서 **최초 [서버 저장] 성공 시점에** 새로운 ID와 AdminKey를 발급하고 URL을 업데이트한다.

#### **B. 보기 전용 모드 (Viewer Mode)**
* **UI 구성:** 수정 불가능한 **읽기 전용 테이블(Table)**.
    * `<textarea>` 숨김 처리.
    * 테이블 디자인: 줄무늬 배경(Zebra Striping), 날짜 변경 시 구분선(Divider) 표시.
* **버튼 구성:**
    * [시간순 정렬], [서버 저장] 버튼 숨김.
    * **[텍스트 복사]** 버튼 표시: **일반 버튼** 스타일. 클릭 시 전체 스케줄 텍스트를 클립보드에 복사.

### 3.3. 젠 계산기 화면 (Zen Calculator)
* **저장 방식:** 하이브리드 저장 (Local 즉시 + Server 자동).
* **[보스 시간 업데이트] 버튼 클릭 시 동작:**
    1.  **Local:** 앱 내부 데이터(`BossDataManager`) 즉시 업데이트 (대시보드 반영).
    2.  **Server:** 별도 확인 절차 없이 **즉시 서버 동기화 API 호출**.
    3.  **Dirty State 해제:** 동기화 성공 시, [보스 설정] 화면의 '저장 안 됨' 상태를 초기화(Reset)한다.
* **피드백 (Toast):**
    * 성공 시: **"보스 시간 업데이트 및 알림 예약 완료"**
    * 실패 시: "시간은 변경되었으나 서버 저장 실패 (네트워크 확인)"

### 3.4. 공유 화면 (Share Screen)
* **예외 처리 (Validation):**
    * 서버에 저장된 데이터(Schedule ID)가 없는 상태에서 공유 시도 시.
    * **경고창(Alert) 출력:**
        >  **서버에 저장된 데이터가 없습니다.**
        >
        > 공유 링크를 생성하려면 먼저 **[보스 설정]** 메뉴에서 **[서버 저장]** 버튼을 눌러주세요.
    * 확인 클릭 시 **[보스 설정]** 화면으로 자동 이동.

* **카드 UI 구성 (위에서 아래로 3단 배치):**
    * **공통 동작:** 버튼 클릭 시 링크 복사 + Toast "링크가 복사되었습니다!"

    **Card 1. 앱 링크 공유**
    * **소제목:** 앱 링크 공유
    * **상세 설명:** "친구들에게 보스 알리미 앱을 소개할 때 사용하세요. 기본적인 앱 접속 주소입니다."
    * **버튼:** `[앱 링크 복사]` (일반 버튼 스타일)
    * **복사 내용:** 앱의 기본 도메인 URL.

    **Card 2. 길드원 스케줄 공유 (핵심)**
    * **소제목:** 길드원 스케줄 공유
    * **상세 설명:** "길드원들에게 현재 시간표를 공유합니다. **보기 전용** 링크이므로 공유받은 사람은 시간을 수정할 수 없습니다."
    * **버튼:** `[길드원 스케줄 복사]` (**Primary/보라색 버튼 스타일**) 
    * **복사 내용:** `?scheduleId=[ID]` 형식의 조회 전용 링크.

    **Card 3. 관리자 링크**
    * **소제목:** 관리자 링크
    * **상세 설명:** "설정을 백업하거나 다른 기기에서 **수정 권한**을 얻을 때 사용하세요. **(유출 시 타인이 설정을 변경할 수 있으니 주의하세요)**"
    * **버튼:** `[관리자 링크 복사]` (일반 버튼 스타일)
    * **표시 조건:** 관리자 권한(`adminKey`) 보유 시에만 표시.
    * **복사 내용:** `?scheduleId=[ID]&adminKey=[Key]` 형식의 링크.

### 3.5. 알림 설정 화면 (Notification Settings)
* **[백그라운드 알림 (Beta)] 섹션 추가:**
    * 토글 스위치 제공.
    * **ON:** 브라우저 알림 권한 요청 및 OneSignal 구독(`optIn`).
    * **OFF:** OneSignal 구독 취소(`optOut`). (서버 통신 없이 SDK단에서 처리)

### 3.6. iOS 대응 (Global Modal)
* **조건:** User Agent가 iPhone/iPad이면서, Standalone(홈 화면 앱) 모드가 아닐 때.
* **동작:** 전체 화면 모달 표시.
* **UI 구성:**
    * **안내 문구:** "아이폰 정책상 **홈 화면에 추가**해야만 알림을 받을 수 있습니다."
    * **가이드 이미지:** 복잡한 별도 이미지 대신, **앱의 `favicon.svg`를 중앙에 크게 배치**하여 "이 앱을 추가하세요"라는 의미를 전달한다.
* **닫기 동작:** "나중에 하기" 버튼 클릭 시 모달 닫힘 (Cookie/LocalStorage에 '7일간 보지 않기' 저장).

### 3.7. 포그라운드 알림 정책 (Foreground Handling)
* **상황:** 사용자가 브라우저 창을 활성화(Focus)하여 앱을 보고 있는 상태.
* **동작:**
    * 기존 앱의 TTS(음성)와 화면 깜빡임 효과는 정상 실행한다.
    * **시스템 푸시 알림(상단 배너)은 뜨지 않도록 차단(Suppress)한다.**
* **구현:** OneSignal 초기화 옵션 `notificationWillShowInForeground: false` 적용.

---

## 4. 데이터베이스 설계 (Supabase)

### 4.1. Table: `schedules` (메타 데이터)
* `schedule_id` (Text, PK): 공유 URL의 ID.
* `admin_key` (Text): 관리자 인증 키.
* `boss_data` (JSONB): 전체 보스 목록 원본 데이터.
* `updated_at` (Timestamp): 마지막 수정 시간 (Auto-Sync 비교용).
* `expires_at` (Timestamp): 만료 시간 (`NOW() + 24h`).

### 4.2. Table: `push_alarms` (알림 발송용)
* `id` (Int8, PK): 고유 ID.
* `schedule_id` (Text, FK): 스케줄 ID (Index).
* `boss_name` (Text): 보스 이름.
* `fire_time_unix` (Int8): 실제 보스 출현 시간 (초 단위 Timestamp).
* `target_notify_unix` (Int8): **발송 목표 시간** (`fire_time_unix - 15초`) (Index).

---

## 5. 백엔드 로직 상세 (Vercel)

### 5.1. 동기화 API (`POST /api/sync`)
* **기능:** 클라이언트의 '최종 스케줄'을 받아 DB를 갱신하고 알림을 **재예약(Reschedule)**한다.
* **로직:**
    1.  `schedule_id`가 DB에 없어도 `adminKey`가 제공되었다면 **신규 생성(Recovery/Upsert)**으로 처리.
    2.  해당 `schedule_id`의 기존 미래 알림 데이터 전체 삭제(`DELETE`).
    3.  전송받은 데이터로 신규 알림 `INSERT`. 이때, `fire_time`에서 **15초를 뺀 시간**을 `target_notify_unix` 컬럼에 저장한다.
    4.  `schedules` 테이블의 `expires_at`을 현재 시간 기준 24시간 뒤로 연장한다.
    5.  **중요:** 이 시점에서 즉시 푸시를 발송하지 않는다. (예약만 변경)

### 5.2. 스케줄러 및 발송 로직 (`GET /api/cron`)
* **서버 실행 주기:** 매분 0초 실행 (`* * * * *`).
    * *(주의: 서버는 1초마다 실행되지 않음. 1분 단위로 묶어서 처리함.)*
* **로직 순서 (Batch & Schedule):**
    1.  **미래 구간 조회 (Look-Ahead):**
        * DB에서 `현재 시간` <= `target_notify_unix` < `현재 시간 + 60초` 사이의 모든 알람을 조회한다.
    2.  **개별 발송 원칙 (No Grouping):**
        * 동일 시간대에 여러 보스가 있더라도 합치지 않고 **각각 별도의 알림**으로 발송한다.
    3.  **예약 발송 요청 (Send After):**
        * **환경 변수 분기:** Vercel 환경(Production/Preview/Development)에 따라 적절한 OneSignal REST API Key를 사용한다.
        * OneSignal API의 **`send_after`** 파라미터에 조회된 `target_notify_unix` 시간을 담아 전송한다.
        * **메시지 템플릿:** "15초 전" 같은 상대적 문구 대신, **"{보스이름} {HH:mm:ss} 출현!"** 형식의 절대 시간을 명시하여 논리적 오류를 방지한다.
        * **핵심:** 이를 통해 Vercel 서버는 1초 만에 종료되더라도, OneSignal 서버가 해당 초(Second)까지 대기했다가 정밀하게 발송한다.
* **알림 클릭 동작 (Interaction):**
    * 사용자가 푸시를 클릭하면, **브라우저가 열리거나(Open) 이미 열려있다면 해당 탭으로 포커스(Focus)**가 이동한다.