# 실시간 스케줄 공유 시스템 상세 명세서 (v1.1)

**문서 버전:** 1.1
**작성일:** 2025-12-04
**작성자:** 수석 아키텍트

## 1. 개요 (Overview)

### 1.1. 목표 (Objective)
본 시스템의 핵심 목표는 기존의 수동적 URL 공유 방식에서 벗어나, 중앙화된 데이터 저장소를 기반으로 **관리자와 사용자(뷰어) 간의 보스 스케줄을 실시간으로 동기화**하는 것입니다. 이를 통해 관리자는 단일 원본을 수정하고, 모든 사용자는 별도의 액션 없이 항상 최신 정보를 유지하게 하여 사용자 경험을 극대화합니다.

### 1.2. 핵심 전략 (Core Strategy)
*   **단일 진실 공급원 (SSOT, Single Source of Truth):** 모든 스케줄 데이터는 클라이언트가 아닌, 서버의 데이터베이스에 저장된 것을 유일한 진실 공급원으로 삼습니다. 클라이언트는 이 데이터를 구독하고 반영하는 역할만 수행합니다.
*   **실시간 동기화 (Real-time Synchronization):** 서버의 데이터 변경이 발생하면, 별도의 요청(Polling) 없이 서버가 즉시 모든 연결된 클라이언트에게 변경 사항을 푸시(Push)하는 발행/구독(Pub/Sub) 모델을 채택합니다.
*   **역할 기반 접근 제어 (RBAC, Role-Based Access Control):** `adminKey`의 소유 여부에 따라 스케줄을 수정할 수 있는 **'관리자(Admin)'**와 읽기만 가능한 **'사용자(Viewer)'**의 역할을 명확히 분리하여 데이터의 무결성을 보장합니다.
*   **이중 보안 (Two-Factor Security):** 모든 스케줄은 `adminKey` 링크와 별도로 **필수 비밀번호**로 보호하여, 링크 유출 시에도 비인가된 수정을 원천적으로 차단합니다.

### 1.3. 제외 범위 (Out of Scope)
*   본 명세는 데이터 동기화에만 집중하며, **브라우저 푸시 알림 기능(Web Push Notification)은 포함하지 않습니다.**

---

## 2. 시스템 아키텍처 (System Architecture)

### 2.1. 구성 요소 (Components)
| 구성 요소 | 기술 스택 | 주요 역할 |
| :--- | :--- | :--- |
| **Frontend (Client)** | Vanilla JS (ESM), HTML5 | 사용자 인터페이스, 상태 관리, 서버 API 통신 및 실시간 이벤트 수신 |
| **Backend (Serverless)** | Vercel Serverless Functions | 클라이언트 요청 처리를 위한 비즈니스 로직 API |
| **Database** | Supabase (PostgreSQL) | 스케줄 데이터의 영구 저장 및 관리 (SSOT) |
| **Real-time Service** | Supabase Realtime | 데이터베이스 변경 사항을 클라이언트로 즉시 브로드캐스팅 |

### 2.2. 핵심 데이터 흐름 (Core Data Flow)
1.  **관리자 스케줄 저장 흐름:**
    `Admin Client` → (보스 목록 수정) → `[서버 저장]` 클릭 → `POST /api/schedules` (with `adminKey`, `password`) → `Vercel API` → (데이터 검증 및 인증) → `Supabase DB`에 데이터 Upsert

2.  **사용자 실시간 동기화 흐름:**
    `Supabase DB` 변경 발생 → `Supabase Realtime`이 변경 감지 및 브로드캐스트 → `모든 Viewer Client`가 이벤트 수신 → `BossDataManager` 업데이트 → UI 자동 리렌더링

3.  **최초 접속 시 데이터 로드 흐름:**
    `Client` 접속 → (URL에서 `scheduleId` 파싱) → `GET /api/getSchedule?id={scheduleId}` → `Vercel API` → `Supabase DB` 조회 → `Client`에 `bossData` 전달 및 렌더링 → `Supabase Realtime` 구독 시작

---

## 3. 데이터베이스 설계 (Database Design)

### 3.1. 테이블: `schedules`
```sql
CREATE TABLE IF NOT EXISTS schedules (
    schedule_id TEXT PRIMARY KEY,
    admin_key TEXT NOT NULL,
    boss_data JSONB NOT NULL,
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE schedules IS '공유 스케줄의 메타데이터와 원본 데이터를 저장합니다.';
COMMENT ON COLUMN schedules.schedule_id IS '공유 URL에 사용되는 공개 식별자 (UUID v4)';
COMMENT ON COLUMN schedules.admin_key IS '쓰기 권한 증명을 위한 1차 비밀 키 (UUID v4)';
COMMENT ON COLUMN schedules.password_hash IS '필수 이중 보안을 위한 2차 비밀번호 해시 (bcrypt 알고리즘 사용)';
COMMENT ON COLUMN schedules.boss_data IS '보스 목록 전체를 담는 JSONB 객체';
COMMENT ON COLUMN schedules.updated_at IS '마지막 수정 시각 (디버깅 및 RLS 정책에 활용)';
COMMENT ON COLUMN schedules.expires_at IS '24시간 후 자동 만료/삭제 처리를 위한 타임스탬프 (TTL)';
```

