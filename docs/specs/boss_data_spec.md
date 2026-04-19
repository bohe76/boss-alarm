# 보스 데이터 명세 (Boss Data Spec)

> v3.0 기준 — 실제 파일 분석 기반

---

## 1. 데이터 파일 위치

| 파일 | 역할 |
|---|---|
| `src/data/boss-presets.json` | 게임별 보스 메타데이터(이름, 주기) 정의 — 프리셋 원천 데이터 |
| `src/data/initial-default.json` | 최초 실행 시 자동 로드되는 기본 보스 스케줄 (오딘 기준) |
| `data/boss_lists.json` | 게임별 보스 이름 목록 (표시용 — 드롭다운 등에 사용) |
| `src/db.js` → `v3_bosses` | 런타임 DB: `boss-presets.json`에서 동기화된 보스 레코드 저장 |

---

## 2. `boss-presets.json` 스키마

### 2.1 전체 구조

```json
{
  "<gameId>": {
    "gameName": "string",
    "bossMetadata": {
      "<보스이름>": <interval: number>
    }
  }
}
```

### 2.2 필드 정의

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `<gameId>` | string (키) | 필수 | 게임 고유 ID. 영문 소문자 + 하이픈 형식 (예: `odin-main`, `odin-invasion`) |
| `gameName` | string | 필수 | 화면에 표시되는 게임 이름 (한국어) |
| `bossMetadata` | object | 필수 | 보스 이름을 키로, 젠 주기(분)를 값으로 갖는 딕셔너리 |
| `<보스이름>` | string (키) | — | 보스의 한국어 이름. 게임 내 고유해야 함 |
| `<interval>` | number | — | 젠 주기 (단위: 분). `0`이면 고정 시간 보스 (주기 없음) |

### 2.3 `interval` 값 의미

| 값 | 의미 |
|---|---|
| `0` | 고정 시간 보스 (주기 없음 — 사용자가 직접 시각 입력 필요) |
| `720` | 12시간 (12h) 보스 |
| `1440` | 24시간 (24h) 보스 |
| `2160` | 36시간 (36h) 보스 |
| `2880` | 48시간 (48h) 보스 |
| `3600` | 60시간 (60h) 보스 |
| `4320` | 72시간 (72h) 보스 |

---

## 3. 런타임 DB 보스 레코드 스키마 (`v3_bosses`)

`syncPresetsToDb()` 실행 시 `boss-presets.json`의 데이터가 아래 형식으로 DB에 저장된다.

