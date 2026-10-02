# 공유 (FRD)

## 메타
- **요구사항 ID**: FRD-SHA-001
- **버전**: v3.0.2
- **우선순위**: P1
- **상태**: 구현 완료
- **관련 코드**: `src/screens/share.js`, `src/share-encoder.js`, `src/api-service.js`, `src/app.js`
- **관련 PRD**: [PRD §공유](../prd/product_requirements.md#공유)

---

## 1. 개요

'공유' 화면은 사용자가 현재 애플리케이션에 설정된 보스 스케줄을 다른 사람과 쉽게 공유할 수 있도록 URL을 생성하고 제공하는 기능입니다. v3.0.2부터 `share-encoder.js`의 `encodeV4Data()`를 사용하며, URL fragment `#d=<URL-safe base64>`를 정식 포맷으로 사용합니다. da.gd 서비스를 활용하여 단축 URL을 생성하고 클립보드에 자동 복사합니다.

v3.0.0~v3.0.1에서 사용하던 `?v3data=` 파라미터는 수신 호환을 위해 영구 지원됩니다. v2에서 사용하던 `?data=` 파라미터 방식은 v3.0.0에서 폐기되었습니다.

---

## 2. 사용자 시나리오

- **시나리오 1**: 사용자가 '공유' 메뉴를 클릭하면 → 현재 보스 스케줄 기반 v4 URL(`#d=...`)이 자동 생성되고 → 클립보드에 단축 URL이 복사된다.
- **시나리오 2**: da.gd 서비스가 실패하면 → 원본 긴 URL(`#d=...`)이 클립보드에 복사되고 → 안내 메시지가 표시된다. 단, 원본 URL이 4000자를 초과하면 길이 가드 토스트가 표시된다.
- **시나리오 3 (v4 수신)**: 수신 측이 `#d=` fragment URL을 열면 → hash를 자동 감지하여 → `decodeShareData()`로 디코딩 후 해당 게임의 스케줄이 DB에 반영된다.
- **시나리오 4 (v3 호환 수신)**: 수신 측이 구형 `?v3data=` URL을 열면 → query 파라미터를 fallback 감지하여 → 동일하게 스케줄이 DB에 반영된다.
- **시나리오 5**: 보스 스케줄이 없는 경우 → "공유 링크 생성 실패" 메시지가 표시된다.
- **시나리오 6 (커스텀 목록 공유)**: 커스텀 보스 목록을 선택한 상태로 공유하면 → 링크에 목록의 보스 이름과 젠 주기가 함께 실리고 → 수신 측에 같은 커스텀 목록이 만들어져 스케줄이 반영된다.
- **시나리오 7 (커스텀 목록 이름 충돌)**: 수신 측에 같은 이름의 커스텀 목록이 이미 있으면 → 보스 구성이 같을 때는 그 목록의 시간을 갱신하고 → 구성이 다를 때는 `이름 (2)`처럼 다른 이름으로 만들어 기존 목록을 보존한다.

---

## 3. 기능 요구사항 (FR)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| FR-SHA-001 | 화면 진입 즉시 현재 선택된 게임의 보스 스케줄을 기반으로 URL을 자동 생성한다 | P0 | ✅ |
| FR-SHA-002 | DB.getSetting('lastSelectedGame')으로 현재 gameId를 조회한다 | P0 | ✅ |
| FR-SHA-003 | DB.getSchedulesByGameId() 및 DB.getBossesByGameId()로 스케줄·보스 이름을 가져온다 | P0 | ✅ |
| FR-SHA-004 | FK가 끊긴 항목(보스 이름 없음)은 공유 대상에서 제외한다 | P0 | ✅ |
| FR-SHA-005 | encodeV4Data({ gameId, schedules })를 사용하여 JSON→UTF-8→URL-safe base64로 직렬화한다 (키 단축 + epoch 초) | P0 | ✅ |
| FR-SHA-006 | 생성된 URL-safe base64 문자열을 #d= fragment로 URL에 포함한다 | P0 | ✅ |
| FR-SHA-007 | api-service.js의 getShortUrl()을 통해 da.gd로 단축 URL을 생성한다 | P0 | ✅ |
| FR-SHA-008 | da.gd 실패 시 원본 긴 URL을 클립보드에 복사하고 안내 메시지를 표시한다. 원본 URL이 4000자 초과 시 길이 가드 토스트를 표시한다 | P0 | ✅ |
| FR-SHA-009 | 수신 측에서 #d= fragment를 우선 감지하고, 없으면 ?v3data= 파라미터를 fallback으로 감지하여 decodeShareData()로 디코딩한다 | P0 | ✅ |
| FR-SHA-010 | 디코딩 성공 시 DB.replaceSchedulesByGameId()로 스케줄을 DB에 반영한다 | P0 | ✅ |
| FR-SHA-011 | payload의 v 필드가 지원하지 않는 값이거나 파싱 오류 시 null을 반환하고 무시한다 | P0 | ✅ |
| FR-SHA-012 | 고정 알림은 공유 대상에 포함하지 않는다 | P0 | ✅ |
| FR-SHA-013 | 화면 진입 시 "공유 링크 생성 중" 메시지를 먼저 표시한다 | P1 | ✅ |
| FR-SHA-014 | 선택된 목록이 커스텀 목록이면 `getSharedBossDefinitions()`로 목록 전체의 보스 이름과 젠 주기를 payload의 `b`에 싣는다. 프리셋 공유에는 `b`를 넣지 않는다 | P0 | ✅ |
| FR-SHA-015 | 수신 측은 payload에 `b`가 있으면 `importSharedCustomList()`로 커스텀 목록과 보스(젠 주기 포함)를 만든 뒤 스케줄을 반영한다 | P0 | ✅ |
| FR-SHA-016 | 수신 측에 같은 이름의 커스텀 목록이 있으면 보스 구성이 같을 때 그 목록을 재사용하고, 다르거나 프리셋 이름과 겹치면 `이름 (2)`, `이름 (3)` 순으로 다른 이름을 쓴다 | P0 | ✅ |
| FR-SHA-017 | `b`의 목록·보스 이름이 커스텀 목록 규칙(허용 문자, 50자)에 어긋나면 목록을 만들지 않고 로드를 건너뛴다 | P0 | ✅ |

---

## 4. 수용 기준 (Acceptance Criteria)

- **AC-001**: Given 보스 스케줄이 등록된 상태 / When '공유' 화면 진입 / Then 자동으로 v4 포맷 단축 URL이 생성되고 클립보드에 복사된다.
- **AC-002**: Given da.gd API 호출 성공 / When 처리 완료 / Then "단축 URL이 클립보드에 복사되었습니다." 메시지가 표시된다.
- **AC-003**: Given da.gd API 호출 실패 / When 오류 발생 / Then 원본 긴 URL(`#d=...`)이 클립보드에 복사되고 "URL 단축 실패" 메시지가 표시된다.
- **AC-004**: Given v4 공유 URL(`#d=...`)을 포함한 링크 접근 / When 앱 초기화 / Then decodeShareData()로 디코딩하여 해당 게임 스케줄이 DB에 반영된다.
- **AC-004b**: Given v3 호환 URL(`?v3data=...`)을 포함한 링크 접근 / When 앱 초기화 / Then decodeShareData()로 디코딩하여 동일하게 스케줄이 DB에 반영된다.
- **AC-005**: Given 지원하지 않는 payload 버전 또는 파싱 오류 / When decodeShareData() 호출 / Then null을 반환하고 기존 데이터를 변경하지 않는다.
- **AC-006**: Given 선택된 게임 없음 / When '공유' 화면 진입 / Then "공유 링크 생성 실패" 오류 메시지가 표시된다.
- **AC-007**: Given 커스텀 목록을 공유한 링크 / When 그 목록이 없는 브라우저에서 접근 / Then 같은 이름의 커스텀 목록이 보스·젠 주기와 함께 만들어지고, 그 목록이 선택된 상태로 스케줄이 표시된다.
- **AC-008**: Given 수신 측에 같은 이름·다른 보스 구성의 커스텀 목록 / When 공유 링크 접근 / Then 기존 목록과 그 스케줄은 그대로이고 공유받은 목록은 `이름 (2)`로 만들어진다.
- **AC-009**: Given 같은 커스텀 공유 링크를 다시 열거나 같은 구성의 새 링크를 받음 / When 앱 초기화 / Then 목록이 추가로 생기지 않고 기존 목록의 스케줄이 갱신된다.
- **AC-010**: Given 프리셋 공유 / When 링크 생성 / Then payload에 `b`가 없고 URL이 이전 버전과 동일하다.

---

## 5. 의존성

- **데이터**: `v3_schedules` (공유할 스케줄), `v3_bosses` (보스 이름 매핑), `v3_settings` (`lastSelectedGame`)
- **모듈**: `src/share-encoder.js`(`encodeV4Data`, `decodeShareData`, `decodeV3Data`), `src/share-custom-list.js`(`getSharedBossDefinitions`, `importSharedCustomList`), `src/api-service.js`(`getShortUrl`), `src/app.js`(`loadInitialData`의 hash 우선 + query fallback 분기)
- **외부 서비스**: da.gd API (URL 단축)
- **브라우저 API**: Clipboard API (`navigator.clipboard.writeText`)

---

## 6. 비기능 요구사항

- **보안**: base64 인코딩은 암호화가 아닌 직렬화 목적이며, 공유 URL에 민감 정보(고정 알림 등)는 포함되지 않는다.
- **하위 호환성**: v2의 `?data=` 파라미터는 v3.0.0에서 폐기되었다. v3.0.0~v3.0.1의 `?v3data=` 파라미터는 v3.0.2부터 영구 호환 수신이 유지된다.
- **URL 길이**: fragment(`#d=`)는 서버로 전송되지 않으므로 GitHub Pages 414 오류가 발생하지 않는다. 원본 URL 4000자 초과 시 사용자에게 안내 토스트를 표시한다.
- **오류 처리**: 네트워크 오류, 선택 게임 없음, 파싱 오류 등 모든 실패 케이스에 사용자 친화적 메시지를 제공한다.

---

## 7. 미해결 이슈 / TODO

- [`issue-036`](../issues/issue-036-share-url-v3data-reimplementation.md): ✅ 해결 완료 (v3data 공유 URL 재구현)
- [`issue-037`](../issues/issue-037-share-url-length-414.md): ✅ 해결 완료 (v4 포맷 + fragment 전환으로 414 해결)
- [`issue-038`](../issues/issue-038-custom-list-share-not-restored.md): 커스텀 목록 공유 시 수신 측에 목록이 나타나지 않던 문제 (v4 선택 필드 `b` 추가)
- `v2` `?data=` 파라미터 레거시 디코딩 지원 종료 — 이전 버전 공유 링크 사용 불가 안내 UI 검토(TBD)
- `b`가 없는 옛 커스텀 목록 링크는 젠 주기 정보가 없어 수신 측에서 건너뛴다 (기존 동작 유지)

---

## 8. 동작 명세

### 8.1. 기능 접근
사용자는 좌측 사이드바 메뉴 또는 하단 내비게이션 바(모바일 환경)에서 '공유' 메뉴 항목을 클릭하여 '공유' 화면으로 이동합니다.

### 8.2. 짧은 URL 생성 및 클립보드 복사
- **자동 생성 및 복사:** '공유' 화면으로 이동하는 즉시, 사용자 개입 없이 현재 선택된 게임의 보스 스케줄을 기반으로 URL을 생성하고 자동으로 클립보드에 복사합니다.
- **원본 데이터:** `DB.getSetting('lastSelectedGame')`으로 현재 선택된 `gameId`를 조회한 뒤, `DB.getSchedulesByGameId(gameId)`로 스케줄 목록을, `DB.getBossesByGameId(gameId)`로 보스 이름 매핑을 가져옵니다. FK가 끊긴 항목(보스 이름 없음)은 제외됩니다. '고정 알림'은 공유 대상에 포함되지 않습니다.
- **데이터 인코딩:** `src/share-encoder.js`의 `encodeV4Data({ gameId, schedules, bosses })`를 사용합니다. 내부적으로 JSON → TextEncoder(UTF-8) → URL-safe base64 방식으로 직렬화하며, 버전 식별자 `v: 4`, 단축 키(`g`, `s`, `n`, `d`, `m`), epoch 초 시간이 payload에 포함됩니다.
- **커스텀 목록 정의:** 선택된 목록이 커스텀 목록이면 `src/share-custom-list.js`의 `getSharedBossDefinitions(gameId)`가 목록의 보스 이름을 목록 순서대로, DB의 젠 주기(분)와 함께 반환하고, 이것이 payload의 선택 필드 `b: [{ n, i }]`에 실립니다. 시간을 입력하지 않은 보스도 포함하며 그 주기는 0입니다. 프리셋이면 `null`이 반환되어 `b` 키 자체가 없습니다. 버전을 올리지 않고 v4에 선택 필드로 추가한 이유는, 이전 버전 앱이 `b`를 무시하고 기존대로 동작하게 하기 위해서입니다.
- **URL 구조:** 생성된 URL-safe base64 문자열은 `#d=` fragment로 전달됩니다. fragment는 서버로 전송되지 않아 GitHub Pages 414 URI Too Long 오류를 원천 회피합니다. v2의 `?data=`, v3.0.0~v3.0.1의 `?v3data=` 파라미터 발신은 v3.0.2부터 폐기됩니다.
- **da.gd 서비스 사용:** 인코딩된 데이터를 포함하는 긴 URL(`#d=…`)은 `src/api-service.js`의 `getShortUrl()` 함수를 통해 da.gd 서비스로 전송되어 단축 URL로 변환됩니다. 익명 POST `https://da.gd/s`에 `URLSearchParams({ url: longUrl, text: '1' })`를 전달하며 인증 정보는 보내지 않습니다. 10초 타임아웃과 HTTP 200 / HTTPS da.gd 링크 검증을 적용합니다. 새 링크에는 da.gd의 최근 생성 안내 페이지가 표시될 수 있습니다.
- **단축 실패 시 폴백:** da.gd 서비스 실패 시 원본 긴 URL(`#d=…`)을 클립보드에 복사하고 안내 메시지를 표시합니다. 원본 URL이 4000자를 초과하면 길이 가드 토스트를 추가로 표시합니다.

### 8.3. 공유 URL 디코딩 (수신 측)
- 앱 초기화 시 `app.js`의 `loadInitialData()`에서 URL을 확인합니다. **hash 우선 → query fallback** 순서로 처리합니다.
- **v4 수신 (hash):** `location.hash`에 `#d=`가 있으면 `decodeShareData(encoded)`를 호출합니다.
- **v3 호환 수신 (query):** hash가 없고 `?v3data=` 파라미터가 있으면 동일하게 `decodeShareData(encoded)`를 호출합니다. `decodeShareData()`는 내부적으로 v3/v4를 자동 판별합니다.
- 파싱 오류 또는 지원하지 않는 버전 시 `null`을 반환하고 무시합니다.
- 디코딩 성공 시 `DB.replaceSchedulesByGameId(gameId, schedules)`를 호출하여 해당 게임의 스케줄 데이터를 DB에 반영합니다.
- **커스텀 목록 수신:** payload에 `bosses`(`b`)가 있으면 스케줄 반영 전에 `importSharedCustomList(gameId, bosses)`를 호출합니다. 이 함수는 실제로 적재할 목록 이름을 반환하며, 이후 경로(스케줄 반영, `lastSelectedGame` 전환, Draft 정리, hash 정리)는 그 이름으로 프리셋과 동일하게 진행됩니다.
  - 같은 이름의 목록이 없으면 `CustomListManager.addCustomList()`로 새로 만들고 `DB.upsertBoss()`로 보스와 젠 주기를 등록합니다.
  - 같은 이름의 목록이 있고 보스 구성(이름 집합)이 같으면 그 목록을 재사용합니다. 젠 주기는 공유된 값이 0보다 클 때만 덮어씁니다.
  - 구성이 다르거나, 이름이 프리셋 ID·프리셋 게임 이름과 겹치거나, 자가 치유 슬롯 이름(`커스텀 보스_001`)이면 `이름 (2)`, `이름 (3)` 순으로 다른 이름을 씁니다. 50자 제한에 맞게 앞부분을 자릅니다.
  - 목록 이름이나 보스 이름이 커스텀 목록 규칙에 어긋나면 `null`을 반환하고, 로드는 건너뜁니다(hash는 남습니다).
  - 새로 만든 목록에는 공유된 젠 주기를 그대로 씁니다. 재사용하는 목록은 공유된 값이 0이면 수신자의 주기를 유지합니다.
  - **확장량 상한:** 받은 젠 주기와 스케줄 시각으로 48시간 확장이 만들어 낼 건수를 추정해, 합계가 5000건을 넘으면 건수가 큰 보스부터 주기를 0(확장 안 함)으로 낮춥니다. 짧은 주기와 먼 날짜를 넣은 조작 링크가 스케줄을 수십만 건 만들어 앱을 멈추게 하는 것을 막기 위한 것이며, 받은 스케줄 자체는 그대로 적재됩니다.
  - **Draft 처리:** 프리셋 수신은 Draft를 비우지만(스케줄러 화면이 DB에서 다시 만듦), 커스텀 목록 수신은 `BossDataManager.syncDraftWithMain()`으로 받은 스케줄을 Draft에 채웁니다. 스케줄러 화면이 커스텀 목록의 빈 Draft를 DB에서 복원하지 않기 때문입니다.
  - `b`가 비어 있거나 유효한 항목이 하나도 없으면 커스텀 목록 공유로 취급하지 않고 기존 경로로 처리합니다.
- `bosses`가 없는데 `gameId`가 수신 측 DB에 없는 경우(옛 커스텀 목록 링크 등)는 로그만 남기고 건너뜁니다.

### 8.4. 사용자 피드백
- **생성 중 메시지:** 화면 진입 직후 "공유 링크 생성 중입니다. 잠시만 기다려 주세요..." 메시지가 표시됩니다.
- **성공 메시지:** 단축 URL 생성 및 클립보드 복사 성공 시 "단축 URL이 클립보드에 복사되었습니다." 메시지가 표시됩니다.
- **단축 실패 시:** "URL 단축 실패: {원본 URL} (원본 URL 복사됨)" 메시지가 표시되고 원본 URL이 클립보드에 복사됩니다.
- **오류 메시지:** 선택된 게임 없음, 기타 예외 등 공유 링크 생성 자체가 실패할 경우 "공유 링크 생성 실패: {오류 내용}" 메시지가 표시됩니다. 관련 오류 내용은 애플리케이션의 '로그'에도 기록됩니다.

- 클립보드 접근 실패 시 생성된 링크(단축 실패 시 원본 링크)를 화면에 표시하여 직접 복사할 수 있습니다. 화면 이탈 또는 재진입으로 무효화된 응답은 복사/메시지 갱신을 하지 않습니다.
