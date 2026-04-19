// src/screens/boss-scheduler.js
import { renderBossSchedulerScreen, updateBossListTextarea, renderGameSelect } from '../ui-renderer.js';
import { calculateBossAppearanceTime } from '../calculator.js';
import { log } from '../logger.js';
import { EventBus } from '../event-bus.js';
import { BossDataManager, LocalStorageManager } from '../data-managers.js';
import { padNumber, calculateNearestFutureTime } from '../utils.js';
import { trackEvent } from '../analytics.js';
import { getBossNamesForGame, isPresetList } from '../boss-scheduler-data.js';

let _remainingTimes = {}; // Encapsulated state for remaining times
let _memoInputs = {}; // Encapsulated state for memo inputs
let _isDirty = false; // 변경 사항 감지용 플래그

function handleShowScreen(DOM) {
    // 0. 현재 선택된 게임 ID 확인
    const currentListId = LocalStorageManager.get('lastSelectedGame') || 'default';

    // 1. 해당 List의 Draft 데이터 확보
    let draftSchedule = BossDataManager.getDraftSchedule(currentListId);
    console.log('[DEBUG] handleShowScreen - draftSchedule:', draftSchedule);

    // [SSOT 원칙 준수] Draft가 비어있다면, '가짜 데이터'를 만드는 게 아니라
    // 1. Main SSOT에 저장된 데이터가 있는지 확인하여 복원하거나
    // 2. 없다면 '빈 상태(Null)'로 정직하게 초기화해야 함.
    if ((!draftSchedule || draftSchedule.length === 0) && isPresetList(currentListId)) {
        console.log(`[DEBUG] Draft is empty for preset '${currentListId}'. Checking Main SSOT for hydration.`);

        const mainSchedule = BossDataManager.getBossSchedule(); // Main SSOT 로드
        const bossNames = getBossNamesForGame(currentListId); // 메타데이터 이름 목록

        // Main SSOT에서 현재 리스트에 속한 보스들만 필터링 (이름 매칭)
        // (주의: Main SSOT는 여러 게임의 보스가 섞여있을 수 있음)
        const existingSSOTData = mainSchedule.filter(item =>
            item.type === 'boss' && bossNames.includes(item.name)
        );

        if (existingSSOTData.length > 0) {
            console.log(`[DEBUG] Found existing data in SSOT (${existingSSOTData.length} items). Syncing to Draft.`);
            // SSOT -> Draft 복제 (Deep Copy)
            // 이때 SSOT에 없는 보스(새로 추가된 보스 등)는 아래에서 병합해주는 게 완벽하지만,
            // 일단 V2는 SSOT가 우선이므로 SSOT를 그대로 가져옴.
            draftSchedule = JSON.parse(JSON.stringify(existingSSOTData));

            // [보정] 만약 SSOT 데이터 개수가 메타데이터보다 적다면? (보스 추가된 경우)
            // 없는 보스는 빈 상태로 채워넣어야 함.
            if (draftSchedule.length < bossNames.length) {
                const existingNames = draftSchedule.map(b => b.name);
                const missingNames = bossNames.filter(n => !existingNames.includes(n));
                missingNames.forEach((n) => {
                    const metaInterval = BossDataManager.getBossInterval(n, currentListId);
                    draftSchedule.push({
                        id: `boss-${n}-${Date.now()}`,
                        type: 'boss',
                        name: n,
                        scheduledDate: null,
                        memo: '',
                        interval: metaInterval || 0
                    });
                });
            }
        } else {
            console.log(`[DEBUG] No SSOT data found. Initializing Clean Draft (Time: Null).`);
            // 데이터가 아예 없으면 -> 빈 껍데기 생성 (입력창은 나와야 하므로)
            draftSchedule = bossNames.map((name, index) => {
                const metaInterval = BossDataManager.getBossInterval(name, currentListId);
                return {
                    id: `boss-${name}-${Date.now()}-${index}`,
                    type: 'boss',
                    name: name,
                    scheduledDate: null, // [중요] 비어있어야 함
                    memo: '',
                    interval: metaInterval || 0
                };
            });
        }

        // 초기화된 Draft를 즉시 저장 (UI에서 다시 읽을 수 있게)
        BossDataManager.setDraftSchedule(currentListId, draftSchedule);
    }
    // 2. Draft -> 내부 UI 상태(_remainingTimes, _memoInputs) 동기화
    // 'Nearest Future' 로직을 적용하여 항상 올바른 양수 시간을 표시합니다.
    console.log('[DEBUG] handleShowScreen - currentListId:', currentListId);
    console.log('[DEBUG] handleShowScreen - draftSchedule:', draftSchedule);
    syncDraftToUIState(draftSchedule, currentListId);
    console.log('[DEBUG] After Sync - _remainingTimes:', _remainingTimes);

    // 4. UI 렌더링 (드롭다운, 입력 필드, 텍스트 영역)
    renderGameSelect(DOM, currentListId); // 게임 목록 드롭다운 렌더링 추가
    renderBossSchedulerScreen(DOM, _remainingTimes, _memoInputs, draftSchedule);
    updateBossListTextarea(DOM, draftSchedule, isPresetList(currentListId));

    // 5. 탭 초기화 (기본: 간편 입력 모드)
    showSchedulerTab(DOM, 'input', true); // isInitial: true

    // 진입 시에는 더티 상태 초기화
    _isDirty = false;
}

