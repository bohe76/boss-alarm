# 비기능 요구사항 (NFR) — 보스 알리미 v3.0

본 문서는 보스 알리미 애플리케이션의 비기능 요구사항(Non-Functional Requirements)을 정의합니다. 정량 목표는 코드와 구조에서 측정 가능한 근거를 가질 때만 명시하며, 근거가 부족한 항목은 **TBD**로 표기합니다.

---

## 1. 성능 (Performance)

### 1.1. 초기 로드 시간

| 항목 | 목표 | 근거 |
|---|---|---|
| 대시보드 최초 렌더 완료 | **TBD** | 빌드 단계 없음(바닐라 JS). 네트워크 환경에 따라 변동이 크므로 현재 측정값 없음 |
| 스켈레톤 UI 표시 시작 | 즉시 (CSS `loading` 클래스) | `body.loading` 클래스로 스켈레톤을 선행 렌더링하고, 초기화 완료 후 제거 |
| 프리셋 JSON 병렬 로드 | 1회 `Promise.all` | `preset-loader.js`의 `loadPresets()`가 `boss-presets.json`, `initial-default.json`, `update-notice.json`을 동시 fetch |

### 1.2. 알람 정확도

| 항목 | 목표 | 근거 |
|---|---|---|
| 알람 트리거 오차 | **±1초 이내** | `timer-worker.js`가 1초 간격 `setInterval`로 동작. 메인 스레드 블로킹 영향 없음 |
| 자정 기준 48시간 재확장 | 다음 TICK 내 처리 | `checkAndUpdateSchedule()`이 매초 날짜 변경 여부를 감지하여 자동 실행 |

### 1.3. 메모리 및 저장소

| 항목 | 목표 / 현황 | 근거 |
|---|---|---|
| LocalStorage 한도 | **~5MB** (브라우저 공통) | `DB.save()`의 `QuotaExceededError` 핸들러에서 명시 |
| 스케줄 GC | 매 `_expandAndReconstruct()` 실행 시 | `alerted_0min` 완료 + 과거 레코드 자동 삭제, 보스당 최소 1개 보존 |
| 렌더링 인터벌 | 이벤트 기반 (인터벌 루프 없음) | v2.17.6 이후 `notifyUI` 구독 패턴으로 전환. 불필요한 메인 스레드 폴링 제거 |

---

## 2. 가용성 (Availability)

### 2.1. 오프라인 동작

| 항목 | 가능 여부 | 비고 |
|---|---|---|
| 보스 알람 (저장된 일정 기반) | 가능 | 모든 데이터가 LocalStorage에 저장됨 |
| 음성 알림 (`speechSynthesis`) | 가능 | 브라우저 내장 API |
| 시스템 알림 (`Notification`) | 가능 | 권한 획득 후 오프라인에서도 동작 |
| 프리셋 JSON 로드 (`boss-presets.json`) | 불가 | 서비스 워커(PWA 캐싱) 미구현. 오프라인 시 `fetch` 실패 |
| TinyURL 단축 URL 생성 | 불가 | 외부 API 호출 필요 |
| 공유 URL 생성 (긴 URL) | 가능 | `encodeV3Data()`는 순수 로컬 연산 |

### 2.2. 단일 사용자 모델

서버 없음, 다중 기기 동기화 없음. 단일 브라우저 프로필에서만 데이터가 유지됩니다.

---

## 3. 호환성 (Compatibility)

### 3.1. 지원 브라우저

| 브라우저 | 전체 기능 | PiP 위젯 제외 시 |
|---|---|---|
| Chrome 116+ | 완전 지원 | — |
| Edge 116+ | 완전 지원 | — |
| Firefox | 부분 지원 | Document PiP API 미지원 |
| Safari | 부분 지원 | Document PiP API 미지원, `speechSynthesis` 제한 |

**핵심 의존 API:** `documentPictureInPicture` (Chrome/Edge 116+ 전용).  
`pip-manager.js`에서 `documentPictureInPicture.requestWindow()` 직접 호출. 폴백 없음.

