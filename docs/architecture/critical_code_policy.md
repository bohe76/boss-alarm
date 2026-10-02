# 핵심 코드 수정 정책 (Critical Code Modification Policy)

## 1. 절대 원칙

보호 영역 표(수정 금지 파일·함수), 수정 전 필수 절차, 금지 행위는 저장소 루트 `AGENTS.md`의 `Critical Code Policy` 섹션에만 둔다. 에이전트가 매 세션 읽는 파일이 그쪽이고, 같은 표를 두 곳에 두면 내용이 갈라지기 때문이다. 이 문서는 그 정책이 지키려는 SSOT 규칙을 설명한다.

## 2. SSOT 원칙 (절대 불변)

### 2.1. 데이터 흐름
```
[boss-presets.json] → syncPresetsToDb() → [DB: v3_games, v3_bosses]
[사용자 입력 (폼)] → DB.upsertSchedule() → [DB: v3_schedules] → BossDataManager → [UI]
[공유 URL #d= (v4)] → decodeShareData() → DB.replaceSchedulesByGameId() → [DB]
[공유 URL ?v3data= (v3 호환)] → decodeShareData() → DB.replaceSchedulesByGameId() → [DB]
```

### 2.2. 핵심 규칙
- **v3 DB 규칙**: `DB.save()` 실패(QuotaExceededError) 시 `false` 반환 처리 필수. `DB.importAll()` 호출 시 FK 검증 수행됨. `DB.subscribe()`는 unsubscribe 함수를 반환하므로 cleanup 시 반드시 호출할 것.
- **버전 데이터 표준화 (SSOT)**: `window.APP_VERSION` 값은 **숫자로만 관리**한다 (예: `"3.0.0"`). 출력 시 'v' 접두사는 UI 레이어에서 처리한다.
- **출력은 항상 DB/SSOT를 바탕으로**: 화면 로딩 시 분 단위 남은 시간에서 역계산하지 말고, `scheduledDate`를 직접 읽어 출력하여 1ms의 오차도 허용하지 않음.
- **공유 URL 포맷**: v4부터 `#d=<URL-safe base64>` fragment 방식을 정식 사용한다. v3의 `?v3data=` 파라미터는 영구 호환 수신을 유지한다. 발신은 `encodeV4Data`, 수신은 `decodeShareData`(v3/v4 자동 판별)를 사용한다.
- **단방향 누적 원칙**: 발신 포맷은 v4로 전환되어도 수신 디코더(`decodeV3Data`, `decodeShareData`)는 영구 보존한다. v3.0.x에서 발급된 링크는 항상 수신 가능해야 한다.
- **텍스트 모드 제거**: v3에서 텍스트 영역 직접 입력 방식(boss-parser.js, syncInputToText, syncTextToInput)은 완전히 제거되었다. 보스 데이터 입력은 폼 기반 단일 방식으로만 처리한다.
- **프리셋 DB 동기화 필수**: 앱 초기화 시 `loadBossSchedulerData()` 내에서 `syncPresetsToDb()`가 자동 호출된다. 프리셋 변경 시 DB cascade 정리(deleteBoss)가 수행된다.
- **입력은 DB 형식에 맞게 변환하여 업데이트**: 사용자가 입력을 마치는 시점에만 새로운 `scheduledDate`를 계산하여 DB에 반영.
- **과거 데이터 자동 정제 (GC)**: `_expandAndReconstruct` 로직은 `alerted_0min` 완료된 과거 스케줄을 제거하되 보스별 최소 1개를 보존한다. Future Anchor Keeper가 미래 인스턴스가 없으면 강제 생성한다.
- **시간 역전 감지**: 이전 보스보다 시간이 이르면 다음 날로 처리.
- **음수 시간 지원**: `-HH:MM` 형식의 과거 시간을 허용하고 정확한 과거 시점 계산.

## 3. 위반 시
- 해당 변경 즉시 롤백
- 원인 분석 및 이슈 등록
- 재발 방지 대책 수립