/**
 * Draft 스케줄 데이터를 기반으로 입력 필드용 로컬 상태(_remainingTimes, _memoInputs)를 구축합니다.
 * 이때 Anchor Boss Logic을 적용하여 '현재 시점과 가장 가까운 미래 젠 시간'을 계산합니다.
 */
function syncDraftToUIState(draftSchedule) {
    _remainingTimes = {};
    _memoInputs = {};
    const now = Date.now();

    // 1. 보스 아이템만 추출
    const allBosses = draftSchedule.filter(item => item.type === 'boss' && item.scheduledDate);

    // 2. 이름별로 그룹화
    const groupedByName = {};
    allBosses.forEach(boss => {
        if (!groupedByName[boss.name]) {
            groupedByName[boss.name] = [];
        }
        groupedByName[boss.name].push(boss);
    });

    Object.keys(groupedByName).forEach(name => {
        const instances = groupedByName[name];
        if (instances.length === 0) return;

        // 3. Anchor Boss Logic 적용 (미래 우선 -> 없으면 최신 과거)
        const futureInstances = instances
            .filter(b => b.scheduledDate && new Date(b.scheduledDate).getTime() > now)
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

        let anchorInstance;
        if (futureInstances.length > 0) {
            anchorInstance = futureInstances[0]; // 가장 가까운 미래
        } else {
            const pastInstances = instances
                .filter(b => b.scheduledDate && new Date(b.scheduledDate).getTime() <= now)
                .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
            anchorInstance = pastInstances[0]; // 가장 최근 과거
        }

        if (!anchorInstance) return;

        let targetDate = new Date(anchorInstance.scheduledDate);

        // 젠 주기 가져오기 (SSOT에 없으면 메타데이터 참조)
        // [수정] 현재 게임 ID를 가져와서 메타데이터 인터벌 조회
        const currentListId = LocalStorageManager.get('lastSelectedGame') || 'default';
        const metaInterval = BossDataManager.getBossInterval(name, currentListId);
        const intervalMinutes = anchorInstance.interval || metaInterval || 0;
        const intervalMs = intervalMinutes * 60 * 1000;

        // [핵심] Interval이 있다면 현재 시점에서 가장 가까운 미래(Nearest Future)로 보정
        // 과거라면 미래로 당기고, 너무 먼 미래라면 현재 근처로 당김 (Bidirectional)
        if (intervalMs > 0) {
            targetDate = calculateNearestFutureTime(targetDate, intervalMs, now);
            // [UI 동기화 보강] 계산된 미래 시간을 원본 객체(Draft)에도 반영해야 
            // renderBossInputs에서 '미래 데이터'로 인식하고 젠 예정 시각을 표시해줌.
            anchorInstance.scheduledDate = targetDate.toISOString();
        }

        const diffMs = targetDate.getTime() - now;

        // 혹시라도 계산 결과가 음수라면(젠 주기가 없거나 One-time), 그대로 표시하거나 0 처리
        // 하지만 위 로직으로 대부분 해결됨.

        let timeStr = '';

        if (diffMs < 0 && intervalMs <= 0) {
            timeStr = '';
        } else {
            // 과거 앵커만 있는 경우, 다음 젠 예측 시간을 기준으로 남은 시간 계산
            let finalTargetTime = targetDate.getTime();
            const finalDiffMs = Math.max(0, finalTargetTime - now);

            const totalSeconds = Math.floor(finalDiffMs / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const hStr = hours >= 100 ? String(hours) : padNumber(hours);

            if (anchorInstance.timeFormat === 'hms') {
                timeStr = hStr + ':' + padNumber(minutes) + ':' + padNumber(seconds);
            } else {
                timeStr = hStr + ':' + padNumber(minutes);
            }
        }

        _remainingTimes[name] = timeStr;
        _memoInputs[name] = anchorInstance.memo || '';
    });
}



// v3: 텍스트 모드가 제거되어 탭 전환 로직은 no-op. 호출부 호환을 위해 시그니처만 유지. (issue-033)
function showSchedulerTab() {
    return;
}

/**
 * 간편 입력 모드의 값을 특정 List ID의 Draft에 저장하거나, 현재 선택된 모드에 맞게 처리함.
 * listId 파라미터가 있으면 해당 ID로 저장, 없으면 현재 선택된 게임 ID 사용.
 */
function syncInputToText(DOM, targetListId = null) {
    const listId = targetListId || LocalStorageManager.get('lastSelectedGame') || 'default';

    // v3: 텍스트 모드 제거됨(issue-033). 간편 입력 모드에서 수집한 값만 Draft에 저장한다.
    {
        const newBossItems = [];
        // 1. 간편 입력 모드 DOM에서 유효한 보스 정보 수집
        DOM.bossInputsContainer.querySelectorAll('.boss-input-item').forEach(item => {
            const nameEl = item.querySelector('.boss-name');
            const timeEl = item.querySelector('.calculated-spawn-time');
            const memoEl = item.querySelector('.memo-input');

            if (nameEl && timeEl && timeEl.textContent !== '--:--:--') {
                const bossName = nameEl.textContent;
                const timeText = timeEl.textContent;
                const memoValue = memoEl ? memoEl.value.trim() : '';
                const inputEl = item.querySelector('.remaining-time-input');
                const calculatedDateStr = inputEl ? inputEl.dataset.calculatedDate : null;
                const timeFormat = inputEl ? (inputEl.dataset.timeFormat || 'hm') : 'hm';

                if (calculatedDateStr) {
                    const scheduledDate = new Date(calculatedDateStr);
                    const bossId = inputEl && inputEl.dataset.id ? inputEl.dataset.id : `boss-${bossName}-${scheduledDate.getTime()}`;

                    const hhEl = item.querySelector('.interval-hh');
                    const mmEl = item.querySelector('.interval-mm');
                    let interval = 0;
                    if (hhEl && mmEl) {
                        const hh = parseInt(hhEl.value, 10) || 0;
                        const mm = parseInt(mmEl.value, 10) || 0;
                        interval = (hh * 60) + mm;
                    }

                    newBossItems.push({
                        id: bossId,
                        type: 'boss',
                        name: bossName,
                        time: timeText,
                        timeFormat: timeFormat,
                        memo: memoValue,
                        interval: interval,
                        scheduledDate: scheduledDate
                    });
                }
            }
        });

        // 2. Draft 저장 (빈 배열이라도 저장해야 함 - 삭제된 경우)
        BossDataManager.setDraftSchedule(listId, newBossItems);

        // 3. 텍스트 영역 업데이트 (현재 화면인 경우)
        if (!targetListId) {
            updateBossListTextarea(DOM, newBossItems, isPresetList(listId));
        }
        return true;
    }
}

// syncTextToInput 및 관련 텍스트 모드 로직은 v3에서 제거됨(issue-033).

export function handleApplyBossSettings(DOM) {
    const currentListId = LocalStorageManager.get('lastSelectedGame') || 'default';

    // 간편 입력 모드 데이터를 Draft에 반영하고 최종 유효성 검사 수행
    syncInputToText(DOM, currentListId);

    const draftScheduleForValidation = BossDataManager.getDraftSchedule(currentListId);
    const validation = BossDataManager.validateBossSchedule(draftScheduleForValidation);
    if (!validation.isValid) {
        const forceApply = confirm("보스 시간 설정 경고\n" + "------------------------\n" + validation.message + "\n\n이대로 강제 저장하시겠습니까?");
        if (!forceApply) return; // 사용자가 취소하면 중단
    }

    // 최종 검증 (Draft 기반)
    const draftSchedule = BossDataManager.getDraftSchedule(currentListId);
    const hasBosses = draftSchedule.some(item => item.type === 'boss');

    if (!hasBosses) {
        alert("보스 설정에 내용이 전혀 없습니다.\n남은 시간을 1개 이상 입력 후 보스 시간 업데이트 버튼을 눌러 주세요.");
        return;
    }

    // Commit Draft to Main (List ID 전달)
    BossDataManager.commitDraft(currentListId);

    // 저장 성공 시 더티 상태 초기화
    _isDirty = false;

    // UI 업데이트 (Main 기반으로 다시 로드 - 24시간 확장된 결과가 반영됨)
    updateBossListTextarea(DOM, draftSchedule); // 여기서는 Main SSOT를 보여주는 게 맞음? 
    // -> 아니오, 업데이트 후에도 여전히 '현재 탭'의 Draft(이자 Main)를 보여주면 됨.
    // BossDataManager.commitDraft 내부에서 setBossSchedule을 하므로 SSOT는 갱신됨.
    // UI는 어차피 navigate로 timetable 화면으로 넘어감.

    // 입력 필드 초기화 및 화면 전환
    _remainingTimes = {};
    _memoInputs = {};
    renderBossSchedulerScreen(DOM, _remainingTimes, _memoInputs); // 초기화된 상태로 렌더링

    EventBus.emit('navigate', 'timetable-screen');
    log("보스 시간이 업데이트되었습니다.", true);
    trackEvent('Click Button', {
        event_category: 'Interaction',
        event_label: '보스 시간 업데이트'
    });
}


export function initBossSchedulerScreen(DOM) {
    if (!DOM.bossSchedulerScreen) return;

    // 네비게이션 연동
    EventBus.on('show-boss-scheduler-screen', () => handleShowScreen(DOM));

    // 간편 입력 모드 변경 감지 (Delegation). 텍스트 모드는 issue-033 으로 제거됨.
    DOM.bossSchedulerScreen.addEventListener('input', (event) => {
        const target = event.target;

        if (target.classList.contains('remaining-time-input')) {
            const inputField = target;
            const bossName = inputField.dataset.bossName;
            _remainingTimes[bossName] = inputField.value;

            const remainingTime = inputField.value.trim();
            const calculatedTimeSpan = inputField.parentElement.querySelector('.calculated-spawn-time');
            const calculatedDate = calculateBossAppearanceTime(remainingTime);

            if (remainingTime) {
                const isNumeric = /^\d+$/.test(remainingTime);
                const isHms = (isNumeric && remainingTime.length === 6) || (!isNumeric && remainingTime.split(':').length === 3);
                inputField.dataset.timeFormat = isHms ? 'hms' : 'hm';
            }

            if (calculatedDate && calculatedTimeSpan) {
                const timeFormat = inputField.dataset.timeFormat;
                let timeString = padNumber(calculatedDate.getHours()) + ':' + padNumber(calculatedDate.getMinutes());
                if (timeFormat === 'hms') timeString += ':' + padNumber(calculatedDate.getSeconds());

                calculatedTimeSpan.textContent = timeString;
                inputField.dataset.calculatedDate = calculatedDate.toISOString();
            } else {
                if (calculatedTimeSpan) calculatedTimeSpan.textContent = '--:--:--';
                delete inputField.dataset.calculatedDate;
            }

            // UI 업데이트 후 Draft 동기화
            syncInputToText(DOM);
            _isDirty = true; // 변경 감지
        } else if (target.classList.contains('memo-input')) {
            const bossName = target.dataset.bossName;
            _memoInputs[bossName] = target.value;

            // 메모 변경 후 Draft 동기화
            syncInputToText(DOM);
            _isDirty = true; // 변경 감지
        } else if (target.classList.contains('interval-hh') || target.classList.contains('interval-mm')) {
            // 젠 시간(interval) 입력 로직 (Bohe 님 방식)
            const bossName = target.dataset.bossName;
            const container = target.closest('.boss-input-item');
            const hhInput = container.querySelector('.interval-hh');
            const mmInput = container.querySelector('.interval-mm');

            // 값 추출 및 보정
            let hh = parseInt(hhInput.value, 10) || 0;
            let mm = parseInt(mmInput.value, 10) || 0;

            // mm이 60을 넘으면 hh로 올림 (지능형 보조)
            if (mm >= 60) {
                hh += Math.floor(mm / 60);
                mm = mm % 60;
                hhInput.value = hh;
                mmInput.value = padNumber(mm);
            }

            // 동일한 보스 이름을 가진 모든 입력 필드 동기화 (Bohe 님 원칙)
            // 동일한 보스 이름을 가진 모든 입력 필드 동기화 (Bohe 님 원칙)
            DOM.bossInputsContainer.querySelectorAll('.interval-hh[data-boss-name="' + bossName + '"]').forEach(el => {
                if (el !== hhInput) el.value = hh;
            });
            DOM.bossInputsContainer.querySelectorAll('.interval-mm[data-boss-name="' + bossName + '"]').forEach(el => {
                if (el !== mmInput) el.value = padNumber(mm);
            });

            // 내부 Draft 동기화 및 텍스트 영역 반영
            syncInputToText(DOM);
            _isDirty = true; // 변경 감지
        }
    });

    // 젠 주기 입력 필드 포커스 아웃 시 보정 (유효성 검사는 버튼 클릭 시로 이동)
    DOM.bossSchedulerScreen.addEventListener('focusout', (event) => {
        const target = event.target;
        if (target.classList.contains('interval-mm')) {
            const val = parseInt(target.value, 10) || 0;
            target.value = padNumber(val);
        }
    });

    EventBus.on('rerender-boss-scheduler', () => {
        handleShowScreen(DOM);
    });

    DOM.bossSchedulerScreen.addEventListener('change', (event) => {
        if (event.target === DOM.gameSelect) {
            // 더티 체크 (게임/목록 변경 시)
            if (_isDirty) {
                if (!confirm('수정된 내용이 있습니다. 저장하지 않고 다른 목록을 선택하시겠습니까?')) {
                    // 이전 값으로 복구
                    DOM.gameSelect.value = LocalStorageManager.get('lastSelectedGame') || 'default';
                    return;
                }
            }

            const selectedGame = DOM.gameSelect.value;
            LocalStorageManager.set('lastSelectedGame', selectedGame); // 선택 정보 저장
            handleShowScreen(DOM); // 데이터 로드부터 렌더링까지 전체 재실행
        }
    });

    // Enter 키로 다음 보람 입력창 점프 (v2.17 복구)
    DOM.bossSchedulerScreen.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target.classList.contains('remaining-time-input')) {
            event.preventDefault();

            const currentItem = event.target.closest('.boss-input-item');
            const allItems = Array.from(DOM.bossInputsContainer.querySelectorAll('.boss-input-item'));
            const currentIndex = allItems.indexOf(currentItem);

            if (currentIndex < allItems.length - 1) {
                // 다음 보스의 남은 시간 입력창으로 포커스 이동
                const nextInput = allItems[currentIndex + 1].querySelector('.remaining-time-input');
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select(); // 기존 값 선택 (바로 수정 가능하도록)
                }
            } else {
                // 마지막 보스인 경우 업데이트 버튼으로 포커스 이동하여 입력을 마무리
                if (DOM.moveToBossSettingsButton) {
                    DOM.moveToBossSettingsButton.focus();
                }
            }
        }
    });

    DOM.bossSchedulerScreen.addEventListener('click', (event) => {
        if (event.target === DOM.clearAllRemainingTimesButton) {
            if (confirm("모든 남은 시간과 메모를 삭제하시겠습니까?")) {
                DOM.bossInputsContainer.querySelectorAll('.remaining-time-input').forEach(input => {
                    input.value = '';
                    delete input.dataset.calculatedDate;
                    const span = input.parentElement.querySelector('.calculated-spawn-time');
                    if (span) span.textContent = '--:--:--';
                });
                DOM.bossInputsContainer.querySelectorAll('.memo-input').forEach(input => {
                    input.value = '';
                });

                // Draft 업데이트 (빈 값으로)
                syncInputToText(DOM);

                _remainingTimes = {}; // Clear local state
                _memoInputs = {}; // Clear local state
                _isDirty = true; // 변경 감지

                log("모든 남은 시간과 메모가 삭제되었습니다.", true);
                trackEvent('Click Button', { event_category: 'Interaction', event_label: '남은 시간 초기화' });
            }
        } else if (event.target === DOM.moveToBossSettingsButton) {
            handleApplyBossSettings(DOM);
        }
    });

    // 화면 표시 핸들러
    DOM.bossSchedulerScreen.addEventListener('show-screen', () => handleShowScreen(DOM));
}

// updateCalculatedTimes 함수 완전 삭제 (SSOT 오염의 원인)


export function isSchedulerDirty() {
    return _isDirty;
}

export function getScreen() {
    return {
        id: 'boss-scheduler-screen',
        init: initBossSchedulerScreen
    };
}
