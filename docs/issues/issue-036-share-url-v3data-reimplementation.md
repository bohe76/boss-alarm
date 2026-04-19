---
id: issue-036
title: "공유 URL 기능 v3data 포맷으로 재구현"
status: "진행 중"
priority: "High"
assignee: "Claude"
labels:
  - bug
  - v3.0
  - share
created_date: "2026-04-19"
resolved_date: ""
---

# Issue-036: 공유 URL 기능 v3data 포맷으로 재구현

## 1. 개요 (Overview)

스모크 테스트 과정에서 발견된 문제. `src/screens/share.js` 가 v3 전환 이후에도 여전히 **v2 텍스트 모드 기반 `?data=` 포맷**을 생성하고 있고, 텍스트 모드 제거(issue-033)로 생성 경로도 이미 깨진 상태다. 로드 경로도 v3에 맞춰 재구현되어야 한다.

## 2. 문제점 (Problem)

* **URL 생성 (깨짐):**
  * `src/screens/share.js:9` `DOM.schedulerBossListInput.value` — v3에서는 해당 DOM 요소가 존재하지 않아 `TypeError` 유발 또는 빈 문자열 공유
  * `src/screens/share.js:12` `longUrl = baseUrl?data=${encoded}` — v2 텍스트 포맷 그대로 URL에 실어보냄
* **URL 로드 (부분 제거):**
  * `src/app.js::loadInitialData` 의 `?data=` 처리 블록은 이미 issue-033 에서 제거됨 → 링크를 받아도 로드 불가
* **문서 주장과 불일치:**
  * CLAUDE.md "공유 URL은 v3data 포맷 (base64 JSON)" — 기획만 있고 구현 없음

## 3. 제안된 해결 방안 (Proposed Solution)

### 3.1 데이터 포맷
Base64(JSON) 한 덩어리를 `?v3data=` 쿼리 파라미터에 실는다.

```json
{
  "v": "3",
  "gameId": "odin-main",
  "schedules": [
    { "bossName": "파르바", "scheduledDate": "2026-04-19T15:11:00.000Z", "memo": "" }
  ]
}
```

* `v`: 포맷 버전. 향후 호환성 대비.
* `gameId`: 공유자가 사용하던 프리셋/커스텀 ID. 수신자가 동일한 보스 메타데이터를 기대한다는 신호.
* `schedules`: 각 보스의 앵커 시간. 48h 확장은 수신자 측 `_expandAndReconstruct` 가 수행한다.

### 3.2 구현 모듈
1. **`src/share-encoder.js` (신규)** — 순수 함수 2종과 단위 테스트
   * `encodeV3Data({ gameId, schedules }) → string`
   * `decodeV3Data(encoded) → { gameId, schedules } | null`
   * `TextEncoder` + `btoa`/`atob` 사용. UTF-8 + Base64 왕복 검증.

2. **`src/screens/share.js`**
   * DOM textarea 참조 제거
   * `BossDataManager.getBossSchedule(false)` + `DB.getSetting('lastSelectedGame')` 에서 현재 스케줄 수집
   * 수집한 데이터를 `encodeV3Data` 로 인코딩 → `?v3data=...` URL 생성 → 기존 단축 URL 흐름 유지

3. **`src/app.js::loadInitialData`**
   * `params.has('v3data')` 분기 추가
   * `decodeV3Data` 성공 시 `gameId` 확인 → `BossDataManager.setBossSchedule(...)` 또는 DB schedule 직접 삽입

### 3.3 테스트
* `test/share-encoder.test.js` 신규 — encode/decode 왕복, 잘못된 입력, UTF-8 한글 보스명
* 수동 스모크: 생성된 URL 을 새 탭에서 열었을 때 동일한 스케줄 복원

## 4. 검증 절차 (Verification)

1. 오딘 프리셋에서 파르바 한 개 입력 → 공유 화면에서 링크 복사
2. URL 디코딩: `?v3data=eyJ2I...` 부분이 base64 decodable, JSON 유효
3. `localStorage.clear()` 후 해당 URL 방문 → v3_schedules 에 동일한 파르바 항목 생성
4. 한글 보스명(`셀로비아`, `파르바` 등) 왕복 무결성
5. Vitest 17x+ 통과

## 5. 관련 파일

* `src/screens/share.js` (수정)
* `src/app.js` (URL 로드 경로 추가)
* `src/share-encoder.js` (신규)
* `test/share-encoder.test.js` (신규)
* `src/api-service.js` (getShortUrl 재사용 — 변경 없음 예상)
