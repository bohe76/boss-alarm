# 시퀀스 다이어그램 — 보스 알리미 v3.0 핵심 흐름

각 다이어그램은 코드의 실제 함수명과 파일명을 기준으로 작성되었습니다.

---

## 1. 앱 초기 로드

`index.html`이 브라우저에 로드된 시점부터 대시보드가 사용자에게 노출되기까지의 흐름입니다. 카카오톡 인앱 브라우저 감지, 프리셋 병렬 로드, URL 파라미터 분기, 48시간 자동 확장이 순서대로 진행됩니다.

`app.js`의 `initApp()`이 최상위 오케스트레이터 역할을 수행하며, `loadPresets()`의 비동기 완료를 기다린 뒤 `loadInitialData()`로 데이터 우선순위를 결정합니다.

```mermaid
sequenceDiagram
    participant Browser
    participant index.html
    participant app.js
    participant services.js
    participant preset-loader.js
    participant DB as db.js (DB)
    participant BDM as data-managers.js (BossDataManager)

    Browser->>index.html: 페이지 로드
    index.html->>index.html: 카카오톡 인앱 브라우저 감지 (userAgent)
    alt Android 인앱 브라우저
        index.html-->>Browser: intent:// 리디렉션 (종료)
    else iOS 인앱 브라우저
        index.html->>index.html: 전체화면 안내 오버레이 삽입
    end

    index.html->>app.js: initApp() 호출
    app.js->>app.js: initDomElements()
    app.js->>services.js: await initializeCoreServices(DOM)
    services.js->>preset-loader.js: await loadPresets()
    preset-loader.js->>preset-loader.js: Promise.all 병렬 fetch 3개 JSON
    preset-loader.js->>DB: syncPresetsToDb(rawPresets)
    Note over DB: upsertGame / upsertBoss / deleteBoss cascade
    preset-loader.js-->>services.js: rawPresets, initialDefaultData, updateNoticeData
    services.js->>BDM: init()
    BDM->>BDM: _expandAndReconstruct(activeGame)
    services.js-->>app.js: 완료

    app.js->>app.js: registerAllRoutes()
    app.js->>app.js: loadInitialData(DOM)

    alt v3data 파라미터 존재
        app.js->>app.js: decodeV3Data(params.get v3data)
        app.js->>DB: replaceSchedulesByGameId(gameId, newSchedules)
    else 로컬 데이터 존재
        app.js->>BDM: getBossSchedule()
        app.js->>app.js: validateScheduleIntegrity()
        alt 정합성 불일치
            app.js->>app.js: performSilentMigration()
        end
    else 최초 방문
        app.js->>BDM: setBossSchedule(processBossItems)
    end

    app.js->>app.js: performReverseMigration()
    app.js->>app.js: initEventHandlers(DOM)
    app.js->>app.js: showScreen(DOM, dashboard-screen)
    app.js->>Browser: body.classList.remove loading
    Note over Browser: 스켈레톤 해제, 대시보드 노출
```

---

## 2. 알람 라이프사이클

사용자가 알람을 시작한 시점부터 보스 알림이 발생하고 GC가 수행되기까지의 흐름입니다.

메인 스레드와 Web Worker(`timer-worker.js`)가 분리되어 있으며, ALARM 이벤트는 워커에서 발생하여 메인 스레드의 `handleAlarm()`이 처리합니다. 알림 완료 후 `syncScheduleToWorker()`로 워커의 스케줄이 갱신됩니다.

```mermaid
sequenceDiagram
    participant User
    participant app.js
    participant alarm-scheduler.js
    participant Worker as timer-worker.js
    participant DB as db.js (DB)
    participant BDM as data-managers.js (BossDataManager)

    User->>app.js: 알람 시작 버튼 클릭
    app.js->>alarm-scheduler.js: startAlarm(DOM)
    alarm-scheduler.js->>alarm-scheduler.js: LocalStorageManager.setAlarmRunningState(true)
    alarm-scheduler.js->>alarm-scheduler.js: syncScheduleToWorker()
    Note over alarm-scheduler.js: getAllUpcomingBosses()로 flatSchedule 생성
    alarm-scheduler.js->>Worker: UPDATE_SCHEDULE payload flatSchedule
    alarm-scheduler.js->>Worker: START

    loop 매초 tick
        Worker->>alarm-scheduler.js: TICK
        alarm-scheduler.js->>alarm-scheduler.js: updateAppState()
        alarm-scheduler.js->>BDM: checkAndUpdateSchedule(false, isSchedulerActive)
        alarm-scheduler.js->>BDM: getBossStatusSummary()
        alarm-scheduler.js->>BDM: setNextBossInfo(nextBoss, minTimeDiff)
        Note over BDM: notifyUI() 발생 - 대시보드 갱신
    end

    Note over Worker: targetTime - 5분 도달
    Worker->>alarm-scheduler.js: ALARM type 5min
    alarm-scheduler.js->>alarm-scheduler.js: handleAlarm()
    alarm-scheduler.js->>DB: updateSchedule(id, alerted_5min targetTime)
    alarm-scheduler.js->>DB: notifyStructural()
    alarm-scheduler.js->>alarm-scheduler.js: speak 5분 전 보스명
    alarm-scheduler.js->>alarm-scheduler.js: new Notification
    alarm-scheduler.js->>alarm-scheduler.js: syncScheduleToWorker()

    Note over Worker: 1분 전 동일 패턴

    Note over Worker: targetTime 도달 0min
    Worker->>alarm-scheduler.js: ALARM type 0min
    alarm-scheduler.js->>DB: updateSchedule(id, alerted_0min targetTime)
    BDM->>BDM: _expandAndReconstruct(gameId)
    Note over BDM: alerted_0min 완료 과거 레코드 GC, 보스당 최소 1개 보존
```