### 3.2. 보안 정책 (Row Level Security)
*   Supabase의 RLS를 활성화하여 기본적으로 모든 Public 접근을 차단합니다. 백엔드 API는 `service_role` 키를 사용하여 이 정책을 우회하므로, 클라이언트에서 직접 DB에 접근하는 것을 원천적으로 봉쇄합니다.

---

## 4. 백엔드 API 명세 (Vercel Serverless Functions)

### 4.1. `POST /api/schedules` (스케줄 생성/수정/비밀번호 변경)
*   **설명:** 스케줄 생성, 데이터 수정, 비밀번호 변경을 모두 처리하는 유일한 엔드포인트입니다.
*   **요청 본문 (Request Body):**
    ```json
    {
      "bossData": "optional-json",
      "password": "string",
      "newPassword": "optional-string",
      "scheduleId": "optional-string",
      "adminKey": "optional-string"
    }
    ```
*   **핵심 로직:**
    1.  **신규 생성:** 요청에 `scheduleId`가 없으면 '신규 생성'으로 간주합니다.
        *   `password` 필드가 없거나 4자리 미만이면 `400 Bad Request` 반환.
        *   새로운 `schedule_id`, `admin_key`를 생성하고, `password`를 해싱하여 DB에 `INSERT`합니다.
    2.  **수정/비밀번호 변경:** 요청에 `scheduleId`가 있으면 '수정'으로 간주합니다.
        *   `scheduleId`, `adminKey`, `password`를 통해 요청을 인증합니다. 인증 실패 시 `401 Unauthorized` 또는 `403 Forbidden`을 반환합니다.
        *   인증 성공 후, `newPassword`가 있으면 (4자리 이상) 비밀번호를 변경하고, `bossData`가 있으면 데이터를 수정합니다.
    3.  모든 성공적인 저장/수정 시, `expires_at` 필드를 `현재 시간 + 24시간`으로 갱신합니다.
*   **성공 응답 (Success Response):** `200 OK` 또는 `201 Created`
    ```json
    {
      "scheduleId": "생성/수정된 ID",
      "adminKey": "생성/수정된 관리자 키"
    }
    ```

### 4.2. `GET /api/schedules?id={scheduleId}` (스케줄 조회)
*   **설명:** 모든 사용자가 최초 접속 시 스케줄 데이터를 조회하기 위한 엔드포인트입니다.
*   **쿼리 파라미터:** `id` (조회할 `schedule_id`)
*   **핵심 로직:**
    1.  `schedule_id`로 데이터를 조회합니다.
    2.  데이터가 없거나 `expires_at`이 지났으면 `404 Not Found`를 반환합니다.
*   **성공 응답:** `200 OK` (단, `adminKey`, `password_hash`는 제외)
    ```json
    {
      "bossData": { ... },
      "updatedAt": "타임스탬프"
    }
    ```
---

## 5. 프론트엔드 상세 명세 (Frontend Specification)

### 5.1. 신규 모듈: `src/sync-manager.js`
*   **역할:** 모든 서버 통신 및 실시간 구독 로직을 캡슐화하는 중앙 관리자 모듈.
*   **주요 함수:**
    *   `async init(scheduleId, onUpdateCallback)`: Supabase 클라이언트를 초기화하고 실시간 구독을 설정합니다.
    *   `async getSchedule(scheduleId)`: `GET /api/schedules`를 호출합니다.
    *   `async saveSchedule({ ... })`: `POST /api/schedules`를 호출합니다.

### 5.2. UI/UX 변경 사항
*   **보스 설정 화면 (`boss-management.js`):**
    *   **모드 분기:** `adminKey` 존재 여부로 '관리자 모드'와 '뷰어 모드'를 결정합니다.
    *   **관리자 모드:**
        *   `[서버 저장]` 클릭 시, 비밀번호를 묻는 모달을 띄웁니다. (신규 생성 시에는 '새 비밀번호', '비밀번호 확인' 필드 포함)
        *   `[비밀번호 변경]` 버튼을 추가하고, 클릭 시 '현재/새' 비밀번호를 입력하는 모달을 띄웁니다.
    *   **뷰어 모드:**
        *   `<textarea>`를 `readonly` 속성 처리하거나, `<table>` 형태로 대체합니다.
        *   `[서버 저장]`, `[비밀번호 변경]` 버튼을 숨깁니다.
