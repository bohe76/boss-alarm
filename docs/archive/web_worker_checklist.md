### **Web Worker 도입 체크리스트 (사전 분석 기반 실행 계획)**

#### **1.0 개요 및 전략**

이 문서는 '보스 알리미' 애플리케이션의 백그라운드 알림 신뢰성을 높이기 위해 **Web Worker**를 도입하는 구체적인 실행 계획입니다.

*   **목표:** PC에서 게임을 하거나 브라우저를 최소화해도 알림 타이머가 멈추지 않도록 개선.
*   **핵심:** `setInterval` 로직을 메인 스레드에서 `Worker` 스레드로 이관.

---

### **1단계: Web Worker 기본 구조 구축**

<details>
<summary><strong>1.1. `src/workers/timer-worker.js` 파일 생성 및 기본 로직 구현</strong></summary>

- [ ] **사전 분석:** 워커는 독립적인 스코프를 가지며 DOM에 접근할 수 없음을 인지합니다. 오직 메시지(`postMessage`)로만 통신합니다.
- [ ] **실행 계획:**
    *   `src/workers/` 디렉토리 생성.
    *   `timer-worker.js` 파일 생성.
    *   `self.onmessage` 핸들러 구현:
        *   `START`: `setInterval` 시작 (1초 간격).
        *   `STOP`: `clearInterval` 실행.
    *   `setInterval` 내부에서 매초 `postMessage({ type: 'TICK', now: Date.now() })` 전송.
- [ ] **검증:** 개발자 도구 콘솔에서 워커가 생성되고 매초 메시지가 오는지 확인.
- [ ] **커밋:** `git commit -m "feat(worker): 타이머 워커 파일 생성 및 기본 인터벌 로직 구현"`
</details>

<details>
<summary><strong>1.2. `alarm-scheduler.js` 리팩토링 - 워커 연결</strong></summary>

- [ ] **사전 분석:** 기존 `alarm-scheduler.js`는 `setInterval`을 직접 관리했습니다. 이를 워커 인스턴스를 생성하고 메시지를 수신하는 역할로 변경해야 합니다.
- [ ] **실행 계획:**
    *   `alarm-scheduler.js` 상단에서 `new Worker(..., { type: 'module' })`로 워커 초기화.
    *   `startAlarm` 함수: 워커에 `START` 메시지 전송.
    *   `stopAlarm` 함수: 워커에 `STOP` 메시지 전송.
    *   `worker.onmessage`: `TICK` 메시지 수신 시 `checkAlarms` 호출 (일단 기존 로직 연결).
- [ ] **검증:** '알람 시작' 버튼 클릭 시 기존과 동일하게 로그가 찍히고 알림이 동작하는지 확인 (아직은 메인 스레드 부하에 영향받음).
- [ ] **커밋:** `git commit -m "refactor(scheduler): alarm-scheduler를 Web Worker 기반으로 변경"`
</details>

---

### **2단계: 알림 로직 워커로 이관 (성능 최적화)**

<details>
<summary><strong>2.1. 워커 데이터 동기화 프로토콜 정의</strong></summary>

- [ ] **사전 분석:** 매초 메인 스레드를 깨우는(`TICK`) 방식은 비효율적입니다. 워커가 보스 스케줄 데이터를 가지고 스스로 판단하여 "알림"일 때만 메인 스레드를 깨우도록 해야 합니다.
- [ ] **실행 계획:**
    *   `alarm-scheduler.js`: `BossDataManager.subscribe` 및 고정 알림 변경 시 워커에 `UPDATE_SCHEDULE` 메시지와 함께 **동적 보스 및 고정 알림 데이터**를 모두 전송.
    *   `timer-worker.js`: `UPDATE_SCHEDULE` 수신 시 내부 변수에 보스 목록 저장 및 병합.
- [ ] **검증:** 보스 목록을 수정했을 때 워커 내부 변수가 업데이트되는지 로그로 확인.
- [ ] **커밋:** `git commit -m "feat(worker): 보스 스케줄 데이터 동기화 로직 구현"`
</details>

<details>
<summary><strong>2.2. 워커 내부 알림 체크 로직 구현 (`checkAlarms` 이관)</strong></summary>

- [ ] **사전 분석:** `checkAlarms`의 핵심 로직(시간 비교)을 워커로 옮겨야 합니다. 단, `localStorage` 접근이나 UI 갱신 로직은 메인 스레드에 남겨야 합니다.
- [ ] **실행 계획:**
    *   `timer-worker.js`: 1초마다 내부 스케줄 데이터와 현재 시간을 비교.
    *   조건(5분전, 1분전, 정각) 충족 시 `postMessage({ type: 'ALARM', bossId: ..., alertType: ... })` 전송.
    *   `alarm-scheduler.js`: `ALARM` 메시지 수신 시 `speak()`, `log()` 실행. `TICK` 메시지 처리는 대시보드 UI 갱신용으로만 사용(또는 제거).
- [ ] **검증:** 브라우저 탭을 비활성화하거나 최소화한 상태에서 알림 시간이 되었을 때 정확히 로그/소리가 발생하는지 확인.
- [ ] **커밋:** `git commit -m "refactor(worker): 알림 체크 로직을 워커 스레드로 이관"`
</details>

---

### **3단계: OS 시스템 알림 (Notification API) 연동**

<details>
<summary><strong>3.1. 알림 권한 요청 및 발송 로직 추가</strong></summary>

- [ ] **사전 분석:** 소리뿐만 아니라 시각적 알림을 위해 브라우저 Notification API를 사용합니다. 사용자 권한 승인이 필요합니다.
- [ ] **실행 계획:**
    *   `src/utils.js` (또는 `ui-renderer.js`): `requestNotificationPermission()` 함수 구현.
    *   `alarm-scheduler.js`: `startAlarm` 시점에 권한 요청.
    *   `ALARM` 메시지 수신 시 `new Notification(...)` 생성하여 시스템 알림 띄우기.
    *   `notification.onclick`: 클릭 시 `window.focus()`를 호출하여 브라우저 창 활성화.
- [ ] **검증:** 알림 발생 시 윈도우 우측 하단(또는 맥 우측 상단)에 보스 이름이 포함된 알림 배너가 뜨는지 확인.
- [ ] **커밋:** `git commit -m "feat(notification): OS 시스템 알림(Notification API) 연동"`
</details>

---

### **4단계: 최종 정리 및 테스트**

<details>
<summary><strong>4.1. 불필요한 코드 정리 및 전체 테스트</strong></summary>

- [ ] **사전 분석:** 기존 `setInterval` 관련 변수나 사용하지 않는 로직을 정리합니다.
- [ ] **실행 계획:** `alertTimerId` 등 더 이상 쓰지 않는 변수 삭제.
- [ ] **검증:**
    1.  PC에서 전체 화면 게임 실행 중 알림 수신 확인.
    2.  탭 전환/최소화 상태에서 알림 수신 확인.
    3.  브라우저 종료 시 알림이 확실히 안 오는지 확인.
- [ ] **커밋:** `git commit -m "chore: Web Worker 도입 완료 및 코드 정리"`
</details>
