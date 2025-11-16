### 푸시 알림 시스템 구현 To-Do 리스트

#### **Phase 0: 사전 준비 및 환경 설정 [담당: 사용자]**
- [ ] **OneSignal 계정 생성:** 가입 후, 'Web Push' 앱을 생성하여 `APP ID`와 `REST API KEY`를 발급받습니다.
- [ ] **Vercel 계정 생성:** 가입 후, 현재 GitHub 저장소를 Vercel에 연결하여 프로젝트를 생성합니다.
- [ ] **Vercel 환경 변수 설정:** Vercel 프로젝트 설정에서, 위에서 발급받은 OneSignal의 `APP ID`와 `REST API KEY`를 환경 변수로 등록합니다. (이 정보는 서버 코드에서 안전하게 사용됩니다.)
- [ ] **Vercel KV 생성:** Vercel 대시보드에서 Key-Value 데이터베이스를 생성하고 프로젝트에 연결합니다. (스케줄 및 구독자 정보 저장용)

---

#### **Phase 1: 서버리스 백엔드 API 구축 [담당: Gemini]**
- [ ] **Vercel Cron Job 설정:** 1분마다 스케줄러 API를 실행하도록 `vercel.json` 설정 파일을 생성 및 구성합니다.
- [ ] **API 디렉터리 생성:** Vercel 규칙에 따라 프로젝트 루트에 `/api` 폴더를 생성합니다.
- [ ] **스케줄 관리 API 개발 (`/api/schedules.js`):**
    - [ ] `POST`: 새로운 스케줄을 생성하고, `scheduleId`와 `adminKey`를 반환하는 API.
    - [ ] `PUT`: 기존 스케줄을 `adminKey`로 인증하고 업데이트하는 API.
    - [ ] (데이터는 Vercel KV에 24시간 TTL로 저장)
- [ ] **구독 관리 API 개발 (`/api/subscriptions.js`):**
    - [ ] `POST`: 새로운 사용자 구독 정보(OneSignal Player ID)를 `scheduleId`와 연결하여 저장하는 API.
    *   [ ] `PUT`: 특정 보스에 대한 사용자별 음소거(Mute) 설정을 저장하는 API.
- [ ] **메인 스케줄러 개발 (`/api/scheduler.js`):**
    - [ ] Cron Job으로 매분 실행될 메인 함수를 개발합니다.
    - [ ] Vercel KV에서 모든 스케줄과 구독자 정보를 읽어옵니다.
    - [ ] 현재 시간에 맞는 알람을 찾아, 각 사용자의 음소거 설정을 확인한 뒤 OneSignal API로 푸시를 발송합니다.

---

#### **Phase 2: 클라이언트-서버 연동 로직 구현 [담당: Gemini]**
- [ ] **OneSignal SDK 연동:** `index.html` 파일에 OneSignal SDK 스크립트를 추가합니다.
- [ ] **API 서비스 확장 (`src/api-service.js`):** Vercel 백엔드 API(`/api/schedules`, `/api/subscriptions`)를 호출하는 함수들을 새로 추가합니다.
- [ ] **푸시 매니저 구현 (신규 `src/push-manager.js` 또는 `event-handlers.js`에 추가):**
    - [ ] OneSignal SDK를 초기화하고, 알림 권한을 요청하는 로직을 구현합니다.
    - [ ] 사용자가 권한을 허용하면, OneSignal로부터 `Player ID`를 받아와 저희 백엔드 API로 전송하여 서버에 등록하는 로직을 구현합니다.
- [ ] **알람 토글 로직 변경 (`src/event-handlers.js`):** 기존 ON/OFF 버튼을 처음 'ON'으로 켤 때, 위 푸시 매니저의 구독 절차를 실행하도록 변경합니다.

---

#### **Phase 3: UI/UX 개편 및 기능 연결 [담당: Gemini]**
- [ ] **UI 요소 추가 (`index.html`):** '보스 설정' 화면에 '스케줄 발행' 버튼을 추가합니다.
- [ ] **'발행' 기능 구현 (`src/event-handlers.js`):**
    - [ ] '발행' 버튼 클릭 시, URL의 `adminKey` 유무를 확인하여 '새로 만들기'와 '업데이트'를 구분하여 백엔드 API를 호출합니다.
    - [ ] API 응답으로 받은 '공유 링크'와 '관리자 링크'를 화면에 표시합니다.
- [ ] **앱 초기화 로직 변경 (`src/event-handlers.js`의 `initApp`):**
    - [ ] URL에 `scheduleId`가 있으면, `api-service.js`를 통해 서버에서 스케줄 데이터를 가져오도록 변경합니다.
    - [ ] 가져온 데이터로 '알림 설정' 화면을 그리도록 `ui-renderer.js`의 새 함수를 호출합니다.
- [ ] **'알림 설정' 화면 개편 (`src/ui-renderer.js`):**
    - [ ] 서버에서 받은 스케줄의 모든 보스 목록을 표시하는 `renderScheduleAlarms` 함수를 새로 구현합니다.
    - [ ] 각 보스 항목에 개인별 음소거(Mute) 토글 버튼과, 클릭 시 백엔드 API를 호출하는 이벤트 핸들러를 포함시킵니다.

---

#### **Phase 4: 기존 코드 정리 및 최종 테스트 [담당: Gemini]**
- [ ] **기존 알람 로직 정리:** 클라이언트 측의 `alarm-scheduler.js`는 '앱 활성화 시 음성 안내' 기능만 남기고, `setInterval`을 이용한 주기적 시간 확인 로직은 제거/비활성화합니다.
- [ ] **불필요한 코드 삭제:** 더 이상 사용하지 않는 TinyURL 관련 로직 및 UI 요소를 삭제합니다.
- [ ] **종합 테스트 및 문서 최신화:** 전체 워크플로우를 테스트하고, `README.md`, `feature_guide.txt` 등 모든 관련 문서를 최종 구현에 맞게 업데이트합니다.