---

## 3. 보스 시간 입력 → 저장

보스 스케줄러 화면에서 사용자가 시간을 입력하고 저장하는 흐름입니다.

`boss-scheduler.js`가 폼 입력을 처리하고 `BossDataManager.commitDraft()`를 통해 DB에 원자적으로 커밋합니다. 커밋 후 `notifyStructural()`이 구독자들에게 전파되어 UI가 갱신됩니다.

```mermaid
sequenceDiagram
    participant User
    participant boss-scheduler.js
    participant BDM as data-managers.js (BossDataManager)
    participant DB as db.js (DB)
    participant alarm-scheduler.js

    User->>boss-scheduler.js: 보스 시간 입력 폼
    boss-scheduler.js->>BDM: setDraftSchedule(gameId, draftItems)
    Note over BDM: v3_draft_gameId 로컬스토리지 저장

    User->>boss-scheduler.js: 보스 시간 업데이트 버튼 클릭
    boss-scheduler.js->>boss-scheduler.js: 유효성 검사
    boss-scheduler.js->>BDM: commitDraft(gameId)

    BDM->>DB: getBossesByGameId(gameId)
    loop 각 보스 항목
        alt 기존 보스 없음
            BDM->>DB: upsertBoss(gameId, name, interval, isInvasion)
        end
    end
    BDM->>DB: replaceSchedulesByGameId(gameId, newSchedules)
    Note over DB: 기존 스케줄 전체 원자적 교체
    BDM->>BDM: _expandAndReconstruct(gameId)
    Note over BDM: 48시간 윈도우 확장, GC 수행
    BDM->>DB: setSetting lastSelectedGame gameId
    BDM->>BDM: notifyStructural()

    BDM-->>boss-scheduler.js: 구독 콜백 화면 갱신
    BDM-->>alarm-scheduler.js: 구독 콜백
    alarm-scheduler.js->>alarm-scheduler.js: syncScheduleToWorker()
```

---

## 4. 공유 URL 생성 및 수신

공유 화면에서 URL을 생성하는 흐름과, 공유 URL을 통해 다른 사용자가 접속했을 때 데이터가 복원되는 흐름입니다.

인코딩은 `share-encoder.js`의 순수 함수 `encodeV3Data()`가 담당하며, TinyURL API 호출은 `api-service.js`에서 수행합니다. 수신 측은 `app.js`의 `loadInitialData()`에서 URL 파라미터를 감지하여 `DB.replaceSchedulesByGameId()`로 적용합니다.

```mermaid
sequenceDiagram
    participant User
    participant sharej as screens/share.js
    participant DB as db.js (DB)
    participant share-encoder.js
    participant api-service.js
    participant Clipboard
    participant app.js
    participant BDM as data-managers.js (BossDataManager)

    Note over User: 공유 URL 생성
    User->>sharej: 공유 화면 진입 onTransition
    sharej->>DB: getSetting lastSelectedGame
    sharej->>DB: getSchedulesByGameId(gameId)
    sharej->>DB: getBossesByGameId(gameId)
    sharej->>sharej: bossName, scheduledDate, memo 변환
    sharej->>share-encoder.js: encodeV3Data(gameId, schedules)
    Note over share-encoder.js: JSON to UTF-8 to btoa binary
    share-encoder.js-->>sharej: base64 문자열
    sharej->>api-service.js: await getShortUrl(longUrl)
    api-service.js-->>sharej: shortUrl 또는 null
    sharej->>Clipboard: navigator.clipboard.writeText

    Note over User: 공유 URL 수신 다른 사용자
    User->>app.js: v3data 파라미터로 접속
    app.js->>share-encoder.js: decodeV3Data(encoded)
    Note over share-encoder.js: atob to UTF-8 to JSON, v===3 검증
    share-encoder.js-->>app.js: gameId, schedules
    app.js->>DB: getBossesByGameId(payload.gameId)
    app.js->>DB: replaceSchedulesByGameId(payload.gameId, newSchedules)
    app.js->>BDM: clearDraft(payload.gameId)
    app.js->>DB: setSetting lastSelectedGame payload.gameId
```