### 3.2. 모바일 환경

| 항목 | 현황 |
|---|---|
| 반응형 레이아웃 | 하단 탭 바 5개 메뉴 (모바일 전용 내비게이션) |
| PiP 위젯 | 모바일 브라우저에서 Document PiP 미지원 |
| 카카오톡 인앱 브라우저 | 자동 감지 후 외부 브라우저 리디렉션 (Android) / 수동 안내 (iOS) |

---

## 4. 접근성 (Accessibility)

현재 공식 접근성 기준이 정의되어 있지 않습니다.

**현황:** 기본 HTML 시맨틱 요소 사용 수준. 스크린 리더 대응, 키보드 내비게이션, ARIA 속성 등은 명세되지 않음.

**권장 기준 (향후 목표):** WCAG 2.1 AA 준수 (색상 대비 4.5:1 이상, 키보드 접근 가능, 포커스 표시 등) — **TBD**

---

## 5. 보안 (Security)

### 5.1. 데이터 경계

- 모든 사용자 데이터는 **브라우저 LocalStorage에만** 존재합니다.
- 외부 서버로 전송되는 데이터: 없음 (TinyURL API 호출 시 URL 문자열만 전달)
- 분석(Analytics): `trackEvent`, `trackPageView` 호출이 존재하나 개인식별정보(PII) 미포함

### 5.2. XSS 표면

`innerHTML` 사용처에서 XSS 가능성이 존재합니다. 상세 정책은 `critical_code_policy.md`에 위임합니다.

### 5.3. 공유 URL

`?v3data=` 파라미터는 base64(JSON) 형식입니다. `decodeV3Data()`는 버전 필드(`v === '3'`) 및 타입 검증을 수행하나, 삽입된 데이터는 DB에 직접 저장됩니다. 신뢰할 수 없는 URL 사용 시 보스 일정이 덮어쓰일 수 있습니다.

---

## 6. 테스트 가능성 (Testability)

| 항목 | 현황 |
|---|---|
| 테스트 프레임워크 | Vitest |
| 테스트 환경 | JSDOM (Node.js) |
| 테스트 베이스라인 | **132개 테스트** (시스템 아키텍처 문서 기준) |
| 테스트 대상 | `utils.js`, `calculator.js`, `crazy-calculator.js`, `data-managers.js`, `alarm-scheduler.js`, `screens/boss-scheduler.js` |
| 실행 명령 | `npm test` 또는 `node ./node_modules/vitest/dist/cli.js run` |
| 시간 모킹 | `vi.setSystemTime()`으로 결정적 시간 제어 |
| LocalStorage 모킹 | JSDOM의 내장 localStorage 구현 사용 |
| E2E 테스트 | 없음 — **TBD** |

---

## 7. 국제화 (Internationalization)

| 항목 | 현황 |
|---|---|
| 현재 언어 | 한국어 단일 (하드코딩) |
| 문자열 외부화 | 미구현 |
| 향후 영어 지원 | 검토 예정 — **TBD** |

---

## 8. 프라이버시 (Privacy)

| 항목 | 현황 |
|---|---|
| 데이터 저장 위치 | 브라우저 LocalStorage 전용 |
| 서버 전송 | 없음 |
| 개인식별정보(PII) 수집 | 없음 |
| 분석 데이터 | 화면 전환 이벤트, 기능 사용 이벤트 (익명) |
| 데이터 삭제 | 브라우저 캐시/사이트 데이터 삭제 또는 `DB.clear()` 호출 |

---

## 9. 확장성 (Scalability)

단일 사용자 PWA이므로 서버 측 확장성은 해당 없습니다.

| 항목 | 한계 | 비고 |
|---|---|---|
| 보스 수 | LocalStorage 5MB 한도 내 | 현재 수십 개 수준으로 한도에 근접하지 않음 |
| 스케줄 수 | 48시간 윈도우로 자동 관리 | GC로 과거 레코드 자동 정리 |
| 게임 수 | 이론적 무제한 (키 공간 한도 내) | — |
