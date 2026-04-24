---
id: issue-037
title: "공유 URL 길이 → GitHub Pages 414 URI Too Long 해결"
status: "resolved"
priority: "High"
assignee: "Claude"
labels:
  - bug
  - v3.0.2
  - share
created_date: "2026-04-24"
resolved_date: "2026-04-24"
fixed_in: "v3.0.2"
---

# Issue-037: 공유 URL 길이 → GitHub Pages 414 URI Too Long 해결

## 1. 개요 (Overview)

issue-036에서 구현한 `?v3data=` 쿼리 파라미터 기반 공유 URL이 보스 수가 많아질수록 URL이 길어져 GitHub Pages에서 **414 URI Too Long** 오류가 발생했다. v3.0.2에서 URL fragment(`#d=`) + v4 payload 포맷 전환으로 해결했다.

## 2. 증상 (Symptom)

- 보스 수가 많은 스케줄을 공유할 때 TinyURL 단축 실패 또는 GitHub Pages 접속 시 **HTTP 414 URI Too Long** 응답
- 단축 URL 없이 원본 URL을 직접 사용해도 동일 오류 발생
- 보스 수가 적은 경우(소규모 스케줄)에는 정상 동작

## 3. 진단 (Diagnosis)

### 3.1 원인 분석

| 항목 | 내용 |
|---|---|
| 포맷 | `?v3data=<base64(JSON)>` 쿼리 파라미터 |
| 문제 | 쿼리 파라미터는 HTTP 요청 헤더에 포함 → 서버(GitHub Pages CDN)의 URL 길이 제한(~4KB)에 걸림 |
| JSON 비효율 | v3 payload의 전체 키 이름(`bossName`, `scheduledDate`, `memo`) + ISO 8601 날짜 문자열로 인해 payload 크기가 큼 |
| base64 패딩 | 표준 base64는 `+`, `/`, `=` 문자 포함 → URL 인코딩 시 `%2B`, `%2F`, `%3D`로 팽창 |

### 3.2 URL fragment의 특성

HTTP fragment(`#` 이후 부분)는 **브라우저에서만 처리되며 서버로 전송되지 않는다.** GitHub Pages CDN의 URL 길이 제한을 완전히 우회할 수 있다.

## 4. 해결 방안 (Solution)

### 4.1 v4 payload 포맷 도입

```json
{
  "v": 4,
  "g": "<gameId>",
  "s": [
    { "n": "<bossName>", "d": <epoch초>, "m": "<memo>" }
  ]
}
```

- **키 단축**: `gameId`→`g`, `schedules`→`s`, `bossName`→`n`, `scheduledDate`→`d`, `memo`→`m`
- **날짜 압축**: ISO 8601 문자열 → Unix epoch 초(정수) — 예: `"2026-04-24T15:00:00.000Z"` → `1745506800`
- **URL-safe base64**: `+`→`-`, `/`→`_`, `=` 패딩 제거 → URL 인코딩 불필요

### 4.2 URL 구조 변경

| 구분 | 변경 전 (v3) | 변경 후 (v4) |
|---|---|---|
| 전달 방식 | `?v3data=<base64>` 쿼리 파라미터 | `#d=<URL-safe base64>` fragment |
| 서버 전송 여부 | O (414 오류 유발 가능) | X (브라우저 전용) |
| payload 포맷 | 전체 키 이름 + ISO 날짜 | 단축 키 + epoch 초 |

### 4.3 구현 상세

**신규/변경 함수 (`src/share-encoder.js`)**

- `encodeV4Data({ gameId, schedules })`: v4 payload 생성 → `JSON.stringify` → `TextEncoder` UTF-8 → URL-safe base64
- `decodeShareData(encoded)`: `payload.v === 4`이면 v4 경로 처리, 그 외 `decodeV3Data()`에 위임 (v3/v4 자동 판별 통합 디코더)
- `decodeV3Data(encoded)`: v3 전용 디코더. **영구 보존** — v3 공유 링크 수신 호환성 유지

**`src/screens/share.js` 변경**

- `encodeV3Data` → `encodeV4Data` 교체
- URL 생성: `baseUrl?v3data=...` → `baseUrl#d=<encoded>`
- 길이 가드: 인코딩 결과 4000자 초과 시 토스트 표시 후 중단

**`src/app.js` `loadInitialData` 변경**

- `window.location.hash` 우선 감지 (`#d=` fragment)
- hash 없을 때 `?v3data=` 쿼리 파라미터 fallback

### 4.4 하위 호환성

v3.0.0~v3.0.1에서 발급된 `?v3data=` 링크는 `decodeShareData()` → `decodeV3Data()` 경로로 영구 수신 지원. **단방향 누적 원칙**: 발신만 v4로 전환, 수신 디코더(v3/v4 모두)는 영구 보존.

## 5. 회귀 테스트 (Regression Tests)

1. v4 URL(`#d=...`) 접속 → 보스 목록 자동 로드 확인
2. v3 URL(`?v3data=...`) 접속 → v3 호환 fallback으로 동일하게 로드 확인
3. 한글 보스명(`파르바`, `셀로비아`) 포함 URL 왕복 무결성 확인
4. TinyURL 단축 후 fragment 보존 여부 확인
5. 4000자 초과 스케줄 → 길이 가드 토스트 표시 확인
6. `npm test` — `test/share-encoder.test.js` 전체 통과

## 6. 미해결 백로그 (Backlog)

- **TinyURL fragment 보존 보장**: TinyURL이 fragment를 유지하는 것을 검증 완료했으나, 다른 단축 URL 서비스는 미검증
- **4000자 초과 시 대안**: 길이 초과 시 현재는 토스트만 표시. 추후 선택적 보스 제외 또는 날짜 범위 필터 기능 고려 가능

## 7. 관련 파일

- `src/share-encoder.js` — `encodeV4Data`, `decodeShareData`, `decodeV3Data(영구보존)` 추가
- `src/screens/share.js` — v4 인코딩 + `#d=` fragment URL 생성
- `src/app.js` — hash 우선 + query fallback 수신 로직
- `test/share-encoder.test.js` — v4 인코딩/디코딩 + v3 호환 테스트
- `docs/issues/issue-036-share-url-v3data-reimplementation.md` — 선행 이슈