---

## 5. 고정 알림 발생 → 시간표 표시

고정 알림(`fixedAlarms`)이 알람 시스템에 통합되는 흐름과, 시간표 화면에서 고정 알림이 4가지 렌더 경로 모두에 병합되어 표시되는 흐름입니다.

`_expandFixedAlarmsInRange()`가 고정 알림을 `{ type:boss, isFixed:true }` shape으로 변환하여 보스 스케줄과 동일하게 처리합니다.

```mermaid
sequenceDiagram
    participant LSM as LocalStorageManager
    participant BDM as BossDataManager
    participant alarm-scheduler.js
    participant Worker as timer-worker.js
    participant ui-renderer.js

    Note over alarm-scheduler.js: syncScheduleToWorker() 호출
    alarm-scheduler.js->>BDM: getAllUpcomingBosses(now)
    BDM->>LSM: getFixedAlarms()
    LSM-->>BDM: fixedAlarms 배열
    loop 각 활성 고정 알림
        BDM->>BDM: calculateNextOccurrence(alarm, nowAsDate)
        Note over BDM: days 배열 기반 다음 발생 시각 계산
    end
    BDM-->>alarm-scheduler.js: manualBosses + fixedBosses 합산 정렬
    alarm-scheduler.js->>alarm-scheduler.js: addAlarmsToFlatSchedule 5min 1min 0min
    alarm-scheduler.js->>Worker: UPDATE_SCHEDULE flatSchedule

    Note over Worker: 고정 알림 targetTime 도달
    Worker->>alarm-scheduler.js: ALARM isFixed true
    alarm-scheduler.js->>LSM: getFixedAlarms().find(id)
    alarm-scheduler.js->>LSM: updateFixedAlarm(id, alerted_type targetTime)
    alarm-scheduler.js->>alarm-scheduler.js: syncScheduleToWorker()

    Note over ui-renderer.js: 시간표 4경로 카드 표 텍스트 이미지
    ui-renderer.js->>ui-renderer.js: _expandFixedAlarmsInRange(rangeStart, rangeEnd)
    ui-renderer.js->>LSM: getFixedAlarms()
    loop 각 활성 고정 알림
        ui-renderer.js->>ui-renderer.js: days 필터링 시간 인스턴스 생성
        Note over ui-renderer.js: type boss isFixed true shape
    end
    Note over ui-renderer.js: 보스 스케줄과 병합하여 동일 shape 렌더
```

---

## 6. PiP 위젯 동기화

Document Picture-in-Picture 창을 열고 보스 정보를 주기적으로 갱신하는 흐름입니다.

`pip-manager.js`의 `updatePipContent()`는 `BossDataManager`의 `ui` 구독을 통해 호출됩니다. 사용자가 PiP 창을 클릭하면 목록 확장/축소가 토글되며, `adjustWindowHeight()`가 DOM 실측 기반으로 창 크기를 조절합니다.

```mermaid
sequenceDiagram
    participant User
    participant app.js
    participant pip-manager.js
    participant BDM as data-managers.js (BossDataManager)
    participant PipWindow as DocumentPiP 창

    User->>app.js: PiP 버튼 클릭
    app.js->>pip-manager.js: togglePipWindow()
    pip-manager.js->>pip-manager.js: documentPictureInPicture.requestWindow width:240 height:96
    pip-manager.js->>pip-manager.js: fetch src/pip-content.html
    pip-manager.js->>PipWindow: body 콘텐츠 설정
    pip-manager.js->>pip-manager.js: updatePipContent()
    pip-manager.js->>BDM: getUpcomingBosses(11)
    BDM-->>pip-manager.js: upcoming 배열
    pip-manager.js->>PipWindow: nameElement remainingTimeElement 갱신
    pip-manager.js->>PipWindow: listElement 확장 시 목록 렌더

    loop BossDataManager notifyUI 이벤트마다
        BDM->>pip-manager.js: updatePipContent() 구독 콜백
        pip-manager.js->>BDM: getUpcomingBosses(11)
        pip-manager.js->>PipWindow: 콘텐츠 갱신
    end

    User->>PipWindow: PiP 창 클릭
    PipWindow->>pip-manager.js: onclick 이벤트
    pip-manager.js->>pip-manager.js: isExpanded = !isExpanded
    pip-manager.js->>pip-manager.js: updatePipContent()
    pip-manager.js->>pip-manager.js: adjustWindowHeight()
    Note over pip-manager.js: container.offsetHeight 실측 후 resizeTo 240 targetH+chromeH

    User->>PipWindow: PiP 창 닫기
    PipWindow->>pip-manager.js: pagehide 이벤트
    pip-manager.js->>pip-manager.js: pipWindow=null isPipOpen=false isExpanded=false
```
