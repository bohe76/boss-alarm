# 공유 (FRD)

## 메타
- **요구사항 ID**: FRD-SHA-001
- **버전**: v3.0.0
- **우선순위**: P1
- **상태**: 구현 완료
- **관련 코드**: `src/screens/share.js`, `src/share-encoder.js`, `src/api-service.js`, `src/app.js`
- **관련 PRD**: [PRD §공유](../prd/product_requirements.md#공유)

---

## 1. 개요

'공유' 화면은 사용자가 현재 애플리케이션에 설정된 보스 스케줄을 다른 사람과 쉽게 공유할 수 있도록 URL을 생성하고 제공하는 기능입니다. v3.0.0부터 DB 기반 데이터 직렬화와 `share-encoder.js`의 `encodeV3Data()`를 사용하며, URL 파라미터는 `?v3data=`를 사용합니다. TinyURL 서비스를 활용하여 단축 URL을 생성하고 클립보드에 자동 복사합니다.

v2에서 사용하던 `?data=` 파라미터 방식은 v3.0.0에서 폐기되었습니다.

---

## 2. 사용자 시나리오

- **시나리오 1**: 사용자가 '공유' 메뉴를 클릭하면 → 현재 보스 스케줄 기반 URL이 자동 생성되고 → 클립보드에 단축 URL이 복사된다.
- **시나리오 2**: TinyURL 서비스가 실패하면 → 원본 긴 URL(`?v3data=...`)이 클립보드에 복사되고 → 안내 메시지가 표시된다.
- **시나리오 3**: 수신 측이 공유 URL을 열면 → `?v3data=` 파라미터를 자동 감지하여 → 해당 게임의 스케줄이 DB에 반영된다.
- **시나리오 4**: 보스 스케줄이 없는 경우 → "공유 링크 생성 실패" 메시지가 표시된다.

---

## 3. 기능 요구사항 (FR)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| FR-SHA-001 | 화면 진입 즉시 현재 선택된 게임의 보스 스케줄을 기반으로 URL을 자동 생성한다 | P0 | ✅ |
| FR-SHA-002 | DB.getSetting('lastSelectedGame')으로 현재 gameId를 조회한다 | P0 | ✅ |
| FR-SHA-003 | DB.getSchedulesByGameId() 및 DB.getBossesByGameId()로 스케줄·보스 이름을 가져온다 | P0 | ✅ |
| FR-SHA-004 | FK가 끊긴 항목(보스 이름 없음)은 공유 대상에서 제외한다 | P0 | ✅ |
| FR-SHA-005 | encodeV3Data({ gameId, schedules })를 사용하여 JSON→UTF-8→base64로 직렬화한다 | P0 | ✅ |
| FR-SHA-006 | 생성된 base64 문자열을 ?v3data= 파라미터로 URL에 포함한다 | P0 | ✅ |
| FR-SHA-007 | api-service.js의 getShortUrl()을 통해 TinyURL로 단축 URL을 생성한다 | P0 | ✅ |
| FR-SHA-008 | TinyURL 실패 시 원본 긴 URL을 클립보드에 복사하고 안내 메시지를 표시한다 | P0 | ✅ |
| FR-SHA-009 | 수신 측에서 ?v3data= 파라미터를 감지하여 decodeV3Data()로 디코딩한다 | P0 | ✅ |
| FR-SHA-010 | 디코딩 성공 시 DB.replaceSchedulesByGameId()로 스케줄을 DB에 반영한다 | P0 | ✅ |
| FR-SHA-011 | payload의 v 필드가 '3'이 아니거나 파싱 오류 시 null을 반환하고 무시한다 | P0 | ✅ |
| FR-SHA-012 | 고정 알림은 공유 대상에 포함하지 않는다 | P0 | ✅ |
| FR-SHA-013 | 화면 진입 시 "공유 링크 생성 중" 메시지를 먼저 표시한다 | P1 | ✅ |

---

## 4. 수용 기준 (Acceptance Criteria)

- **AC-001**: Given 보스 스케줄이 등록된 상태 / When '공유' 화면 진입 / Then 자동으로 단축 URL이 생성되고 클립보드에 복사된다.
- **AC-002**: Given TinyURL API 호출 성공 / When 처리 완료 / Then "단축 URL이 클립보드에 복사되었습니다." 메시지가 표시된다.
- **AC-003**: Given TinyURL API 호출 실패 / When 오류 발생 / Then 원본 긴 URL이 클립보드에 복사되고 "URL 단축 실패" 메시지가 표시된다.
- **AC-004**: Given 공유 URL(?v3data=...)을 포함한 링크 접근 / When 앱 초기화 / Then decodeV3Data()로 디코딩하여 해당 게임 스케줄이 DB에 반영된다.
- **AC-005**: Given payload의 v 필드가 '3'이 아닌 값 / When decodeV3Data() 호출 / Then null을 반환하고 기존 데이터를 변경하지 않는다.
- **AC-006**: Given 선택된 게임 없음 / When '공유' 화면 진입 / Then "공유 링크 생성 실패" 오류 메시지가 표시된다.

---

## 5. 의존성

- **데이터**: `v3_schedules` (공유할 스케줄), `v3_bosses` (보스 이름 매핑), `v3_settings` (`lastSelectedGame`)
- **모듈**: `src/share-encoder.js`(`encodeV3Data`, `decodeV3Data`), `src/api-service.js`(`getShortUrl`), `src/app.js`(`loadInitialData`의 URL 파라미터 분기)
- **외부 서비스**: TinyURL API (URL 단축)
- **브라우저 API**: Clipboard API (`navigator.clipboard.writeText`)

---

## 6. 비기능 요구사항

- **보안**: base64 인코딩은 암호화가 아닌 직렬화 목적이며, 공유 URL에 민감 정보(고정 알림 등)는 포함되지 않는다.
- **하위 호환성**: v2의 `?data=` 파라미터는 v3.0.0에서 폐기되었다.
- **오류 처리**: 네트워크 오류, 선택 게임 없음, 파싱 오류 등 모든 실패 케이스에 사용자 친화적 메시지를 제공한다.

---

## 7. 미해결 이슈 / TODO

- [`issue-036`](../issues/issue-036-share-url-v3data-reimplementation.md): ✅ 해결 완료 (v3data 공유 URL 재구현)
- `v2` `?data=` 파라미터 레거시 디코딩 지원 종료 — 이전 버전 공유 링크 사용 불가 안내 UI 검토(TBD)

---

## 8. 동작 명세

### 8.1. 기능 접근
사용자는 좌측 사이드바 메뉴 또는 하단 내비게이션 바(모바일 환경)에서 '공유' 메뉴 항목을 클릭하여 '공유' 화면으로 이동합니다.

### 8.2. 짧은 URL 생성 및 클립보드 복사
- **자동 생성 및 복사:** '공유' 화면으로 이동하는 즉시, 사용자 개입 없이 현재 선택된 게임의 보스 스케줄을 기반으로 URL을 생성하고 자동으로 클립보드에 복사합니다.
- **원본 데이터:** `DB.getSetting('lastSelectedGame')`으로 현재 선택된 `gameId`를 조회한 뒤, `DB.getSchedulesByGameId(gameId)`로 스케줄 목록을, `DB.getBossesByGameId(gameId)`로 보스 이름 매핑을 가져옵니다. FK가 끊긴 항목(보스 이름 없음)은 제외됩니다. '고정 알림'은 공유 대상에 포함되지 않습니다.
- **데이터 인코딩:** `src/share-encoder.js`의 `encodeV3Data({ gameId, schedules })`를 사용합니다. 내부적으로 JSON → TextEncoder(UTF-8) → btoa(base64) 방식으로 직렬화하며, 버전 식별자 `v: '3'`이 payload에 포함됩니다.
- **URL 파라미터:** 생성된 base64 문자열은 `?v3data=` 파라미터로 전달됩니다. v2에서 사용하던 `?data=` 파라미터는 v3.0.0에서 폐기되었습니다.
- **TinyURL 서비스 사용:** 인코딩된 데이터를 포함하는 긴 URL(`?v3data=…`)은 `src/api-service.js`의 `getShortUrl()` 함수를 통해 TinyURL 서비스로 전송되어 단축 URL로 변환됩니다.
- **단축 실패 시 폴백:** TinyURL 서비스 실패 시 원본 긴 URL(`?v3data=…`)을 클립보드에 복사하고 안내 메시지를 표시합니다.

### 8.3. 공유 URL 디코딩 (수신 측)
- 앱 초기화 시 `app.js`의 `loadInitialData()`에서 URL 쿼리 파라미터를 확인합니다.
- `?v3data=` 파라미터가 있으면 `decodeV3Data(encoded)`를 호출합니다. payload의 `v` 필드가 `'3'`이 아니거나 파싱 오류 시 `null`을 반환하고 무시합니다.
- 디코딩 성공 시 `DB.replaceSchedulesByGameId(gameId, schedules)`를 호출하여 해당 게임의 스케줄 데이터를 DB에 반영합니다.

### 8.4. 사용자 피드백
- **생성 중 메시지:** 화면 진입 직후 "공유 링크 생성 중입니다. 잠시만 기다려 주세요..." 메시지가 표시됩니다.
- **성공 메시지:** 단축 URL 생성 및 클립보드 복사 성공 시 "단축 URL이 클립보드에 복사되었습니다." 메시지가 표시됩니다.
- **단축 실패 시:** "URL 단축 실패: {원본 URL} (원본 URL 복사됨)" 메시지가 표시되고 원본 URL이 클립보드에 복사됩니다.
- **오류 메시지:** 선택된 게임 없음, 기타 예외 등 공유 링크 생성 자체가 실패할 경우 "공유 링크 생성 실패: {오류 내용}" 메시지가 표시됩니다. 관련 오류 내용은 애플리케이션의 '로그'에도 기록됩니다.