*   **공유 화면 (`share.js`):**
    *   **카드 기반 UI:** `scheduleId` 존재 여부에 따라 동적으로 카드를 표시합니다.
    *   **Card 1 (앱 링크 공유):** 항상 표시. 기본 시간표가 포함된 앱의 기본 주소를 공유.
    *   **Card 2 (길드원 스케줄 공유):** `scheduleId` 존재 시 표시. 읽기 전용 링크 공유.
    *   **Card 3 (관리자 링크):** `adminKey` 존재 시 표시. 수정 권한 링크 공유.
    *   **예외 처리:** `scheduleId`가 없을 경우, 링크 생성을 유도하는 안내 메시지를 표시합니다.

### 5.3. 데이터 흐름 및 상태 관리
1.  **초기 로드:** `app.js`는 URL에서 `scheduleId`를 확인하고, `syncManager.getSchedule`로 데이터를 가져옵니다. 실패/만료 시 Toast 메시지를 표시하고 기본 목록을 로드합니다.
2.  **실시간 수신:** `syncManager`는 실시간 업데이트 수신 시 `EventBus.emit('schedule-updated', newBossData)`를 호출합니다.
3.  **전역 상태 반영:** `global-event-listeners.js`에서 `schedule-updated` 이벤트를 받아 `BossDataManager`의 데이터를 갱신하고, UI 리렌더링을 트리거합니다.

---

## 6. 보안 강화 방안 (Security Hardening)

### 6.1. 비밀번호 정책 (Password Policy)
*   사용자 편의성을 고려하여, 비밀번호는 **최소 4자리 이상**으로 설정합니다.
*   프론트엔드와 백엔드 양단에서 최소 길이를 검증하여, 지나치게 취약한 비밀번호 설정을 방지합니다.

### 6.2. API 속도 제한 (Rate Limiting)
*   무차별 대입 공격 및 서비스 거부(DoS) 공격으로부터 백엔드를 보호하기 위해, Vercel 인프라를 활용하여 **IP 기반의 API 속도 제한**을 적용합니다.
*   **정책 예시:** IP 주소당 1분 이내에 `POST /api/schedules` 요청 30회 초과 시, `429 Too Many Requests` 에러를 반환합니다.

### 6.3. CORS 정책 (Cross-Origin Resource Sharing)
*   Vercel에 배포된 백엔드 API는 **지정된 프론트엔드 도메인(예: `https://your-name.github.io`)에서 오는 요청만 허용**하도록 명시적인 CORS 정책을 설정합니다.
*   이를 통해 허가되지 않은 다른 웹사이트에서 API를 악의적으로 호출하는 것을 원천 차단합니다.

### 6.4. 관리자 키 URL 마스킹 (Admin Key URL Masking)
*   최초 접속 시 URL에 포함된 `adminKey`는 즉시 `localStorage`에 저장한 후, `history.pushState`를 사용하여 브라우저 주소창에서 제거합니다.
*   이를 통해 사용자가 브라우저 주소창을 복사하여 공유할 때 `adminKey`가 실수로 유출되는 것을 방지합니다.

---

## 7. UI/UX 상세 처리 (Detailed UI/UX Handling)

### 7.1. 비동기 처리 상태 시각화
*   **로딩 상태 (Loading State):** `[서버 저장]`, `[비밀번호 변경]` 등 API 호출을 트리거하는 모든 버튼은, 클릭 시 API 응답을 받기 전까지 **비활성화(disabled) 상태가 되고 내부에 로딩 스피너를 표시**해야 합니다.
*   **오류 상태 (Error State):**
    *   **입력 오류:** "비밀번호가 일치하지 않습니다", "비밀번호는 4자리 이상이어야 합니다" 등 사용자 입력값에 대한 오류는 해당 입력 필드 아래나 모달 내에 즉시 표시합니다.
    *   **서버/네트워크 오류:** "서버와의 통신에 실패했습니다. 잠시 후 다시 시도해주세요." 와 같은 포괄적인 오류 메시지를 Toast나 모달을 통해 표시합니다.

---

## 8. 안정성 및 예외 처리 (Stability & Exception Handling)

### 8.1. 실시간 연결 실패 시 '우아한 실패 처리' (Graceful Degradation)
*   **배경 (Context):** 24시간 브라우저를 켜두는 사용 패턴, 불안정한 네트워크, 동시 접속자 제한 등으로 인해 실시간 연결(WebSocket)이 실패하거나 중단될 수 있습니다.
*   **구현 방안:**
    1.  **자동 폴링 전환 (Fallback to Polling):** 실시간 연결 실패 감지 시, **60초** 간격으로 `GET /api/schedules` API를 주기적으로 호출하는 '폴링 모드'로 자동 전환합니다.
    2.  **재연결 시도 (Reconnection):** 폴링 모드 중에도, '지수적 백오프(Exponential Backoff)' 전략을 사용하여 백그라운드에서 주기적으로 실시간 재연결을 시도합니다. 재연결 성공 시 폴링 모드를 중단합니다.
    3.  **사용자 알림 (User Notification):** 폴링 모드로 전환되면 "실시간 연결이 지연되어 1분마다 자동 새로고침됩니다." 와 같은 상태 메시지를 표시합니다.