```json
{
  "id": 1,
  "gameId": "odin-main",
  "name": "파르바",
  "interval": 720,
  "isInvasion": false
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | number | 자동 증가 PK (`v3_uid_counter` 기반) |
| `gameId` | string | FK → `v3_games.id` |
| `name` | string | 보스 이름 |
| `interval` | number | 젠 주기 (분), `0` = 고정 시간 |
| `isInvasion` | boolean | 침공 보스 여부 (현재 `boss-presets.json`에서 자동 감지 미사용 — 항상 `false`) |

---

## 4. 검증 규칙

| 규칙 | 세부 내용 |
|---|---|
| 보스 이름 고유성 | 동일 `gameId` 내에서 보스 이름은 고유해야 한다. 중복 시 `upsertBoss()`가 기존 레코드를 갱신(upsert)한다. |
| 주기 음수 금지 | `interval`은 0 이상의 정수여야 한다. 음수는 논리적 오류. |
| gameId 형식 | 영문 소문자 및 하이픈(`-`)만 허용. 예: `odin-main`, `lineage-m`. |
| gameName 필수 | `gameName` 필드가 없으면 `syncPresetsToDb()`가 DB에 게임 이름 없이 저장된다. |
| FK 무결성 | `v3_bosses.gameId`는 반드시 `v3_games.id`에 존재해야 한다. `DB.importAll()`이 FK 검증을 수행한다. |
| cascade 삭제 | `DB.deleteGame(gameId)` 호출 시 해당 게임의 보스와 스케줄이 모두 삭제된다. |

---

## 5. 현재 등록된 게임 목록

### `src/data/boss-presets.json` 기준

| gameId | gameName | 보스 수 | 고정 시간 보스(interval=0) |
|---|---|---|---|
| `odin-main` | 오딘 | **49개** | 3개 (니다닻, 알브닻, 무스펠닻) |
| `odin-invasion` | 오딘 (본섭, 침공) | **92개** | 6개 (닻 3개 + 침공 닻 3개) |

### `data/boss_lists.json` 기준 (표시용)

| 게임 이름 | 보스 수 |
|---|---|
| 오딘 | 51개 |
| 오딘(본섭,침공) | 94개 |

> `boss_lists.json`은 UI 드롭다운 표시 전용이며, 주기(interval) 정보는 포함하지 않는다. 실제 주기 데이터는 `boss-presets.json`을 참고한다.

---

## 6. `initial-default.json` 스키마

최초 실행 시 자동으로 로드되는 기본 보스 스케줄.

```json
{
  "contextId": "odin-main",
  "items": [
    { "time": "HH:MM", "name": "보스이름" }
  ]
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `contextId` | string | 게임 ID (현재 `odin-main` 고정) |
| `items` | array | 기본 보스 스케줄 목록 |
| `items[].time` | string | 젠 시각 (HH:MM 형식, 24시간제) |
| `items[].name` | string | 보스 이름 (`boss-presets.json`의 보스명과 일치해야 함) |

현재 `initial-default.json`에는 **38개** 오딘 보스 기본 스케줄이 정의되어 있다.

---

## 7. 신규 게임/보스 추가 절차

### 7.1 신규 게임 추가

1. `src/data/boss-presets.json`에 새 게임 항목 추가:

```json
{
  "new-game-id": {
    "gameName": "게임 표시 이름",
    "bossMetadata": {
      "보스이름1": 720,
      "보스이름2": 1440
    }
  }
}
```

2. (선택) `data/boss_lists.json`에 게임명 키와 보스 이름 배열 추가 (UI 드롭다운용)
3. 앱 재시작 시 `syncPresetsToDb()`가 자동으로 DB에 동기화함
4. `npm test` 통과 확인

### 7.2 기존 게임에 보스 추가

1. `src/data/boss-presets.json`의 해당 게임 `bossMetadata`에 항목 추가:

```json
"새보스이름": 2160
```

2. (선택) `data/boss_lists.json`의 해당 게임 배열에 보스 이름 추가
3. 앱 재시작 시 `syncPresetsToDb()` → `DB.upsertBoss()`로 자동 추가
4. `npm test` 통과 확인

### 7.3 보스 삭제

1. `boss-presets.json`에서 항목 제거
2. `syncPresetsToDb()` 내 `DB.deleteBoss()`가 cascade로 관련 스케줄도 삭제
3. 주의: 사용자 LocalStorage에 이미 저장된 해당 보스의 스케줄은 다음 DB 동기화 시 삭제됨

---

## 8. 데이터 무결성 유의 사항

### 8.1 `boss-presets.json`과 `boss_lists.json` 불일치

현재 두 파일은 **수동으로 동기화**되어 있으며, 자동 검증 없음. 보스 추가/삭제 시 두 파일 모두 업데이트 필요.

| 파일 | 용도 | 동기화 방법 |
|---|---|---|
| `src/data/boss-presets.json` | 런타임 DB 소스 (주기 포함) | 앱 시작 시 자동 동기화 |
| `data/boss_lists.json` | UI 드롭다운 표시용 | 수동 업데이트 필요 |

### 8.2 `isInvasion` 필드 자동 감지 미구현

현재 `syncPresetsToDb()`는 `boss-presets.json`에서 `isInvasion` 값이 `object` 타입일 때만 읽는다. 현재 프리셋에서 모든 값이 `number`이므로 `isInvasion`은 항상 `false`로 저장된다. 침공 보스를 명시적으로 구분하려면 아래 확장 스키마를 사용해야 한다 (현재 미구현):

```json
"침공 파르바": { "interval": 720, "isInvasion": true }
```

---

## 9. TODO

- [ ] `data/boss_lists.json`과 `src/data/boss-presets.json` 자동 동기화 검증 스크립트 작성
- [ ] `isInvasion` 필드 프리셋 명시적 지원 (현재 항상 `false`)
- [ ] 리니지M/리니지W 보스 데이터 추가 (PRD 참조 — 현재 오딘 게임만 등록됨)
- [ ] 보스 추가/삭제 시 `boss_lists.json` 자동 갱신 절차 문서화
