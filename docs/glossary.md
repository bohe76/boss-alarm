# 용어 사전 (Glossary)

> 보스 알리미 프로젝트 도메인 용어 정의

---

## 게임 도메인

### 보스 (Boss)
특정 시간에 등장하는 게임 내 몬스터. 보스 알리미의 핵심 추적 대상이다.  
출현 위치: `src/db.js` (`v3_bosses` 테이블), `src/data/boss-presets.json`  
관련 용어: [젠](#젠-spawn), [보스 주기](#보스-주기)

### 젠 (Spawn)
보스가 게임 내에 등장하는 것. "젠 타임"은 보스 등장 예정 시각을 의미한다.  
출현 위치: `src/calculator.js`, `src/ui-renderer.js` (젠 시각 표시)  
관련 용어: [보스 주기](#보스-주기), [Future Anchor Keeper](#future-anchor-keeper)

### 보스 주기 (Boss Interval)
보스가 한 번 등장한 후 다음에 등장할 때까지의 시간 간격. 단위: 분(minutes).  
`boss-presets.json`에 보스별로 정의되며, `0`은 고정 시간 보스(주기 없음)를 의미한다.  
출현 위치: `src/data/boss-presets.json`, `src/db.js` (`v3_bosses.interval`)  
관련 용어: [24h/36h/48h 보스](#24h36h48h-보스)

### 24h/36h/48h 보스
보스 주기가 각각 1440분(24시간), 2160분(36시간), 2880분(48시간)인 보스 그룹.  
48시간 보스는 젠 로직 특수 처리가 필요하며, `_expandAndReconstruct()`에서 별도 처리된다.  
출현 위치: `src/data-managers.js` (`_expandAndReconstruct`)  
관련 용어: [보스 주기](#보스-주기), [Future Anchor Keeper](#future-anchor-keeper)

### 침공 (Invasion)
오딘 게임의 특수 보스 유형. 일반 보스와 달리 침공 전용 목록으로 분리 관리된다.  
`boss-presets.json`의 `odin-invasion` 게임 ID에서 관리되며, 보스 이름 앞에 "침공 " 접두어가 붙는다.  
출현 위치: `src/data/boss-presets.json` (`odin-invasion`), `src/db.js` (`isInvasion` 필드)  
관련 용어: [고정 보스](#고정-보스)

### 고정 보스 (Fixed Boss / 고정 알림)
젠 주기가 없거나(`interval: 0`) 사용자가 특정 시각에 고정적으로 등록한 알림.  
시간표에서 일반 보스 스케줄과 병합(`_expandFixedAlarmsInRange()`)되어 표시된다.  
출현 위치: `src/data-managers.js` (`LocalStorageManager.DEFAULT_FIXED_ALARMS`), `src/ui-renderer.js`  
관련 용어: [커스텀 보스](#커스텀-보스), [Draft](#draft)

### 커스텀 보스 (Custom Boss)
사용자가 직접 추가한 게임 또는 보스 목록. 프리셋에 없는 게임/보스를 추가할 때 사용한다.  
출현 위치: `src/custom-list-manager.js`, `src/db.js` (`v3_games.type = 'custom'`)  
관련 용어: [고정 보스](#고정-보스), [SSOT](#ssot-single-source-of-truth)

---

## 알람 도메인

### 알람 ON/OFF (Alarm Running State)
전체 알람 시스템의 활성화 여부. LocalStorage에 `alarmRunningState`로 저장된다.  
출현 위치: `src/data-managers.js` (`LocalStorageManager`), `src/alarm-scheduler.js`  
관련 용어: [음소거](#음소거-mute)

### 5분/1분/0분 알림
보스 젠 예정 5분 전, 1분 전, 정각(0분)에 각각 트리거되는 알림 단계.  
DB 스케줄에 `alerted_5min`, `alerted_1min`, `alerted_0min` 플래그로 기록된다.  
출현 위치: `src/db.js` (`v3_schedules`), `src/alarm-scheduler.js`, `src/data-managers.js`  
관련 용어: [GC](#gc-가비지-컬렉션)

### 음소거 (Mute)
알람 소리를 끄는 기능. 음소거 해제 시 이전 볼륨으로 복원된다.  
LocalStorage에 `muteState`, `preMuteVolume`으로 저장된다.  
출현 위치: `src/data-managers.js`, `src/ui-renderer.js` (음소거 아이콘 토글)  
관련 용어: [음량](#음량-volume)

### 음량 (Volume)
알람 음성 볼륨 수준. 0.0~1.0 범위이며 기본값은 1.0(최대).  
LocalStorage에 `volume`으로 저장된다.  
출현 위치: `src/data-managers.js`, `src/speech.js`  
관련 용어: [음소거](#음소거-mute)

### PiP (Picture-in-Picture)
Document Picture-in-Picture API를 활용하여 다음 보스 정보를 브라우저 밖 미니 창으로 띄우는 기능.  
Chrome/Edge에서만 지원되며, 보스 수에 따라 창 높이가 동적으로 조절된다.  
출현 위치: `src/pip-manager.js`, `src/pip-content.html`  
관련 용어: [다음 보스](#보스-boss)

---

## 데이터 도메인

### SSOT (Single Source of Truth)
단일 진실 원천. 보스 알리미에서는 `src/db.js`의 4-테이블 정규화 DB가 SSOT 역할을 한다.  
v3.0.0 이전에는 LocalStorage 배열 직접 관리였으나, v3.0.0에서 DB 아키텍처로 전환되었다.  
출현 위치: `src/db.js`, `docs/architecture/system_architecture.md`  
관련 용어: [4-테이블 DB](#4-테이블-db)

### Draft
보스 스케줄러 화면에서 사용자가 입력 중인 미확정 스케줄. `commitDraft()` 호출 전까지 DB에 반영되지 않는다.  
LocalStorage 키: `v3_draft_<gameId>`  
출현 위치: `src/data-managers.js` (`loadDraftFromLs`, `saveDraftToLs`)  
관련 용어: [commitDraft](#commitdraft)

### commitDraft
Draft 상태의 보스 스케줄을 DB에 최종 반영하는 함수. `BossDataManager.commitDraft(gameId)`로 호출한다.  
출현 위치: `src/data-managers.js` (`BossDataManager.commitDraft`)  
관련 용어: [Draft](#draft), [SSOT](#ssot-single-source-of-truth)

### Future Anchor Keeper
미래에 등장 예정인 인스턴스가 없는 보스에 대해 젠 주기에 따라 미래 인스턴스를 강제 생성하는 로직.  
알림 공백(알람이 울리지 않는 상황)을 방지하기 위해 `_expandAndReconstruct()` 내에서 동작한다.  
출현 위치: `src/data-managers.js` (`_expandAndReconstruct` 내 주석 "Future Anchor Keeper")  
관련 용어: [GC](#gc-가비지-컬렉션), [젠](#젠-spawn)

### GC (가비지 컬렉션)
`alerted_0min`이 완료된 과거 스케줄을 자동 삭제하는 메커니즘. 보스별 최소 1개 항목은 항상 보존된다.  
`BossDataManager._expandAndReconstruct()` 내에서 실행된다.  
출현 위치: `src/data-managers.js`  
관련 용어: [Future Anchor Keeper](#future-anchor-keeper), [5분/1분/0분 알림](#5분1분0분-알림)

### 4-테이블 DB
`src/db.js`가 LocalStorage에 관리하는 정규화된 데이터 구조. 5개 키로 구성된다.

| LocalStorage 키 | 내용 |
|---|---|
| `v3_games` | 게임 목록 (id, name, type) |
| `v3_bosses` | 보스 목록 (id, gameId, name, interval, isInvasion) |
| `v3_schedules` | 보스 스케줄 (id, bossId, scheduledDate, alerted_*) |
| `v3_settings` | 설정값 (알람 상태, 볼륨 등) |
| `v3_uid_counter` | 자동 증가 ID 카운터 |

출현 위치: `src/db.js`  
관련 용어: [SSOT](#ssot-single-source-of-truth)

---

## 공유 도메인

### v3data
공유 URL 쿼리 파라미터 이름. `?v3data=<base64>` 형식으로 보스 스케줄을 인코딩하여 공유한다.  
출현 위치: `src/share-encoder.js`, `src/app.js` (URL 파싱)  
관련 용어: [base64 JSON URL](#base64-json-url)

### base64 JSON URL
보스 스케줄 데이터를 JSON으로 직렬화한 후 base64로 인코딩한 문자열. URL 쿼리 파라미터로 전달된다.  
포맷: `{ v: "3", gameId: string, schedules: [...] }` → JSON → base64  
출현 위치: `src/share-encoder.js` (`encodeV3Data`, `decodeV3Data`)  
관련 용어: [v3data](#v3data), [시간표 공유](#시간표-공유)

### 시간표 공유
DB에 저장된 보스 스케줄을 다른 사람과 공유하는 기능. v3data URL 또는 텍스트/이미지 내보내기로 제공된다.  
고정 알림은 공유에서 제외된다.  
출현 위치: `src/screens/share.js`, `src/share-encoder.js`  
관련 용어: [v3data](#v3data), [텍스트/이미지 내보내기](#텍스트이미지-내보내기)

### 텍스트/이미지 내보내기
시간표를 텍스트로 복사하거나 이미지 파일로 저장하는 기능.  
이미지 생성은 메인 UI와 분리된 전용 컨테이너(`export-capture-container`)에서 수행된다.  
출현 위치: `src/ui-renderer.js` (라인 1254), `src/screens/timetable.js`  
관련 용어: [시간표 공유](#시간표-공유)

---

## 개발 도메인

### 워크트리 (Worktree)
Git 워크트리를 활용한 병렬 개발 환경. 메인 브랜치와 별도 디렉터리에서 기능 개발 후 병합한다.  
출현 위치: `.omc/state/`, `CLAUDE.md`  
관련 용어: [세션 로그](#세션-로그), [핸드오프](#핸드오프)

### 세션 로그 (Session Log)
각 개발 세션의 작업 내역을 기록한 문서. AI 세션 간 컨텍스트 연속성을 유지하기 위해 사용한다.  
출현 위치: `docs/session-log/`  
관련 용어: [핸드오프](#핸드오프), [OMC](#omc)

### 핸드오프 (Handoff)
이전 세션에서 다음 세션으로 작업 상태를 인계하는 문서 또는 행위.  
출현 위치: `docs/session-log/` (세션 인수인계 문서)  
관련 용어: [세션 로그](#세션-로그)

### OMC (Oh-My-ClaudeCode)
Claude Code AI 에이전트 멀티-에이전트 오케스트레이션 레이어. Executor, Planner, Architect 등 역할별 에이전트를 조율한다.  
출현 위치: `.omc/`, `CLAUDE.md`, `~/.claude/CLAUDE.md`  
관련 용어: [메모리 시스템](#메모리-시스템)

### 메모리 시스템 (Memory System)
OMC가 세션 간 컨텍스트를 유지하기 위해 사용하는 파일 기반 저장소.  
`<remember>` 태그(7일), `<remember priority>` 태그(영구)로 기록되며, `.omc/project-memory.json`에 저장된다.  
출현 위치: `.omc/project-memory.json`, `~/.claude/projects/*/memory/`  
관련 용어: [OMC](#omc)

### 인앱 브라우저 (In-App Browser)
카카오톡 등 앱 내에서 웹페이지를 여는 내장 브라우저. 일부 Web API가 제한되어 보스 알리미의 음성 알람·PiP 등이 동작하지 않을 수 있다.  
출현 위치: `index.html` (인라인 리다이렉션 스크립트), `src/screens/help.js`  
관련 용어: [PiP](#pip-picture-in-picture)
