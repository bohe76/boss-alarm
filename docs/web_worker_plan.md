# Web Worker 도입 계획: PC 백그라운드 알림 개선

## 1. 개요 및 목표

### 1.1. 배경
*   **문제점:** 현재 `setInterval` 기반 알림 시스템은 브라우저가 백그라운드(최소화, 탭 전환) 상태일 때 브라우저의 배터리 절약 정책(Throttling)으로 인해 타이머가 지연되거나 멈추는 현상이 발생합니다.
*   **사용자 특성:** 주 사용자의 90% 이상이 PC 환경에서 게임을 즐기며, 브라우저를 완전히 종료했을 때는 알림을 받지 않기를 원합니다.
*   **기존 대안의 문제:** '푸시 알림(Push Notification)'은 모바일 백그라운드 지원에 강력하지만, 브라우저 종료 시에도 알림이 오는 특성이 사용자 경험(UX)을 해칠 수 있고 구현 복잡도가 높습니다.

### 1.2. 목표
*   **Web Worker 도입:** 메인 스레드와 분리된 **Web Worker**를 도입하여, 브라우저가 백그라운드 상태이거나 사용자가 전체 화면으로 게임 중일 때도 **정확한 시간에 알림**을 제공합니다.
*   **명확한 종료:** 사용자가 브라우저를 닫으면 Web Worker도 함께 종료되어, 원치 않는 알림이 발생하는 것을 원천 차단합니다.
*   **무중단 아키텍처:** 별도의 서버 구축 없이 클라이언트 코드 리팩토링만으로 기능을 구현합니다.

---

## 2. 기술 아키텍처 변경

### 2.1. 기존 방식 (Main Thread)
*   `app.js` -> `alarm-scheduler.js` (`setInterval`)
*   **문제:** 메인 스레드가 바쁘거나 백그라운드로 가면 `setInterval` 간격이 1초에서 1분 이상으로 늘어짐.

### 2.2. 변경 방식 (Web Worker)
*   `app.js` -> **`TimerWorker` (별도 스레드)**
*   **동작:**
    1.  **Worker:** 별도 스레드에서 방해받지 않고 1초마다(또는 정밀하게) 시간을 체크합니다.
    2.  **Message:** 알림 조건(5분 전, 정각 등)이 충족되면 메인 스레드로 **메시지(`postMessage`)**를 보냅니다.
    3.  **Main:** 메시지를 받으면 즉시 **소리(`speechSynthesis`)**를 재생하고 **시스템 알림(`Notification API`)**을 띄웁니다.

---

## 3. 상세 구현 계획

### 3.1. 파일 구조
*   `src/workers/timer-worker.js`: 타이머 로직이 담길 워커 파일 (신규 생성).
*   `src/alarm-scheduler.js`: 워커를 생성하고 통신하는 로직으로 변경 (리팩토링).

### 3.2. `timer-worker.js` (Worker Thread)
*   **역할:** "심장 박동(Heartbeat)" 역할.
*   **로직:**
    *   `setInterval`을 사용하여 1초마다 현재 시간(`new Date()`)을 체크합니다.
    *   단순히 "1초 지났다"는 신호(`tick`)만 메인 스레드에 보내거나,
    *   (더 나은 방법) 메인 스레드로부터 **"알림 스케줄 데이터"**를 미리 받아두고, 워커 내부에서 시간을 비교한 뒤 **"지금 울려!"**라는 구체적인 명령을 보냅니다.
    *   **선택:** 메인 스레드의 부하를 줄이기 위해 **워커가 스케줄 데이터를 관리하고 체크하는 방식**을 채택합니다.

### 3.3. `alarm-scheduler.js` (Main Thread)
*   **초기화:** `new Worker('src/workers/timer-worker.js', { type: 'module' })`로 워커 생성. (ES Module 지원)
*   **데이터 동기화:** `BossDataManager` 및 `LocalStorageManager`(고정 알림) 데이터가 변경될 때마다 워커에 `postMessage({ type: 'UPDATE_SCHEDULE', payload: { dynamic: ..., fixed: ... } })`로 최신 스케줄을 전송합니다.
*   **알림 수신:** `worker.onmessage` 이벤트를 통해 알림 요청을 받습니다.
    *   `data.type === 'ALARM'`: `speak()` 및 `showSystemNotification()` 실행.
    *   `data.type === 'TICK'`: (선택 사항) 대시보드 남은 시간 갱신용.

### 3.4. 시스템 알림 (OS Notification)
*   소리만으로는 전체 화면 게임 중에 놓칠 수 있으므로, 윈도우 우측 하단에 뜨는 **OS 시스템 알림**을 함께 사용합니다.
*   `Notification.requestPermission()`으로 권한 요청 로직 추가.
*   알림 클릭 시 브라우저 창 활성화(`window.focus()`).

---

## 4. 기대 효과

1.  **정확성:** 게임 중이거나 브라우저를 최소화해도 알림이 밀리지 않고 정확한 시간에 울립니다.
2.  **사용성:** 브라우저를 끄면 알림도 깔끔하게 꺼집니다. (No Zombie Alarms).
3.  **유지보수:** 서버, DB, API 키 관리가 필요 없는 순수 프론트엔드 기술로, 비용이 0원이며 배포가 간편합니다.

---

## 5. 실행 체크리스트

상세한 실행 계획과 체크리스트는 별도 문서로 관리합니다.

*   👉 **[Web Worker 도입 체크리스트 (web_worker_checklist.md)](web_worker_checklist.md)** 확인하기
